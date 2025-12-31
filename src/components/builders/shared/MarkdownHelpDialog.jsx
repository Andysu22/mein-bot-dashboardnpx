"use client";

import React, { useState } from "react";
import { HelpCircle, X, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

const SECTIONS = [
  {
    id: "headers",
    title: "Überschriften",
    description: "Strukturierter Text im Embed (#, ##, ###).",
    copy: "# ",
    example: "# Titel\n## Untertitel\n### Klein",
    image: "https://i.imgur.com/9dhQ4SE.png",
  },
  {
    id: "subtext",
    title: "Subtext",
    description: "Kleiner, grauer Text wie in Discord.",
    copy: "-# ",
    example: "-# Das ist Subtext",
    image: "https://i.imgur.com/ADFapDa.png",
  },
  {
    id: "emphasis",
    title: "Hervorhebungen",
    description: "Fett, kursiv, unterstrichen, durchgestrichen.",
    copy: "**text**",
    example: "**fett**\n*kursiv*\n__unterstrichen__\n~~durchgestrichen~~",
  },
  {
    id: "links",
    title: "Maskierte Links",
    description: "Link-Text statt langer URL.",
    copy: "[Text](URL)",
    example: "[OpenAI](https://openai.com)",
    image: "https://i.imgur.com/313wSx8.png",
  },
  {
    id: "lists",
    title: "Listen",
    description: "Aufzählungen und Nummerierungen.",
    copy: "- ",
    example: "- Punkt A\n- Punkt B\n\n1. Erstens\n2. Zweitens",
    image: "https://i.imgur.com/v6pTIhe.png",
  },
  {
    id: "code",
    title: "Inline Code",
    description: "Kurze Code-Stellen im Text.",
    copy: "`code`",
    example: "Nutze `@user` oder `variable`",
    image: "https://i.imgur.com/UNxqhiy.png",
  },
  {
    id: "codeblock",
    title: "Codeblock",
    description: "Mehrzeiliger Code (optional mit Sprache).",
    copy: "```",
    example: "```js\nconsole.log('Hello');\n```",
    image: "https://i.imgur.com/XvNIZ2b.png",
  },
  {
    id: "quote",
    title: "Zitate",
    description: "Ein- oder mehrzeilige Zitate.",
    copy: "> ",
    example: "> Einzeilig\n\n>>> Mehrzeilig\nZeile 2",
    image: "https://i.imgur.com/JJGECw1.png",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function copyToClipboard(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value);
      return;
    }
  } catch {}

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/* -------------------------------------------------------------------------- */
/* Components                                                                  */
/* -------------------------------------------------------------------------- */

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        copyToClipboard(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 900);
      }}
      className={cn(
        "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition",
        copied
          ? "border-[#57F287]/40 bg-[#57F287]/10 text-[#57F287]"
          : "border-white/10 bg-[#111214] text-gray-300 hover:text-white hover:border-white/20"
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SectionCard({ section }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#16171a] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{section.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {section.description}
          </div>
        </div>
        <CopyButton value={section.copy} />
      </div>

      <pre className="text-xs font-mono bg-[#0f1012] border border-white/10 rounded-lg p-3 whitespace-pre-wrap text-gray-200">
{section.example}
      </pre>

      {section.image && (
        <a
          href={section.image}
          target="_blank"
          rel="noreferrer noopener"
          className="relative aspect-[16/9] rounded-lg border border-white/10 bg-[#0f1012] overflow-hidden"
        >
          <img
            src={section.image}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
          />
          <ExternalLink className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
        </a>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Dialog                                                                 */
/* -------------------------------------------------------------------------- */

export default function MarkdownHelpDialog({ className }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1e1f22] border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition",
          className
        )}
      >
        <HelpCircle className="w-4 h-4 text-[#5865F2]" />
        Markdown-Hilfe
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-5xl h-[85vh] rounded-2xl border border-white/10 bg-[#0f1012] shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#111214] border-b border-white/5 flex-shrink-0">
              <div>
                <div className="text-base font-semibold text-white">
                  Text-Formatierung (Markdown)
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Scroll funktioniert jetzt wieder korrekt.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCROLL CONTAINER */}
            <div className="flex-1 overflow-y-auto custom-scroll p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((s) => (
                  <SectionCard key={s.id} section={s} />
                ))}
              </div>

              <div className="text-[11px] text-gray-500 mt-4 leading-relaxed">
                Hinweis: Diese Hilfe zeigt bewusst nur stabile Markdown-Features
                ohne experimentelle Sonderfälle.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
