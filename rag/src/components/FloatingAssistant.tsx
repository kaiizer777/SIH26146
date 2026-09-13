"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Bot,
  ExternalLink,
  Trash2,
  ArrowUp,
  Copy,
  Check,
  FileCode,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Search,
  Cpu,
  Database,
  Lock,
} from "lucide-react";
import { MarkdownMessage } from "@/components/MarkdownMessage";

export interface DrawerChatMessage {
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

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DrawerChatMessage[]>([]);
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

  // Sync state if chat history changes in another tab or in the full assistant page
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

  // Keyboard shortcut: Ctrl+K or Cmd+K to toggle drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSynthesizing, isOpen]);

  // Auto-resize input textarea up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

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

    const userMessage: DrawerChatMessage = {
      id: `drawer-user-${Date.now()}`,
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

      const assistantMessage: DrawerChatMessage = {
        id: `drawer-asst-${Date.now()}`,
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
      const assistantErrorMsg: DrawerChatMessage = {
        id: `drawer-asst-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Synthesis Error:** ${errorText}\n\nPlease verify that the RAG indexing service and LLM API key are configured.`,
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

  const handleSelectSuggestedQuery = (suggestedText: string) => {
    executeQuery(suggestedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Tactical Chat Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-12 h-12 rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/80 border-x border-x-blue-600/80 border-b border-b-blue-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(29,78,216,0.35)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_20px_rgba(29,78,216,0.45)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] flex items-center justify-center text-white transition-all duration-140 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          aria-label="Open NTRO Forensic Assistant (Ctrl+K)"
          title="Open Forensic Assistant (Ctrl+K)"
        >
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-700 animate-pulse" />
        </button>

        {/* Tactical Shortcut Tooltip */}
        <div className="absolute right-14 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-140 pointer-events-none shadow-md border border-slate-700 flex items-center gap-1.5">
          <span>Forensic Assistant</span>
          <span className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-bold border border-slate-700">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600/70 border-b border-b-blue-900 flex items-center justify-center text-white shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(29,78,216,0.25)]">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900 tracking-tight">
                      NTRO FORENSIC ASSISTANT
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 block">
                    Sovereign Air-Gap RAG Engine
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <Link
                  href="/assistant"
                  onClick={() => setIsOpen(false)}
                  className="btn-tactical-secondary px-2.5 py-1 text-[11px] font-mono text-slate-700 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open full page assistant"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                  <span className="hidden sm:inline font-medium">Full Page</span>
                </Link>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-between py-4">
                  {/* Top Welcome Card */}
                  <div className="flex flex-col items-center text-center space-y-3 px-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600/70 border-b border-b-blue-900 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(29,78,216,0.28)]">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1 max-w-md">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-medium border border-slate-200 mb-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>AIR-GAPPED SOVEREIGN INTELLIGENCE</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-mono tracking-tight">
                        NTRO Forensic Intelligence Assistant
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Instant technical answers grounded strictly in WORK-1, WORK-2, WORK-3, and system architecture specifications. Zero hallucination.
                      </p>
                    </div>
                  </div>

                  {/* Suggested Quick Queries */}
                  <div className="my-4 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Suggested Technical Inquiries</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Click to ask</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUGGESTED_QUERIES.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestedQuery(item.query)}
                          className="chip-tactical-prompt text-left p-3 rounded-lg flex items-start gap-2.5 cursor-pointer"
                        >
                          <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
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

                  {/* System Architecture Metadata Badges */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-around text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-slate-400" />
                      14 Docs Indexed
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-slate-400" />
                      Strict Grounding
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-emerald-600" />
                      Sub-sec RAG
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {messages.map((message) => {
                    if (message.role === "user") {
                      return (
                        <div key={message.id} className="flex justify-end">
                          <div className="relative bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] text-xs sm:text-[13px] leading-relaxed border-t border-t-blue-400/50 border-b border-b-blue-800 shadow-[0_3px_10px_-2px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
                            <p className="whitespace-pre-wrap font-sans text-white antialiased font-normal">{message.content}</p>
                            <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-blue-100/80 mt-1 select-none">
                              <span>{message.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className="flex justify-start">
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_16px_-4px_rgba(15,23,42,0.03)] max-w-[95%] w-full text-xs sm:text-sm leading-relaxed text-slate-800 space-y-3">
                          {/* Assistant Message Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs font-mono font-bold text-slate-900">
                                {message.model ? message.model.toUpperCase() : "NTRO FORENSIC AI"}
                              </span>
                              {message.latencyMs && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                  {message.latencyMs}ms
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(message.id, message.content)}
                              className="text-[11px] font-mono text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Response Markdown */}
                          <MarkdownMessage content={message.content} />

                          {/* Citations and Chapter Link */}
                          {(Boolean(message.sources?.length) || message.docLink) && (
                            <div className="pt-2.5 border-t border-slate-100 space-y-2">
                              {message.sources && message.sources.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileCode className="w-3 h-3" />
                                    <span>Verified Sources</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {message.sources.slice(0, 3).map((src, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600"
                                      >
                                        {src}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {message.docLink && (
                                <div className="pt-1 flex justify-end">
                                  <Link
                                    href={message.docLink}
                                    onClick={() => setIsOpen(false)}
                                    className="btn-tactical-primary text-white text-[11px] font-mono font-medium px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>
                                      {message.chapterTitle
                                        ? `Jump to ${message.chapterTitle.split(":")[0]}`
                                        : "Jump to Chapter"}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-slate-300" />
                                  </Link>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isSynthesizing && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs max-w-sm flex items-center gap-2.5 text-slate-700">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-800 shrink-0" />
                        <span className="text-xs font-mono">
                          Scanning knowledge base &amp; synthesizing answer...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Drawer Bottom Input Console */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              <form
                onSubmit={handleSend}
                className="relative bg-slate-50 border border-slate-300 rounded-xl p-2 shadow-2xs focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/5 transition-all"
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a technical query (e.g., Explain Phase 7 GNN)..."
                  className="w-full max-h-28 min-h-[36px] bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 px-1 py-1 focus:outline-none resize-none font-sans leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span className="bg-slate-200/80 px-1 py-0.2 rounded text-slate-600 font-semibold">↵ Enter</span>
                    <span className="hidden sm:inline">to send •</span>
                    <span className="bg-slate-200/80 px-1 py-0.2 rounded text-slate-600 font-semibold hidden sm:inline">Shift+↵</span>
                    <span className="hidden sm:inline">newline</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {query.trim() && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSynthesizing || !query.trim()}
                      className="btn-tactical-primary text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-medium shadow-xs"
                      title="Send message (Enter)"
                    >
                      {isSynthesizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Ask AI</span>
                          <ArrowUp className="w-3.5 h-3.5 text-white" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

