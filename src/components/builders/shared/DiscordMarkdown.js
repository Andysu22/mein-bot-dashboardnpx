"use client";
import React, { useMemo } from "react";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseInline(text) {
  let t = escapeHtml(text);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/`(.+?)`/g, `<code class="discord-md__inlinecode">$1</code>`);
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a href="$2" class="discord-md__link" target="_blank" rel="noopener noreferrer">$1</a>`
  );
  return t;
}

export default function DiscordMarkdown({ text }) {
  const html = useMemo(() => {
    if (!text) return "";
    const lines = String(text).split("\n");
    const out = [];

    for (const line of lines) {
      if (line.startsWith("### ")) {
        out.push(`<div class="discord-md__h3">${escapeHtml(line.slice(4))}</div>`); continue;
      }
      if (line.startsWith("## ")) {
        out.push(`<div class="discord-md__h2">${escapeHtml(line.slice(3))}</div>`); continue;
      }
      if (line.startsWith("# ")) {
        out.push(`<div class="discord-md__h1">${escapeHtml(line.slice(2))}</div>`); continue;
      }
      if (!line.trim()) {
        out.push(`<div class="discord-md__spacer"></div>`); continue;
      }
      out.push(`<div class="discord-md__p">${parseInline(line)}</div>`);
    }
    return out.join("");
  }, [text]);

  return <div className="discord-md" dangerouslySetInnerHTML={{ __html: html }} />;
}
