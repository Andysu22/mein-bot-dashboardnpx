"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useRouter, useSearchParams } from "next/navigation";

/** ========= Helpers ========= */
const MAX_FIELDS = 25;
const MAX_TEMPLATES = 10;

function templatesStorageKey(guildId) {
  return `embed_builder_templates:${guildId || "global"}`;
}

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readTemplates(guildId) {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(templatesStorageKey(guildId));
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function writeTemplates(guildId, templates) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(templatesStorageKey(guildId), JSON.stringify(templates));
}

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#5865F2";
  return v.toUpperCase();
}

function truncate(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function defaultField() {
  return {
    id: nanoid(),
    name: "Field title",
    value: "Field value",
    inline: false,
    collapsed: false,
  };
}

function defaultEmbed() {
  return {
    v: 1,
    title: "Embed Title",
    description: "Embed Description",
    color: "#5865F2",

    author: { name: "", icon_url: "", url: "" },
    footer: { text: "", icon_url: "" },

    thumbnail_url: "",
    image_url: "",

    timestamp: false,

    fields: [],
  };
}

/** ========= Discord-like Markdown Rendering (safe) =========
 * We escape all HTML and only inject tags we control.
 * Supports: **bold**, *italic*, __underline__, ~~strike~~, `code`, ```code block```,
 * > quote, ||spoiler||, [text](url)
 */

function escapeHtml(raw) {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInlineMarkdownToHtml(escaped) {
  // escaped is already HTML-escaped
  let s = escaped;

  // Links: [text](url)
  // Because it's escaped, brackets remain. We'll parse on escaped text.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, url) => {
    const href = String(url || "").trim();
    const safeHref = isSafeUrl(href) ? href : "";
    const label = txt || "link";
    if (!safeHref) return `${label}`;
    return `<a class="text-[#00A8FC] hover:underline" href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // Spoiler: ||text||
  s = s.replace(/\|\|([\s\S]+?)\|\|/g, (_m, inner) => {
    return `<span class="spoiler">${inner}</span>`;
  });

  // Inline code: `text`
  s = s.replace(/`([^`]+?)`/g, (_m, inner) => {
    return `<code class="inlinecode">${inner}</code>`;
  });

  // Bold: **text**
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, (_m, inner) => `<strong>${inner}</strong>`);

  // Underline: __text__
  s = s.replace(/__([\s\S]+?)__/g, (_m, inner) => `<u>${inner}</u>`);

  // Strikethrough: ~~text~~
  s = s.replace(/~~([\s\S]+?)~~/g, (_m, inner) => `<s>${inner}</s>`);

  // Italic: *text* (simple)
  // Avoid matching **bold** by requiring not adjacent to *
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, (_m, pre, inner) => `${pre}<em>${inner}</em>`);

  return s;
}

function discordMarkdownToSafeHtml(rawText) {
  const raw = String(rawText ?? "");

  // Split by code blocks ``` ... ```
  const parts = raw.split(/```/g);

  // parts even index = normal, odd index = code block content
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? "";

    if (i % 2 === 1) {
      // Code block
      const esc = escapeHtml(chunk);
      out.push(
        `<pre class="codeblock"><code>${esc}</code></pre>`
      );
      continue;
    }

    // Normal text: handle lines (for quotes)
    const lines = chunk.split(/\r?\n/);
    const renderedLines = lines.map((line) => {
      const isQuote = line.startsWith("> ");
      const content = isQuote ? line.slice(2) : line;

      const esc = escapeHtml(content);
      const inline = renderInlineMarkdownToHtml(esc);

      if (isQuote) {
        return `<div class="quote">${inline}</div>`;
      }
      return inline;
    });

    out.push(renderedLines.join("<br/>"));
  }

  return out.join("");
}

function DiscordMarkdown({ text }) {
  const html = useMemo(() => discordMarkdownToSafeHtml(text), [text]);
  return (
    <div
      className="discord-md"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** ========= Markdown Toolbar ========= */
function ToolbarBtn({ title, children, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 ring-1 ring-white/10"
    >
      {children}
    </button>
  );
}

function MarkdownToolbar({ onWrap, onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <ToolbarBtn title="Bold" onClick={() => onWrap("**", "**")}>
        B
      </ToolbarBtn>
      <ToolbarBtn title="Italic" onClick={() => onWrap("*", "*")}>
        I
      </ToolbarBtn>
      <ToolbarBtn title="Underline" onClick={() => onWrap("__", "__")}>
        U
      </ToolbarBtn>
      <ToolbarBtn title="Strikethrough" onClick={() => onWrap("~~", "~~")}>
        S
      </ToolbarBtn>
      <ToolbarBtn title="Inline Code" onClick={() => onWrap("`", "`")}>
        {"</>"}
      </ToolbarBtn>
      <ToolbarBtn title="Code Block" onClick={() => onWrap("```\\n", "\\n```")}>
        {"```"}
      </ToolbarBtn>
      <ToolbarBtn title="Quote (prefix line)" onClick={() => onInsert("> ")}>
        ❝
      </ToolbarBtn>
      <ToolbarBtn title="Spoiler" onClick={() => onWrap("||", "||")}>
        {"||"}
      </ToolbarBtn>
      <ToolbarBtn title="Link" onClick={() => onWrap("[", "](https://)")}>
        🔗
      </ToolbarBtn>
    </div>
  );
}

/** ========= Sortable Field ========= */
function SortableFieldRow({
  field,
  onChange,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,

  // active target focus markers
  onFocusName,
  onFocusValue,

  // refs (callback)
  setFieldNameRef,
  setFieldValueRef,

  // toolbar actions
  onWrapActive,
  onInsertActive,
}) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-white/10 bg-black/20 p-3 space-y-2",
        isDragging && "ring-2 ring-[#5865F2]/60"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 cursor-grab ring-1 ring-white/10"
            {...attributes}
            {...listeners}
            title="Drag"
          >
            ↕
          </button>
          <div className="text-sm font-bold text-white">{truncate(field.name || "Field", 32)}</div>
          <span className="text-[11px] text-gray-400">{field.inline ? "inline" : "block"}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...field, collapsed: !field.collapsed })}
            className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10"
          >
            {field.collapsed ? "Open" : "Close"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(field.id)}
            className="px-2 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold text-red-200 ring-1 ring-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>

      {!field.collapsed && (
        <div className="space-y-3">
          <div className="rounded-lg bg-[#0f1012] border border-white/10 p-2">
            <MarkdownToolbar onWrap={onWrapActive} onInsert={onInsertActive} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Name</label>
            <input
              ref={(el) => setFieldNameRef(field.id, el)}
              value={field.name}
              onChange={(e) => onChange({ ...field, name: e.target.value })}
              onFocus={onFocusName}
              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
              placeholder="Field name"
              maxLength={256}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Value</label>
            <textarea
              ref={(el) => setFieldValueRef(field.id, el)}
              value={field.value}
              onChange={(e) => onChange({ ...field, value: e.target.value })}
              onFocus={onFocusValue}
              className="w-full min-h-[90px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
              placeholder="Field value"
              maxLength={1024}
            />
            <div className="text-[11px] text-gray-500">Discord-Limit: name 256, value 1024</div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={!!field.inline}
              onChange={(e) => onChange({ ...field, inline: e.target.checked })}
              className="accent-[#5865F2]"
            />
            Inline
          </label>
        </div>
      )}
    </div>
  );
}

function SortableField(props) {
  const { field } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  return (
    <SortableFieldRow
      {...props}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
    />
  );
}

/** ========= Main Page ========= */
export default function EmbedBuilderPage({ params }) {
  const guildId = params?.guildId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return");

  const [tab, setTab] = useState("builder"); // builder | templates | code
  const [embed, setEmbed] = useState(defaultEmbed());

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [tplMsg, setTplMsg] = useState("");

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Active editor target (for toolbar)
  // { kind: 'title'|'description'|'fieldName'|'fieldValue', fieldId?: string }
  const activeTargetRef = useRef({ kind: "description", fieldId: null });

  // DOM refs
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const fieldNameRefs = useRef(new Map()); // fieldId -> input
  const fieldValueRefs = useRef(new Map()); // fieldId -> textarea

  useEffect(() => {
    const t = readTemplates(guildId);
    setTemplates(t);
    setSelectedTemplateId("");
  }, [guildId]);

  function flashTplMsg(msg) {
    setTplMsg(msg);
    setTimeout(() => setTplMsg(""), 1200);
  }

  function resetEmbed() {
    setEmbed(defaultEmbed());
  }

  const botCode = useMemo(() => {
    const e = {
      v: 1,
      t: truncate(embed.title ?? "", 256),
      d: truncate(embed.description ?? "", 4096),
      c: toHexColor(embed.color),

      a: {
        n: truncate(embed.author?.name ?? "", 256),
        i: truncate(embed.author?.icon_url ?? "", 2048),
        u: truncate(embed.author?.url ?? "", 2048),
      },
      f: {
        t: truncate(embed.footer?.text ?? "", 2048),
        i: truncate(embed.footer?.icon_url ?? "", 2048),
      },

      th: truncate(embed.thumbnail_url ?? "", 2048),
      im: truncate(embed.image_url ?? "", 2048),

      ts: !!embed.timestamp,

      fs: (embed.fields || []).slice(0, MAX_FIELDS).map((x) => ({
        n: truncate(x.name ?? "", 256),
        v: truncate(x.value ?? "", 1024),
        i: !!x.inline,
      })),
    };

    return JSON.stringify(e);
  }, [embed]);

  async function copyBotCode() {
    try {
      await navigator.clipboard.writeText(botCode);
      flashTplMsg("Copied ✅");
    } catch {
      flashTplMsg("Copy failed ❌");
    }
  }

  async function copyAndReturn() {
    await copyBotCode();
    if (returnUrl) router.push(returnUrl);
  }

  function onAddField() {
    if ((embed.fields || []).length >= MAX_FIELDS) {
      flashTplMsg(`Max ${MAX_FIELDS} fields`);
      return;
    }
    setEmbed((prev) => ({ ...prev, fields: [...(prev.fields || []), defaultField()] }));
  }

  function onFieldChange(nextField) {
    setEmbed((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((f) => (f.id === nextField.id ? nextField : f)),
    }));
  }

  function onDeleteField(id) {
    setEmbed((prev) => ({
      ...prev,
      fields: (prev.fields || []).filter((f) => f.id !== id),
    }));
    fieldNameRefs.current.delete(id);
    fieldValueRefs.current.delete(id);

    if (activeTargetRef.current?.fieldId === id) {
      activeTargetRef.current = { kind: "description", fieldId: null };
    }
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEmbed((prev) => {
      const arr = [...(prev.fields || [])];
      const from = arr.findIndex((x) => x.id === active.id);
      const to = arr.findIndex((x) => x.id === over.id);
      if (from < 0 || to < 0) return prev;

      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...prev, fields: arr };
    });
  }

  // Templates actions
  function onSaveTemplate() {
    const name = String(templateName || "").trim();
    if (!name) return flashTplMsg("Name missing");

    const now = Date.now();
    const entry = {
      id: nanoid(),
      name: truncate(name, 40),
      createdAt: now,
      embed: {
        ...embed,
        fields: (embed.fields || []).map((f) => ({ ...f, id: nanoid() })),
      },
    };

    const next = [entry, ...templates].slice(0, MAX_TEMPLATES);
    setTemplates(next);
    writeTemplates(guildId, next);
    setTemplateName("");
    flashTplMsg("Saved ✅");
  }

  function onLoadTemplate(id) {
    const found = templates.find((x) => x.id === id);
    if (!found) return;
    setEmbed(found.embed);
    flashTplMsg("Loaded ✅");
  }

  function onDeleteTemplate(id) {
    const next = templates.filter((x) => x.id !== id);
    setTemplates(next);
    writeTemplates(guildId, next);
    if (selectedTemplateId === id) setSelectedTemplateId("");
    flashTplMsg("Deleted ✅");
  }

  const previewColor = useMemo(() => toHexColor(embed.color), [embed.color]);

  /** ========= Formatting apply (wrap/insert) ========= */
  function getActiveElement() {
    const t = activeTargetRef.current;
    if (!t) return null;

    if (t.kind === "title") return titleRef.current;
    if (t.kind === "description") return descRef.current;

    if (t.kind === "fieldName" && t.fieldId) return fieldNameRefs.current.get(t.fieldId) || null;
    if (t.kind === "fieldValue" && t.fieldId) return fieldValueRefs.current.get(t.fieldId) || null;

    return null;
  }

  function updateActiveText(nextText, selectionStart, selectionEnd) {
    const t = activeTargetRef.current;

    if (t.kind === "title") {
      setEmbed((p) => ({ ...p, title: nextText }));
      requestAnimationFrame(() => {
        const el = titleRef.current;
        if (el && typeof el.setSelectionRange === "function") el.setSelectionRange(selectionStart, selectionEnd);
        el?.focus?.();
      });
      return;
    }

    if (t.kind === "description") {
      setEmbed((p) => ({ ...p, description: nextText }));
      requestAnimationFrame(() => {
        const el = descRef.current;
        if (el && typeof el.setSelectionRange === "function") el.setSelectionRange(selectionStart, selectionEnd);
        el?.focus?.();
      });
      return;
    }

    if ((t.kind === "fieldName" || t.kind === "fieldValue") && t.fieldId) {
      setEmbed((p) => ({
        ...p,
        fields: (p.fields || []).map((f) => {
          if (f.id !== t.fieldId) return f;
          return t.kind === "fieldName" ? { ...f, name: nextText } : { ...f, value: nextText };
        }),
      }));

      requestAnimationFrame(() => {
        const el =
          t.kind === "fieldName"
            ? fieldNameRefs.current.get(t.fieldId)
            : fieldValueRefs.current.get(t.fieldId);

        if (el && typeof el.setSelectionRange === "function") el.setSelectionRange(selectionStart, selectionEnd);
        el?.focus?.();
      });
    }
  }

  function wrapSelection(before, after) {
    const el = getActiveElement();
    if (!el) return;

    const text = el.value ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    const selected = text.slice(start, end);
    const next = text.slice(0, start) + before + selected + after + text.slice(end);

    if (selected.length === 0) {
      const cursor = start + before.length;
      updateActiveText(next, cursor, cursor);
    } else {
      const selStart = start + before.length;
      const selEnd = end + before.length;
      updateActiveText(next, selStart, selEnd);
    }
  }

  function insertAtCursor(prefix) {
    const el = getActiveElement();
    if (!el) return;

    const text = el.value ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    const next = text.slice(0, start) + prefix + text.slice(end);
    const cursor = start + prefix.length;
    updateActiveText(next, cursor, cursor);
  }

  function setFieldNameRef(fieldId, el) {
    if (!fieldId) return;
    if (el) fieldNameRefs.current.set(fieldId, el);
    else fieldNameRefs.current.delete(fieldId);
  }

  function setFieldValueRef(fieldId, el) {
    if (!fieldId) return;
    if (el) fieldValueRefs.current.set(fieldId, el);
    else fieldValueRefs.current.delete(fieldId);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Local styles for markdown rendering */}
      <style jsx global>{`
        .discord-md strong { font-weight: 700; color: #fff; }
        .discord-md em { font-style: italic; }
        .discord-md u { text-decoration: underline; }
        .discord-md s { text-decoration: line-through; opacity: 0.95; }
        .discord-md .inlinecode {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.1rem 0.35rem;
          border-radius: 0.35rem;
          font-size: 0.85em;
          color: #e6e6e6;
        }
        .discord-md .codeblock {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.75rem;
          padding: 0.75rem;
          overflow-x: auto;
        }
        .discord-md .codeblock code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.85rem;
          color: #e6e6e6;
          white-space: pre;
        }
        .discord-md .quote {
          border-left: 4px solid rgba(88,101,242,0.6);
          padding-left: 0.75rem;
          margin: 0.25rem 0;
          color: rgba(229,231,235,0.9);
        }
        .discord-md .spoiler {
          background: rgba(0,0,0,0.45);
          border-radius: 0.25rem;
          padding: 0 0.15rem;
          color: transparent;
          text-shadow: 0 0 8px rgba(255,255,255,0.2);
          filter: blur(4px);
          cursor: pointer;
          transition: filter 120ms ease, color 120ms ease;
        }
        .discord-md .spoiler:hover {
          filter: blur(0px);
          color: rgba(229,231,235,1);
          text-shadow: none;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Embed Builder</h1>
          <p className="text-gray-400 text-sm mt-1">Build Discord embeds, save templates, copy bot code.</p>
        </div>

        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setTab("builder")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              tab === "builder" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Builder
          </button>
          <button
            type="button"
            onClick={() => setTab("templates")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              tab === "templates" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setTab("code")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              tab === "code" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Bot Code
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: editor */}
        <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
          {tab === "builder" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-white font-bold">Embed Settings</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetEmbed}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-200"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Global Toolbar */}
              <div className="rounded-xl bg-[#0f1012] border border-white/10 p-3 space-y-2">
                <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">Formatting</div>
                <MarkdownToolbar onWrap={wrapSelection} onInsert={insertAtCursor} />
                <div className="text-[11px] text-gray-500">
                  Gilt für das zuletzt fokussierte Feld (Title / Description / Field Name / Field Value).
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Title</label>
                <input
                  ref={titleRef}
                  value={embed.title}
                  onChange={(e) => setEmbed((p) => ({ ...p, title: e.target.value }))}
                  onFocus={() => (activeTargetRef.current = { kind: "title", fieldId: null })}
                  className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                  maxLength={256}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Description</label>
                <textarea
                  ref={descRef}
                  value={embed.description}
                  onChange={(e) => setEmbed((p) => ({ ...p, description: e.target.value }))}
                  onFocus={() => (activeTargetRef.current = { kind: "description", fieldId: null })}
                  className="w-full min-h-[120px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                  maxLength={4096}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(embed.color)}
                      onChange={(e) => setEmbed((p) => ({ ...p, color: e.target.value }))}
                      className="h-10 w-12 rounded-md bg-transparent border border-white/10"
                      title="Pick color"
                    />
                    <input
                      value={toHexColor(embed.color)}
                      onChange={(e) => setEmbed((p) => ({ ...p, color: e.target.value }))}
                      className="flex-1 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                      placeholder="#5865F2"
                    />
                  </div>
                  <div className="text-[11px] text-gray-500">Picker setzt automatisch Hex (#RRGGBB).</div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-200 mt-7">
                  <input
                    type="checkbox"
                    checked={!!embed.timestamp}
                    onChange={(e) => setEmbed((p) => ({ ...p, timestamp: e.target.checked }))}
                    className="accent-[#5865F2]"
                  />
                  Timestamp
                </label>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-white font-bold text-sm">Author</div>
                <div className="space-y-2">
                  <input
                    value={embed.author?.name || ""}
                    onChange={(e) => setEmbed((p) => ({ ...p, author: { ...(p.author || {}), name: e.target.value } }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Author name"
                    maxLength={256}
                  />
                  <input
                    value={embed.author?.icon_url || ""}
                    onChange={(e) => setEmbed((p) => ({ ...p, author: { ...(p.author || {}), icon_url: e.target.value } }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Author icon URL (optional)"
                    maxLength={2048}
                  />
                  <input
                    value={embed.author?.url || ""}
                    onChange={(e) => setEmbed((p) => ({ ...p, author: { ...(p.author || {}), url: e.target.value } }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Author URL (optional)"
                    maxLength={2048}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-white font-bold text-sm">Media</div>
                <div className="space-y-2">
                  <input
                    value={embed.thumbnail_url}
                    onChange={(e) => setEmbed((p) => ({ ...p, thumbnail_url: e.target.value }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Thumbnail URL (optional)"
                    maxLength={2048}
                  />
                  <input
                    value={embed.image_url}
                    onChange={(e) => setEmbed((p) => ({ ...p, image_url: e.target.value }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Image URL (optional)"
                    maxLength={2048}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-white font-bold text-sm">Footer</div>
                <div className="space-y-2">
                  <input
                    value={embed.footer?.text || ""}
                    onChange={(e) => setEmbed((p) => ({ ...p, footer: { ...(p.footer || {}), text: e.target.value } }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Footer text (optional)"
                    maxLength={2048}
                  />
                  <input
                    value={embed.footer?.icon_url || ""}
                    onChange={(e) => setEmbed((p) => ({ ...p, footer: { ...(p.footer || {}), icon_url: e.target.value } }))}
                    className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Footer icon URL (optional)"
                    maxLength={2048}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-white font-bold text-sm">Fields</div>
                  <button
                    type="button"
                    onClick={onAddField}
                    className="px-3 py-2 rounded-lg bg-[#5865F2] hover:opacity-90 text-sm font-bold text-white"
                  >
                    + Add Field
                  </button>
                </div>

                <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                  <SortableContext items={(embed.fields || []).map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {(embed.fields || []).length === 0 ? (
                        <div className="text-sm text-gray-500 bg-black/20 border border-white/10 rounded-xl p-4">
                          No fields yet.
                        </div>
                      ) : (
                        (embed.fields || []).map((field) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            onChange={onFieldChange}
                            onDelete={onDeleteField}
                            onFocusName={() => (activeTargetRef.current = { kind: "fieldName", fieldId: field.id })}
                            onFocusValue={() => (activeTargetRef.current = { kind: "fieldValue", fieldId: field.id })}
                            setFieldNameRef={setFieldNameRef}
                            setFieldValueRef={setFieldValueRef}
                            onWrapActive={wrapSelection}
                            onInsertActive={insertAtCursor}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="text-[11px] text-gray-500">Max {MAX_FIELDS} fields. Drag ↕ to reorder.</div>
              </div>
            </>
          )}

          {tab === "templates" && (
            <div className="space-y-4">
              <div className="text-white font-bold">Templates</div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">Save current embed</div>
                <div className="flex gap-2">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                    placeholder="Template name"
                    maxLength={40}
                  />
                  <button
                    type="button"
                    onClick={onSaveTemplate}
                    className="px-3 py-2 rounded-lg bg-[#5865F2] hover:opacity-90 text-sm font-bold text-white"
                  >
                    Save
                  </button>
                </div>
                <div className="text-[11px] text-gray-500">Stored locally in your browser. Max {MAX_TEMPLATES}.</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">Load / Delete</div>

                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                >
                  <option value="" className="bg-[#1a1b1e] text-gray-500">
                    Select template...
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#1a1b1e]">
                      {t.name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadTemplate(selectedTemplateId)}
                    disabled={!selectedTemplateId}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-bold",
                      selectedTemplateId
                        ? "bg-white/5 hover:bg-white/10 text-white"
                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTemplate(selectedTemplateId)}
                    disabled={!selectedTemplateId}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-bold",
                      selectedTemplateId
                        ? "bg-red-500/15 hover:bg-red-500/25 text-red-200"
                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    Delete
                  </button>
                </div>

                {tplMsg ? <div className="text-sm text-gray-200">{tplMsg}</div> : null}
              </div>
            </div>
          )}

          {tab === "code" && (
            <div className="space-y-4">
              <div className="text-white font-bold">Bot Code (JSON)</div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyBotCode}
                  className="px-3 py-2 rounded-lg bg-[#5865F2] hover:opacity-90 text-sm font-bold text-white"
                >
                  Copy
                </button>

                <button
                  type="button"
                  onClick={copyAndReturn}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white"
                >
                  Copy & Return
                </button>

                <button
                  type="button"
                  onClick={resetEmbed}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white"
                >
                  Reset
                </button>
              </div>

              {tplMsg ? <div className="text-sm text-gray-200">{tplMsg}</div> : null}

              <textarea
                value={botCode}
                readOnly
                className="w-full min-h-[260px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#5865F2]"
              />

              <div className="text-[11px] text-gray-500">
                Keys: v,t,d,c,a,f,th,im,ts,fs (compact). Paste this in your dashboard settings where you want to use it.
              </div>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-bold">Preview</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">Color</div>
              <div className="w-10 h-4 rounded" style={{ background: previewColor }} />
            </div>
          </div>

          {/* Discord-like preview card */}
          <div className="bg-[#0f1012] border border-white/10 rounded-2xl p-4">
            <div className="flex gap-3">
              <div className="w-1 rounded-full" style={{ background: previewColor }} />

              <div className="flex-1 space-y-2">
                {(embed.author?.name || embed.author?.icon_url) && (
                  <div className="flex items-center gap-2 text-sm text-gray-200">
                    {embed.author?.icon_url ? (
                      <img
                        src={embed.author.icon_url}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}
                    <div className="font-bold">
                      <DiscordMarkdown text={embed.author?.name || "Author"} />
                    </div>
                  </div>
                )}

                {embed.title ? (
                  <div className="text-white font-bold">
                    <DiscordMarkdown text={embed.title} />
                  </div>
                ) : null}

                {embed.description ? (
                  <div className="text-gray-300 text-sm whitespace-pre-wrap">
                    <DiscordMarkdown text={embed.description} />
                  </div>
                ) : null}

                {(embed.fields || []).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {(embed.fields || []).map((f) => (
                      <div
                        key={f.id}
                        className={cn(
                          "rounded-lg bg-black/30 border border-white/10 p-3",
                          f.inline ? "" : "sm:col-span-2"
                        )}
                      >
                        <div className="text-gray-200 font-bold text-sm">
                          <DiscordMarkdown text={f.name} />
                        </div>
                        <div className="text-gray-300 text-sm whitespace-pre-wrap">
                          <DiscordMarkdown text={f.value} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {embed.image_url ? (
                  <img
                    src={embed.image_url}
                    alt=""
                    className="w-full rounded-xl border border-white/10 mt-2"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : null}

                {(embed.footer?.text || embed.footer?.icon_url || embed.timestamp) && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
                    {embed.footer?.icon_url ? (
                      <img
                        src={embed.footer.icon_url}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}
                    {embed.footer?.text ? (
                      <div>
                        <DiscordMarkdown text={embed.footer.text} />
                      </div>
                    ) : null}
                    {embed.timestamp ? <div>• {new Date().toLocaleString("de-DE")}</div> : null}
                  </div>
                )}
              </div>

              {embed.thumbnail_url ? (
                <img
                  src={embed.thumbnail_url}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover border border-white/10"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : null}
            </div>
          </div>

          <div className="text-[11px] text-gray-500">
            Preview rendert Discord-ähnliches Markdown (Bold/Italic/Underline/Strike/Code/Quote/Spoiler/Link).
          </div>
        </div>
      </div>
    </div>
  );
}
