"use client";
import React, { useMemo } from "react";

function escapeHtml(raw) {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineMarkdownToHtml(escaped) {
  let s = escaped;
  // Code, Bold, Underline, Strike, Italic
  s = s.replace(/`([^`]+?)`/g, (_m, inner) => `<code class="inlinecode" style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px;font-family:monospace;">${inner}</code>`);
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, (_m, inner) => `<strong>${inner}</strong>`);
  s = s.replace(/__([\s\S]+?)__/g, (_m, inner) => `<u>${inner}</u>`);
  s = s.replace(/~~([\s\S]+?)~~/g, (_m, inner) => `<s>${inner}</s>`);
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, (_m, pre, inner) => `${pre}<em>${inner}</em>`);
  return s;
}

function discordMarkdownToSafeHtml(rawText) {
  const raw = String(rawText ?? "");
  const parts = raw.split(/```/g);
  const out = [];

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? "";
    if (i % 2 === 1) { // Code block
      const esc = escapeHtml(chunk);
      out.push(`<pre class="codeblock" style="margin:0.5rem 0;background:rgba(0,0,0,0.3);padding:0.5rem;border-radius:0.5rem;overflow-x:auto;"><code>${esc}</code></pre>`);
      continue;
    }
    const lines = chunk.split(/\r?\n/);
    const renderedLines = lines.map((line) => {
      const isQuote = line.startsWith("> ");
      const content = isQuote ? line.slice(2) : line;
      const esc = escapeHtml(content);
      const inline = renderInlineMarkdownToHtml(esc);
      if (isQuote) return `<div class="quote" style="border-left:4px solid rgba(88,101,242,0.6);padding-left:0.5rem;margin:0.25rem 0;">${inline}</div>`;
      return inline;
    });
    out.push(renderedLines.join("<br/>"));
  }
  return out.join("");
}

export default function DiscordMarkdown({ text }) {
  const html = useMemo(() => discordMarkdownToSafeHtml(text), [text]);
  return <div className="discord-md break-words" dangerouslySetInnerHTML={{ __html: html }} />;
}