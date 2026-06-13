export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type InlineRule = {
  re: RegExp;
  tag: "strong" | "em" | "del" | "mark" | "code" | "u";
};

const INLINE_RULES: InlineRule[] = [
  { re: /\*\*([^*]+)\*\*$/, tag: "strong" },
  { re: /(?<!\*)\*([^*]+)\*$/, tag: "em" },
  { re: /~~([^~]+)~~$/, tag: "del" },
  { re: /==([^=]+)==$/, tag: "mark" },
  { re: /`([^`]+)`$/, tag: "code" },
  { re: /<u>([^<]+)<\/u>$/, tag: "u" },
];

export type InlineFormatMatch = {
  prefix: string;
  content: string;
  tag: InlineRule["tag"];
};

/** 检测光标前是否刚完成一段内联 Markdown，可在输入空格时转为 HTML */
export function matchInlineFormatBeforeSpace(
  before: string,
): InlineFormatMatch | null {
  for (const { re, tag } of INLINE_RULES) {
    const m = before.match(re);
    if (m && m.index !== undefined) {
      return {
        prefix: before.slice(0, m.index),
        content: m[1],
        tag,
      };
    }
  }
  return null;
}

function inlineMarkdownHtml(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/<u>([^<]+)<\/u>/g, "<u>$1</u>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

/** 将纯文本 Markdown 转为备注区 HTML（块级 + 内联） */
export function plainTextToNotesHtml(source: string): string {
  if (!source.trim()) return "";

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      parts.push("<br>");
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      parts.push(
        `<h2>${inlineMarkdownHtml(escapeHtml(line.slice(3)))}</h2>`,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      parts.push(
        `<h1>${inlineMarkdownHtml(escapeHtml(line.slice(2)))}</h1>`,
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
      parts.push(
        `<blockquote>${quoteLines.map((q) => `<p>${inlineMarkdownHtml(escapeHtml(q))}</p>`).join("")}</blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+\[[ xX]\]\s+/, ""));
        i += 1;
      }
      parts.push(
        `<ul>${items.map((item) => `<li>${inlineMarkdownHtml(escapeHtml(item))}</li>`).join("")}</ul>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      parts.push(
        `<ul>${items.map((item) => `<li>${inlineMarkdownHtml(escapeHtml(item))}</li>`).join("")}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      parts.push(
        `<ol>${items.map((item) => `<li>${inlineMarkdownHtml(escapeHtml(item))}</li>`).join("")}</ol>`,
      );
      continue;
    }

    parts.push(`<p>${inlineMarkdownHtml(escapeHtml(line))}</p>`);
    i += 1;
  }

  return parts.join("");
}

export function notesSourceToHtml(source: string): string {
  if (!source.trim()) return "";
  if (
    /<(?:strong|em|del|mark|code|u|br|p|div|blockquote|ul|ol|li|h1|h2|a)\b/i.test(
      source,
    )
  ) {
    return source;
  }
  return plainTextToNotesHtml(source);
}

export function notesHtmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "");
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? "";
}

export function getCaretTextOffset(root: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return 0;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

export function restoreCaretAtOffset(root: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.textContent?.length ?? 0;
    if (pos + len >= offset) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, offset - pos));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    pos += len;
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function syncEditorFromPlainText(root: HTMLDivElement): string {
  const offset = getCaretTextOffset(root);
  const plain = root.innerText;
  root.innerHTML = plainTextToNotesHtml(plain);
  restoreCaretAtOffset(root, offset);
  return root.innerHTML;
}

export type NotesWrapTag = "strong" | "em" | "del" | "mark" | "code" | "u";

export function wrapSelectionWithTag(
  root: HTMLDivElement,
  tag: NotesWrapTag,
  placeholder: string,
): string {
  root.focus();
  const sel = window.getSelection();
  if (!sel?.rangeCount) return root.innerHTML;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return root.innerHTML;

  const tagName = tag.toUpperCase();
  let ancestor: Node | null = range.commonAncestorContainer;
  while (ancestor && ancestor !== root) {
    if (
      ancestor instanceof HTMLElement &&
      ancestor.tagName === tagName
    ) {
      const parent = ancestor.parentNode;
      if (!parent) break;
      while (ancestor.firstChild) {
        parent.insertBefore(ancestor.firstChild, ancestor);
      }
      parent.removeChild(ancestor);
      parent.normalize();
      return root.innerHTML;
    }
    ancestor = ancestor.parentNode;
  }

  const selected = range.toString() || placeholder;
  range.deleteContents();

  const el = root.ownerDocument.createElement(tag);
  el.textContent = selected;
  range.insertNode(el);

  const newRange = root.ownerDocument.createRange();
  newRange.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(newRange);

  return root.innerHTML;
}

export function insertLinkAtSelection(
  root: HTMLDivElement,
  label: string,
  href = "url",
): string {
  root.focus();
  const sel = window.getSelection();
  if (!sel?.rangeCount) return root.innerHTML;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return root.innerHTML;

  const text = range.toString() || label;
  range.deleteContents();

  const a = root.ownerDocument.createElement("a");
  a.textContent = text;
  a.href = href;
  a.target = "_blank";
  a.rel = "noreferrer";
  range.insertNode(a);

  const newRange = root.ownerDocument.createRange();
  newRange.setStartAfter(a);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  return root.innerHTML;
}
