"use client";

import { useMemo, type ReactNode } from "react";

type Props = {
  source: string;
  className?: string;
};

/** 任务备注区轻量 Markdown 渲染（与格式工具栏语法一致） */
export function TaskNotesMarkdown({ source, className = "" }: Props) {
  const blocks = useMemo(() => parseMarkdownBlocks(source), [source]);

  if (!source.trim()) {
    return (
      <p className={`text-md-on-surface-variant/70 ${className}`}>
        添加备注、实验记录或复盘…
      </p>
    );
  }

  return (
    <div
      className={`task-notes-md space-y-2 md-type-body-m leading-relaxed text-md-on-surface ${className}`}
    >
      {blocks}
    </div>
  );
}

function parseMarkdownBlocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="text-lg font-semibold text-md-on-surface">
          {renderInline(line.slice(3))}
        </h2>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key++} className="text-xl font-semibold text-md-on-surface">
          {renderInline(line.slice(2))}
        </h1>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="border-l-2 border-md-primary/40 pl-3 text-md-on-surface-variant"
        >
          {quoteLines.map((q, qi) => (
            <p key={qi}>{renderInline(q)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const m = lines[i].match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
        items.push({
          checked: m?.[1]?.toLowerCase() === "x",
          text: m?.[2] ?? "",
        });
        i += 1;
      }
      nodes.push(
        <ul key={key++} className="list-none space-y-1 pl-0">
          {items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  item.checked
                    ? "border-md-primary bg-md-primary text-md-on-primary"
                    : "border-[var(--md-sys-color-outline)]"
                }`}
                aria-hidden
              >
                {item.checked ? "✓" : ""}
              </span>
              <span className={item.checked ? "line-through opacity-70" : ""}>
                {renderInline(item.text)}
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,2}\s/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={key++} className="whitespace-pre-wrap">
        {paraLines.map((pl, pi) => (
          <span key={pi}>
            {pi > 0 ? <br /> : null}
            {renderInline(pl)}
          </span>
        ))}
      </p>,
    );
  }

  return nodes;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|~~[^~]+~~|==[^=]+==|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<u>[^<]+<\/u>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={k++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      parts.push(
        <span key={k++} className="line-through opacity-80">
          {token.slice(2, -2)}
        </span>,
      );
    } else if (token.startsWith("==")) {
      parts.push(
        <mark
          key={k++}
          className="rounded-sm bg-yellow-200/60 px-0.5 text-md-on-surface"
        >
          {token.slice(2, -2)}
        </mark>,
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={k++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={k++}
          className="rounded bg-[var(--md-sys-color-surface-container-highest)] px-1 py-0.5 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("<u>")) {
      parts.push(<u key={k++}>{token.slice(3, -4)}</u>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={k++}
            href={linkMatch[2]}
            className="text-md-primary underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }
    last = m.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}
