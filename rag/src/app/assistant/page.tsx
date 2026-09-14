"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  Trash2,
  ArrowUp,
  Copy,
  Check,
  FileCode,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { MarkdownMessage } from "@/components/MarkdownMessage";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  docLink?: string;
  chapterTitle?: string;
  model?: string;
  latencyMs?: number;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  {
    icon: "⚡",
    title: "Dual-Transformer GNN",
    desc: "Architecture & illicit entity classification",
    query: "Explain the Phase 7 Dual-Transformer GNN architecture and how it classifies illicit entities.",
  },
  {
    icon: "🛡️",
    title: "Anti-Duplicate GeoIP Ingest",
    desc: "Ingestion pipeline & ASN correlation",
    query: "How does the Phase 2 Ingest pipeline enforce Anti-Duplicate Armor and correlate GeoIP ASN data?",
  },
  {
    icon: "⚖️",
    title: "Multi-Factor Risk & §65B",
    desc: "Risk scoring formula & legal admissibility",
    query: "Explain the multi-factor risk scoring formula and Section 65B legal certificate generation.",
  },
  {
    icon: "🔄",
    title: "Celery Worker Task SLAs",
    desc: "Concurrency pools & rate limits",
    query: "What are the Celery worker task queues, SLAs, and pool configurations?",
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ntro_rag_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history from localStorage:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save chat history to localStorage whenever messages update
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (messages.length > 0) {
        localStorage.setItem("ntro_rag_chat_history", JSON.stringify(messages));
      } else {
        localStorage.removeItem("ntro_rag_chat_history");
      }
    } catch (err) {
      console.error("Failed to save chat history to localStorage:", err);
    }
  }, [messages, isLoaded]);

  // Sync state if chat history changes in another tab or in the floating assistant drawer
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ntro_rag_chat_history") {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) setMessages(parsed);
          } catch {}
        } else {
          setMessages([]);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Auto-scroll to bottom of chat thread when a new message is sent/received
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSynthesizing]);

  // Auto-resize input textarea up to 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [query]);

  // Focus textarea on load
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setQuery("");
    try {
      localStorage.removeItem("ntro_rag_chat_history");
    } catch {}
    textareaRef.current?.focus();
  };

  const executeQuery = async (queryText: string) => {
    const trimmedQuery = queryText.trim();
    if (!trimmedQuery || isSynthesizing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsSynthesizing(true);

    try {
      const resp = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuery, mode: "synthesis" }),
      });

      if (!resp.ok) {
        throw new Error(`Synthesis API responded with status ${resp.status}`);
      }

      const data = await resp.json();

      // Extract unique file citations from retrieved items
      const sources: string[] = [];
      if (Array.isArray(data.retrieved)) {
        data.retrieved.forEach((res: { item?: { fileCitations?: string[] } }) => {
          if (Array.isArray(res.item?.fileCitations)) {
            res.item.fileCitations.forEach((src) => {
              if (!sources.includes(src)) sources.push(src);
            });
          }
        });
      }

      const topItem = data.retrieved?.[0]?.item;

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.answer || "No response generated.",
        sources: sources.length > 0 ? sources : undefined,
        docLink: topItem?.chapterUrl,
        chapterTitle: topItem?.chapterTitle,
        model: data.model || "Air-Gap RAG Engine",
        latencyMs: data.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Failed to synthesize answer.";
      const assistantErrorMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Synthesis Error:** ${errorText}\n\nPlease check network or offline knowledge index connectivity.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantErrorMsg]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeQuery(query);
  };

  const handleSelectSuggested = (suggestedText: string) => {
    executeQuery(suggestedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50/50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white overflow-hidden">
      {/* Tactical Sovereign Header Bar */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/docs"
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 hover:text-slate-900 transition-colors btn-tactical-secondary px-2.5 py-1 rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DOCUMENTATION</span>
            <span className="sm:hidden">DOCS</span>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-b border-b-blue-900 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span>NTRO Forensic Assistant</span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-mono border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">ONLINE // SOVEREIGN AIR-GAP RAG</span>
            <span className="sm:hidden">ONLINE // AIR-GAP</span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 text-xs font-mono transition-colors cursor-pointer"
              title="Clear Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Chat Container */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col justify-between">
          {/* Executive Empty State */}
          {messages.length === 0 ? (
            <div className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600/70 border-b border-b-blue-900 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_rgba(29,78,216,0.3)]">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-medium border border-slate-200 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AIR-GAPPED SOVEREIGN INTELLIGENCE CORPUS</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  NTRO Forensic Intelligence Assistant
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed font-sans">
                  Direct conversational intelligence grounded strictly in WORK-1, WORK-2, WORK-3, and system architecture docs. Ask any architectural, operational, or pipeline question.
                </p>
              </div>

              {/* Quick Inquiry Cards */}
              <div className="w-full max-w-2xl space-y-2.5 text-left">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    Suggested Technical Queries
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Click to ask</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTED_QUERIES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggested(item.query)}
                      className="chip-tactical-prompt p-3.5 rounded-xl flex items-start gap-3 cursor-pointer text-left"
                    >
                      <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span className="truncate">{item.title}</span>
                          <ArrowUp className="w-3.5 h-3.5 text-slate-600 rotate-45 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5 font-sans">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="relative bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-xs px-4.5 py-3 max-w-2xl text-sm leading-relaxed border-t border-t-blue-400/50 border-b border-b-blue-800 shadow-[0_3px_10px_-2px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
                        <p className="whitespace-pre-wrap font-sans text-white antialiased font-normal">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-blue-100/80 mt-1 select-none">
                          <span>{message.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="flex justify-start min-w-0">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-3xl w-full min-w-0 text-sm leading-relaxed text-slate-800 space-y-4">
                      {/* Assistant Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-b border-b-blue-900 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-900">
                                NTRO FORENSIC AI
                              </span>
                              {message.model && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {message.model.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {message.latencyMs && (
                            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {message.latencyMs}ms
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(message.id, message.content)}
                            className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-slate-900 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Assistant Response Body */}
                      <div className="prose prose-slate max-w-none">
                        <MarkdownMessage content={message.content} />
                      </div>

                      {/* Citations & Sources Footer */}
                      {(Boolean(message.sources?.length) || message.docLink) && (
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          {message.sources && message.sources.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <FileCode className="w-3 h-3" />
                                <span>Verified Source Citations</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {message.sources.map((src, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200"
                                  >
                                    {src}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.docLink && (
                            <Link
                              href={message.docLink}
                              className="btn-tactical-primary text-white text-xs font-mono font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 hover:opacity-95 transition-all shadow-xs"
                            >
                              <span>
                                {message.chapterTitle
                                  ? `Jump to ${message.chapterTitle.split(":")[0]}`
                                  : "Jump to Documentation"}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* In-Flight Thinking Indicator */}
              {isSynthesizing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs max-w-md flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 animate-pulse shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-medium text-slate-900 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                        <span>Analyzing knowledge corpus &amp; synthesizing answer...</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Querying Sovereign Knowledge Index &amp; AI Engine
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Anchored Bottom Input Bar */}
      <footer className="border-t border-slate-200 bg-white/95 backdrop-blur-sm sticky bottom-0 z-30 p-4 shrink-0">
        <div className="max-w-4xl mx-auto w-full space-y-2">
          <form
            onSubmit={handleSend}
            className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2 shadow-xs focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 focus-within:bg-white transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a technical doubt or architectural query (Enter sends, Shift+Enter adds newline)..."
              className="flex-1 max-h-36 min-h-[38px] bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 px-3 py-1.5 focus:outline-none resize-none font-sans leading-relaxed"
            />
            <button
              type="submit"
              disabled={isSynthesizing || !query.trim()}
              className="btn-tactical-primary text-white p-2.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-transform active:scale-95"
              title="Send message (Enter)"
            >
              {isSynthesizing ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              ) : (
                <ArrowUp className="w-4 h-4 text-white" />
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-2">
            <span>Direct offline sovereign RAG intelligence</span>
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-mono">Enter ↵</kbd> to send
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
