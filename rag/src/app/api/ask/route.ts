import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge, SearchResult } from "@/lib/ragEngine";

interface GroqChatCompletionResponse {
  id?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
      reasoning?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    queue_time?: number;
    prompt_time?: number;
    completion_time?: number;
    total_time?: number;
  };
}

interface GroqSuccessResult {
  success: true;
  answer: string;
  usage?: GroqChatCompletionResponse["usage"];
}

interface GroqErrorResult {
  success: false;
  status?: number;
  error: string;
}

type GroqResult = GroqSuccessResult | GroqErrorResult;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed or empty JSON request body." },
        { status: 400 }
      );
    }
    const { question, mode = "synthesis" } = body;

    if (!question || typeof question !== "string" || question.trim() === "") {
      return NextResponse.json(
        { error: "Question parameter is required." },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // 1. Air-Gapped Inverted Index Retrieval (Top 4 most relevant items)
    const retrieved: SearchResult[] = searchKnowledge(trimmedQuestion, { limit: 4 });

    // Mode 1: Instant Air-Gap Retrieval only
    if (mode === "instant") {
      const topMatch = retrieved[0];
      return NextResponse.json({
        mode: "instant",
        answer: topMatch
          ? `${topMatch.item.tldr}\n\n${topMatch.item.body}`
          : "No direct forensic matches found in offline knowledge index. Please refine your search query.",
        retrieved,
        latencyMs: Date.now() - startTime,
        model: "airgap-inverted-index",
        tier: "offline",
      });
    }

    // Prepare Context from Retrieved Knowledge Items
    const contextText = retrieved
      .map(
        (res, idx) => `
[DOCUMENT ${idx + 1}]
ID: ${res.item.id}
Category: ${res.item.category}
Topic: ${res.item.title}
Question: ${res.item.question}
TL;DR: ${res.item.tldr}
Forensic Details: ${res.item.body}
File Citations: ${res.item.fileCitations.join(", ")}
Key Metrics: ${JSON.stringify(res.item.keyMetrics || {})}
Documentation: ${res.item.chapterTitle} (${res.item.chapterUrl})
`
      )
      .join("\n---\n");

    const systemPrompt = `You are the sovereign Senior Forensic Intelligence Engineer for the NTRO (National Technical Research Organisation) Bitcoin Transaction Surveillance System (SIH26146).

Your role is to solve technical, architectural, and mathematical doubts for intelligence analysts and engineering teammates.
You must adhere strictly to the following rules:
1. STRICT FACTUAL ACCURACY: Base your answer EXCLUSIVELY on the provided forensic documents below, derived from WORK-1.md, WORK-2.md, WORK-3.md, and system runbooks. NEVER hallucinate ungrounded numbers, libraries, or architectures.
2. CITATIONS: Cite exact file paths (e.g. backend/app/routers/ingest.py, backend/app/services/xai_store.py), mathematical formulas, and verified benchmarks.
3. CONCISENESS & CLARITY: Start with a clear 2-sentence executive takeaway. Then provide precise forensic engineering detail, code/formula snippets if relevant, and statutory context (e.g. Section 65B Indian Evidence Act / BSA 2023).
4. TONE: Authoritative, senior-to-senior, crisp, and analytical. No fluff or generic conversational filler.`;

    const userPrompt = `Retrieved System Knowledge Documents:
${contextText}

Teammate Forensic Doubt:
"${trimmedQuestion}"

Provide a comprehensive, authoritative forensic answer directly resolving this doubt with exact metrics and citations.`;

    // Multi-Tier Groq Configuration
    const primaryKey = (process.env.GROQ_API_KEY_PRIMARY || process.env.GROQ_API_KEY || "").trim() || undefined;
    const primaryModel = (process.env.GROQ_MODEL_PRIMARY || process.env.GROQ_MODEL || "openai/gpt-oss-120b").trim();
    const fallbackKey = (process.env.GROQ_API_KEY_FALLBACK || process.env.GROQ_API_KEY || "").trim() || undefined;
    const fallbackModel = (process.env.GROQ_MODEL_FALLBACK || "openai/gpt-oss-20b").trim();

    // Helper to call Groq API with 15s timeout
    const callGroq = async (apiKey: string, model: string): Promise<GroqResult> => {
      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              max_tokens: 1024,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          return {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}: ${errorText}`,
          };
        }

        const data = (await response.json()) as GroqChatCompletionResponse;
        const choiceMessage = data.choices?.[0]?.message;
        const rawContent = choiceMessage?.content?.trim();
        const rawReasoning = choiceMessage?.reasoning?.trim();
        const answer = rawContent || rawReasoning;

        if (!answer) {
          return {
            success: false,
            status: response.status,
            error: "Empty content returned in Groq completion.",
          };
        }

        return {
          success: true,
          answer,
          usage: data.usage,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          error: errorMsg,
        };
      }
    };

    // Step 1: Tier 1 (Primary Model & Key)
    if (primaryKey) {
      const primaryResult = await callGroq(primaryKey, primaryModel);
      if (primaryResult.success) {
        return NextResponse.json({
          mode: "synthesis",
          answer: primaryResult.answer,
          retrieved,
          latencyMs: Date.now() - startTime,
          model: primaryModel,
          tier: "primary",
          usage: primaryResult.usage,
        });
      }

      console.warn(
        `[Groq Primary Failed] -> Attempting Fallback... (Status: ${primaryResult.status ?? "ERR"}, Reason: ${primaryResult.error.slice(0, 200)})`
      );
    } else {
      console.warn("[Groq Primary Failed] -> Attempting Fallback... (Primary key not configured)");
    }

    // Step 2: Tier 2 (Fallback Model & Key)
    if (fallbackKey) {
      const fallbackResult = await callGroq(fallbackKey, fallbackModel);
      if (fallbackResult.success) {
        return NextResponse.json({
          mode: "synthesis_fallback",
          answer: fallbackResult.answer,
          retrieved,
          latencyMs: Date.now() - startTime,
          model: fallbackModel,
          tier: "fallback",
          usage: fallbackResult.usage,
        });
      }

      console.error(
        `[Groq Fallback Failed] -> Resorting to local air-gap offline fallback. (Status: ${fallbackResult.status ?? "ERR"}, Reason: ${fallbackResult.error.slice(0, 200)})`
      );
    } else {
      console.warn("[Groq Fallback Unset] -> No fallback API key configured.");
    }

    // Step 3: Tier 3 (Air-Gap Local Inverted-Index Search Fallback)
    const topMatch = retrieved[0];
    const offlinePrefix = !primaryKey && !fallbackKey
      ? "[OFFLINE AIR-GAP FALLBACK - NO GROQ API KEY DETECTED]"
      : "[OFFLINE AIR-GAP FALLBACK - ALL EXTERNAL AI TIERS EXHAUSTED]";

    const offlineAnswer = topMatch
      ? `${offlinePrefix}\n\n${topMatch.item.tldr}\n\n${topMatch.item.body}`
      : "No matching forensic knowledge entries found in local air-gap index.";

    return NextResponse.json({
      mode: "instant_fallback",
      answer: offlineAnswer,
      retrieved,
      latencyMs: Date.now() - startTime,
      model: "airgap-offline-fallback",
      tier: "offline",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
    ) {
      throw error;
    }

    console.error("[API /api/ask Error]:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing doubt query.",
      },
      { status: 500 }
    );
  }
}
