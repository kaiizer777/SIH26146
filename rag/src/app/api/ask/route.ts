import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge, SearchResult } from "@/lib/ragEngine";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
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
      });
    }

    // Mode 2: Groq LLaMA-3.3-70B AI Forensic Synthesis
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      // Graceful offline fallback
      const topMatch = retrieved[0];
      return NextResponse.json({
        mode: "instant_fallback",
        answer: topMatch
          ? `[OFFLINE AIR-GAP FALLBACK - NO GROQ API KEY DETECTED]\n\n${topMatch.item.tldr}\n\n${topMatch.item.body}`
          : "No matching knowledge entries found.",
        retrieved,
        latencyMs: Date.now() - startTime,
        model: "airgap-offline-fallback",
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

    const targetModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    // Call Groq API with configured model
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          temperature: 0.2,
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("[Groq API Error]:", groqResponse.status, errorText);

      // Fallback to top retrieved answer
      const topMatch = retrieved[0];
      return NextResponse.json({
        mode: "instant_fallback",
        answer: topMatch
          ? `[GROQ API RATE LIMIT / OFFLINE FALLBACK]\n\n${topMatch.item.tldr}\n\n${topMatch.item.body}`
          : "Failed to connect to Groq synthesis engine and no local matches found.",
        retrieved,
        latencyMs: Date.now() - startTime,
        model: "airgap-offline-fallback",
      });
    }

    const groqData = await groqResponse.json();
    const generatedAnswer =
      groqData.choices?.[0]?.message?.content ||
      "No synthesized response generated.";

    return NextResponse.json({
      mode: "synthesis",
      answer: generatedAnswer,
      retrieved,
      latencyMs: Date.now() - startTime,
      model: targetModel,
      usage: groqData.usage,
    });
  } catch (error) {
    console.error("[API /api/ask Error]:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing doubt query.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
