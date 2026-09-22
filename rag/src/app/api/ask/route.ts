import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge, SearchResult, KnowledgeItem } from "@/lib/ragEngine";

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

/**
 * Infallible post-processing response sanitizer function.
 * Ensures zero .md files or markdown document filenames appear in the output.
 * Replaces known document filenames with clear architectural/operational terminology
 * and completely scrubs any lingering .md filenames or references.
 */
export function sanitizeResponseText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let sanitized = text;

  // 1. Grouped/compound references like "WORK-1, WORK-2, WORK-3" or "WORK-1.md, WORK-2.md, WORK-3.md"
  sanitized = sanitized.replace(
    /\bWORK-[0-9]+(?:\.md)?(?:[\s,]+(?:and\s+|or\s+)?WORK-[0-9]+(?:\.md)?)+/gi,
    "verified system architecture specifications"
  );

  // 2. Specific known documentation files to clean operational/architecture terms
  sanitized = sanitized.replace(/\bWORK-[0-9]+\.md\b/gi, "system architecture specifications");
  sanitized = sanitized.replace(/\bWORK-[0-9]+\b/gi, "system architecture specifications");
  sanitized = sanitized.replace(/\bdev-server\.md\b/gi, "system runbook");
  sanitized = sanitized.replace(/\bflow\.md\b/gi, "system dataflow specifications");
  sanitized = sanitized.replace(/\bREADME\.md\b/gi, "system overview documentation");
  sanitized = sanitized.replace(/\bDEPLOYMENT\.md\b/gi, "deployment runbook");

  // 3. Markdown links containing .md files: [Label](path/file.md) -> Label
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^)]*\.md[^)]*\)/gi, "$1");

  // 4. Any file ending in .md e.g. `architecture.md` -> `architecture specifications`
  sanitized = sanitized.replace(/\b([a-zA-Z0-9_\-]+)\.md\b/gi, "$1 specifications");

  // 5. Infallible fallback: scrub any remaining literal '.md' extension or token
  sanitized = sanitized.replace(/\.md\b/gi, "");

  // 6. Clean up phrasing duplicates resulting from substitutions
  sanitized = sanitized.replace(
    /(?:system architecture specifications)(?:\s*,\s*system architecture specifications)+/gi,
    "system architecture specifications"
  );
  sanitized = sanitized.replace(/\s{2,}/g, " ");

  return sanitized.trim();
}

/**
 * Filter and sanitize KnowledgeItem to purge any .md file citations or text
 */
function sanitizeKnowledgeItem(item: KnowledgeItem): KnowledgeItem {
  const filteredCitations = (item.fileCitations || [])
    .filter((src) => typeof src === "string" && !src.toLowerCase().endsWith(".md") && !/\.md\b/i.test(src))
    .map(sanitizeResponseText)
    .filter(Boolean);

  return {
    ...item,
    title: sanitizeResponseText(item.title),
    tldr: sanitizeResponseText(item.tldr),
    body: sanitizeResponseText(item.body),
    fileCitations: filteredCitations,
  };
}

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
    const rawRetrieved: SearchResult[] = searchKnowledge(trimmedQuestion, { limit: 4 });

    // Clean and sanitize all retrieved items: purge any .md file citations and body references
    const retrieved: SearchResult[] = rawRetrieved.map((res) => ({
      ...res,
      item: sanitizeKnowledgeItem(res.item),
      snippet: sanitizeResponseText(res.snippet),
    }));

    // Mode 1: Instant Air-Gap Retrieval only
    if (mode === "instant") {
      const topMatch = retrieved[0];
      return NextResponse.json({
        mode: "instant",
        answer: topMatch
          ? sanitizeResponseText(`${topMatch.item.tldr}\n\n${topMatch.item.body}`)
          : "No direct forensic matches found in offline knowledge index. Please refine your search query.",
        retrieved,
        latencyMs: Date.now() - startTime,
        model: "airgap-inverted-index",
        tier: "offline",
      });
    }

    // Prepare Context from Retrieved Knowledge Items (STRICTLY NO .md FILES)
    const effectiveRetrieved = retrieved.length > 0 
      ? retrieved 
      : searchKnowledge("proposed solution", { limit: 4 }).map((res) => ({
          ...res,
          item: sanitizeKnowledgeItem(res.item),
          snippet: sanitizeResponseText(res.snippet),
        }));

    const contextText = effectiveRetrieved
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
1. STRICT FACTUAL ACCURACY: Base your answer EXCLUSIVELY on the provided forensic documents below, derived from verified system architecture specifications, mathematical models, and codebase implementations. NEVER hallucinate ungrounded numbers, libraries, or architectures.
2. CITATIONS: Cite exact file paths (e.g. backend/app/routers/ingest.py, backend/app/services/xai_store.py), mathematical formulas, and verified benchmarks.
3. CONCISENESS & CLARITY: Start with a clear 2-sentence executive takeaway. Then provide precise forensic engineering detail, code/formula snippets if relevant, and statutory context (e.g. Section 65B Indian Evidence Act / BSA 2023).
4. TONE: Authoritative, senior-to-senior, crisp, and analytical. No fluff or generic conversational filler.
5. NO MARKDOWN FILE CITATIONS: NEVER mention, cite, or name any .md files (e.g. WORK-1.md, WORK-2.md, WORK-3.md, README.md, dev-server.md, flow.md, or any file ending in .md) in your response under any circumstances. Teammates must only receive the concrete data, equations, schemas, parameters, and code logic. If referring to implementation files, only cite real code files (.py, .ts, .tsx, .json) or speak in terms of the system components.
6. ARCHITECTURAL & SOLUTION QUERIES: When asked about the proposed solution, problem statement, or system architecture, synthesize a direct, authoritative forensic breakdown covering the 7-stage intelligence pipeline, dual-tier neural models, graph analytics, and forensic evidence generation from the provided documents. NEVER output procedural refusals claiming documents are missing, and NEVER invent hypothetical file paths.`;

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
          answer: sanitizeResponseText(primaryResult.answer),
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
          answer: sanitizeResponseText(fallbackResult.answer),
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
      ? sanitizeResponseText(`${offlinePrefix}\n\n${topMatch.item.tldr}\n\n${topMatch.item.body}`)
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
