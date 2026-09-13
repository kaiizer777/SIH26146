"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";

interface MarkdownMessageProps {
  content: string;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-3 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">{lang || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px] font-mono border border-transparent hover:border-slate-700"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="font-mono bg-slate-950 p-3.5 text-xs text-slate-200 overflow-x-auto leading-relaxed border-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Inline token parser for bold, inline code, links, italic
function renderInlineText(text: string): React.ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="font-mono bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded text-xs border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return <span key={index}>{part}</span>;
  });
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  if (!content) return null;

  // Split by triple backticks for code blocks
  const sections = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans">
      {sections.map((section, secIdx) => {
        if (!section) return null;

        const codeMatch = section.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          const lang = codeMatch[1].trim();
          const code = codeMatch[2].replace(/\n$/, "");
          return <CodeBlock key={secIdx} lang={lang} code={code} />;
        }

        // Blocks separated by double newlines
        const blocks = section.split(/\n\n+/);

        return (
          <React.Fragment key={secIdx}>
            {blocks.map((block, blockIdx) => {
              const trimmed = block.trim();
              if (!trimmed) return null;

              // Headings
              if (trimmed.startsWith("### ")) {
                return (
                  <h3
                    key={blockIdx}
                    className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mt-3 mb-1"
                  >
                    {renderInlineText(trimmed.replace(/^###\s+/, ""))}
                  </h3>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h2
                    key={blockIdx}
                    className="text-sm font-bold text-slate-900 mt-3 mb-1"
                  >
                    {renderInlineText(trimmed.replace(/^##\s+/, ""))}
                  </h2>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h1
                    key={blockIdx}
                    className="text-base font-bold text-slate-900 mt-4 mb-1.5"
                  >
                    {renderInlineText(trimmed.replace(/^#\s+/, ""))}
                  </h1>
                );
              }

              // Blockquotes
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={blockIdx}
                    className="border-l-2 border-slate-400 pl-3 py-1 my-2 bg-slate-50/70 text-slate-700 italic rounded-r text-xs sm:text-sm"
                  >
                    {renderInlineText(trimmed.replace(/^>\s*/, ""))}
                  </blockquote>
                );
              }

              // Process lines and group consecutive list items
              const lines = trimmed.split("\n");
              const elements: React.ReactNode[] = [];
              let currentList: { type: "bullet" | "number"; items: string[] } | null = null;

              const flushList = () => {
                if (!currentList) return;
                if (currentList.type === "bullet") {
                  elements.push(
                    <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
                      {currentList.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                          <span className="flex-1">{renderInlineText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  );
                } else {
                  elements.push(
                    <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2">
                      {currentList.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <span className="flex-1">{renderInlineText(item)}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                currentList = null;
              };

              lines.forEach((line) => {
                const lineTrimmed = line.trim();
                if (/^(\*|-|•)\s+/.test(lineTrimmed)) {
                  const textContent = lineTrimmed.replace(/^(\*|-|•)\s+/, "");
                  if (currentList && currentList.type === "bullet") {
                    currentList.items.push(textContent);
                  } else {
                    flushList();
                    currentList = { type: "bullet", items: [textContent] };
                  }
                } else if (/^\d+\.\s+/.test(lineTrimmed)) {
                  const textContent = lineTrimmed.replace(/^\d+\.\s+/, "");
                  if (currentList && currentList.type === "number") {
                    currentList.items.push(textContent);
                  } else {
                    flushList();
                    currentList = { type: "number", items: [textContent] };
                  }
                } else {
                  flushList();
                  if (lineTrimmed) {
                    elements.push(
                      <p key={`p-${elements.length}`} className="my-1 leading-relaxed">
                        {renderInlineText(lineTrimmed)}
                      </p>
                    );
                  }
                }
              });

              flushList();

              return <div key={blockIdx}>{elements}</div>;
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
