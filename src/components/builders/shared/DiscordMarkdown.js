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

  // 1. Zuerst die "doppelten" Zeichen (Bold, Underline, Strike)
  // Bold (**text**)
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Underline (__text__)
  t = t.replace(/__(.+?)__/g, "<u>$1</u>");
  // Strikethrough (~~text~~)
  t = t.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // 2. Dann die "einfachen" Zeichen (Italic, Code)
  // Italic (*text* oder _text_)
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
  
  // Inline Code (`text`)
  t = t.replace(/`(.+?)`/g, `<code class="discord-md__inlinecode">$1</code>`);

  // 3. Links [text](url)
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
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // --- CODEBLOCKS (```) ---
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          out.push("</code></pre>");
          inCodeBlock = false;
        } else {
          // Optional: Sprache auslesen (z.B. ```js)
          out.push(`<pre class="discord-md__codeblock"><code>`);
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        out.push(escapeHtml(line) + "\n");
        continue;
      }

      // --- ÜBERSCHRIFTEN (jetzt MIT parseInline) ---
      if (line.startsWith("### ")) {
        out.push(`<div class="discord-md__h3">${parseInline(line.slice(4))}</div>`);
        continue;
      }
      if (line.startsWith("## ")) {
        out.push(`<div class="discord-md__h2">${parseInline(line.slice(3))}</div>`);
        continue;
      }
      if (line.startsWith("# ")) {
        out.push(`<div class="discord-md__h1">${parseInline(line.slice(2))}</div>`);
        continue;
      }

      // --- SUBTEXT (-# ) ---
      if (line.startsWith("-# ")) {
        out.push(`<div class="discord-md__subtext">${parseInline(line.slice(3))}</div>`);
        continue;
      }

      // --- ZITATE (> ) ---
      if (line.startsWith("> ") || line.startsWith(">>> ")) {
        // Simple Quote-Logik
        const content = line.startsWith(">>> ") ? line.slice(4) : line.slice(2);
        out.push(`<div class="discord-md__quote">${parseInline(content)}</div>`);
        continue;
      }

      // --- LEERZEILEN ---
      if (!line.trim()) {
        out.push(`<div class="discord-md__spacer"></div>`);
        continue;
      }

      // --- NORMALER TEXT ---
      out.push(`<div class="discord-md__p">${parseInline(line)}</div>`);
    }

    if (inCodeBlock) out.push("</code></pre>"); // Block schließen falls offen

    return out.join("");
  }, [text]);

  return <div className="discord-md" dangerouslySetInnerHTML={{ __html: html }} />;
}