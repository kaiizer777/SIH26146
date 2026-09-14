"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, Table } from "lucide-react";

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
    <div className="my-3 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 text-slate-100 shadow-md min-w-0 max-w-full">
      <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
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
      <pre className="font-mono bg-slate-950 p-3 sm:p-3.5 text-xs text-slate-200 overflow-x-auto leading-relaxed border-0 overscroll-x-contain max-w-full">
        <code className="block">{code}</code>
      </pre>
    </div>
  );
}

// Inline token parser for bold, inline code, links, italic
function renderInlineText(text: string): React.ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="font-mono bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded text-xs border border-slate-200 break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
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
          className="text-sky-600 hover:underline font-medium break-all sm:break-normal"
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

// Parse markdown table rows, handling escaped pipes \| and backticks
function splitTableRow(rowStr: string): string[] {
  let line = rowStr.trim();
  if (line.startsWith("|")) line = line.slice(1);
  if (line.endsWith("|")) line = line.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let inBacktick = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i - 1] : "";

    if (char === "`" && prevChar !== "\\") {
      inBacktick = !inBacktick;
      current += char;
    } else if (char === "|" && !inBacktick && prevChar !== "\\") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

// Check if row is a markdown delimiter like |---|:---:|---:|
function isDelimiterRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{1,}:?$/.test(cell.trim()));
}

// Extract column alignments from delimiter row
function getAlignments(cells: string[]): ("left" | "center" | "right")[] {
  return cells.map((cell) => {
    const trimmed = cell.trim();
    const starts = trimmed.startsWith(":");
    const ends = trimmed.endsWith(":");
    if (starts && ends) return "center";
    if (ends) return "right";
    return "left";
  });
}

interface MarkdownTableProps {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
}

function MarkdownTable({ headers, alignments, rows }: MarkdownTableProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyTsv = async () => {
    try {
      const tsvContent = [
        headers.join("\t"),
        ...rows.map((row) => row.join("\t")),
      ].join("\n");
      await navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getAlignClass = (align: "left" | "center" | "right") => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <div className="my-3 rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs min-w-0 max-w-full">
      {/* Table Sub-header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 sm:px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <Table className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-700">Forensic Matrix</span>
          <span className="text-[10px] text-slate-400">({rows.length} rows)</span>
        </div>
        <button
          type="button"
          onClick={handleCopyTsv}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer text-[10px] font-mono border border-slate-200/60"
          title="Copy table as TSV (paste directly into Excel / Sheets)"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-600 font-medium">Copied TSV</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Table</span>
            </>
          )}
        </button>
      </div>

      {/* Horizontal Scrollable Table Wrapper */}
      <div className="overflow-x-auto w-full max-w-full overscroll-x-contain">
        <table className="w-full text-left text-xs border-collapse min-w-[520px] sm:min-w-[580px]">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 font-mono text-[11px] text-slate-700 font-bold tracking-tight">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`py-2 sm:py-2.5 px-2.5 sm:px-3.5 border-r border-slate-200/70 last:border-r-0 whitespace-nowrap ${getAlignClass(
                    alignments[idx] || "left"
                  )}`}
                >
                  {renderInlineText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rowIdx) => {
              const isSubItem = !row[0];
              return (
                <tr
                  key={rowIdx}
                  className={`hover:bg-blue-50/30 transition-colors ${
                    isSubItem ? "bg-slate-50/30" : "even:bg-slate-50/50"
                  }`}
                >
                  {row.map((cell, colIdx) => {
                    const align = alignments[colIdx] || "left";
                    return (
                      <td
                        key={colIdx}
                        className={`py-2 px-2.5 sm:px-3.5 text-slate-700 leading-relaxed border-r border-slate-100 last:border-r-0 ${getAlignClass(
                          align
                        )}`}
                      >
                        {cell ? (
                          renderInlineText(cell)
                        ) : colIdx === 0 ? (
                          <span
                            className="inline-flex items-center gap-1 pl-1 text-slate-400 font-mono text-[11px] select-none"
                            title="Sub-component"
                          >
                            <span className="text-slate-300">↳</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 select-none font-mono">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderMarkdownSection(sectionText: string): React.ReactNode[] {
  const lines = sectionText.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;

  const isTableStart = (idx: number): boolean => {
    if (idx + 1 >= lines.length) return false;
    const l1 = lines[idx].trim();
    const l2 = lines[idx + 1].trim();
    if (!l1.includes("|") || !l2.includes("|")) return false;
    const delimCells = splitTableRow(l2);
    return delimCells.length >= 1 && isDelimiterRow(delimCells);
  };

  const isBlockStart = (idx: number): boolean => {
    if (idx >= lines.length) return true;
    const line = lines[idx].trim();
    if (!line) return true;
    if (/^#{1,4}\s+/.test(line)) return true;
    if (line.startsWith(">")) return true;
    if (/^(\*|-|•)\s+/.test(line)) return true;
    if (/^\d+\.\s+/.test(line)) return true;
    if (/^(---|___|\*\*\*)$/.test(line)) return true;
    if (isTableStart(idx)) return true;
    return false;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Table Check
    if (isTableStart(i)) {
      const headerCells = splitTableRow(lines[i]);
      const delimCells = splitTableRow(lines[i + 1]);
      const alignments = getAlignments(delimCells);
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes("|")) break;
        const rowCells = splitTableRow(rowLine);
        while (rowCells.length < headerCells.length) {
          rowCells.push("");
        }
        rows.push(rowCells);
        i++;
      }

      elements.push(
        <MarkdownTable
          key={`table-${elements.length}`}
          headers={headerCells}
          alignments={alignments}
          rows={rows}
        />
      );
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-xs font-bold text-slate-800 mt-2.5 mb-1"
        >
          {renderInlineText(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mt-3 mb-1"
        >
          {renderInlineText(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-sm font-bold text-slate-900 mt-3 mb-1"
        >
          {renderInlineText(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          className="text-base font-bold text-slate-900 mt-4 mb-1.5"
        >
          {renderInlineText(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      i++;
      continue;
    }

    // 4. Blockquotes
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${elements.length}`}
          className="border-l-2 border-slate-400 pl-3 py-1 my-2 bg-slate-50/70 text-slate-700 italic rounded-r text-xs sm:text-sm space-y-1 overflow-x-auto max-w-full break-words"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineText(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Bullet Lists
    if (/^(\*|-|•)\s+/.test(trimmed)) {
      const bulletItems: string[] = [];
      while (i < lines.length && /^(\*|-|•)\s+/.test(lines[i].trim())) {
        bulletItems.push(lines[i].trim().replace(/^(\*|-|•)\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
          {bulletItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <span className="flex-1 min-w-0 leading-relaxed break-words">{renderInlineText(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Numbered Lists
    if (/^\d+\.\s+/.test(trimmed)) {
      const numItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        numItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2">
          {numItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 min-w-0">
              <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 mt-0.5">
                {idx + 1}.
              </span>
              <span className="flex-1 min-w-0 leading-relaxed break-words">{renderInlineText(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Horizontal Rules
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      elements.push(<hr key={`hr-${elements.length}`} className="my-3 border-slate-200" />);
      i++;
      continue;
    }

    // 8. Paragraphs (accumulate non-empty lines until next block element or blank line)
    const paraLines: string[] = [];
    while (i < lines.length && !isBlockStart(i)) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={`p-${elements.length}`} className="my-1.5 leading-relaxed text-slate-800 break-words">
          {paraLines.map((pl, plIdx) => (
            <React.Fragment key={plIdx}>
              {plIdx > 0 && " "}
              {renderInlineText(pl)}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }

  return elements;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  if (!content) return null;

  // Split by triple backticks for code blocks
  const sections = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm text-slate-800 leading-relaxed font-sans min-w-0 max-w-full">
      {sections.map((section, secIdx) => {
        if (!section) return null;

        const codeMatch = section.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          const lang = codeMatch[1].trim();
          const code = codeMatch[2].replace(/\n$/, "");
          return <CodeBlock key={secIdx} lang={lang} code={code} />;
        }

        return (
          <React.Fragment key={secIdx}>
            {renderMarkdownSection(section)}
          </React.Fragment>
        );
      })}
    </div>
  );
}
