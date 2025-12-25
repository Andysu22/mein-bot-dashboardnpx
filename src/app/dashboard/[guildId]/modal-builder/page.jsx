"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { nanoid } from "nanoid";

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import EmojiPicker from "emoji-picker-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react"; // Für den Reset Button

/** ========= Helpers ========= */
const MAX_COMPONENTS = 5;
const MAX_SELECT_OPTIONS = 25;
const MAX_TEMPLATES = 10;

function templatesStorageKey(guildId) {
  return `modal_builder_templates:${guildId || "global"}`;
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

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toSafeCustomId(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_:\-]/g, "")
    .slice(0, 100);
  return t || "id";
}

/** ========= Kinds ========= */
const KINDS = Object.freeze({
  TEXT_INPUT: "text_input",
  STRING_SELECT: "string_select",
  TEXT_DISPLAY: "text_display",
  USER_SELECT: "user_select",
  CHANNEL_SELECT: "channel_select",
  ROLE_SELECT: "role_select",
  MENTIONABLE_SELECT: "mentionable_select",
  FILE_UPLOAD: "file_upload",
});

const REQUIRED_KINDS = new Set([
  KINDS.TEXT_INPUT,
  KINDS.STRING_SELECT,
  KINDS.USER_SELECT,
  KINDS.CHANNEL_SELECT,
  KINDS.ROLE_SELECT,
  KINDS.MENTIONABLE_SELECT,
  KINDS.FILE_UPLOAD,
]);

/** ========= Defaults ========= */
function defaultComponent(kind) {
  const base = {
    id: nanoid(),
    kind,
    label:
      kind === KINDS.TEXT_INPUT ? "Text Input" : 
      kind === KINDS.STRING_SELECT ? "Select Menu" : 
      kind === KINDS.TEXT_DISPLAY ? "Text Display" : 
      kind === KINDS.USER_SELECT ? "User Select" : 
      kind === KINDS.CHANNEL_SELECT ? "Channel Select" : 
      kind === KINDS.ROLE_SELECT ? "Role Select" : 
      kind === KINDS.MENTIONABLE_SELECT ? "User & Role Select" : 
      kind === KINDS.FILE_UPLOAD ? "File Upload" : "Component",
    description: "",
    custom_id: toSafeCustomId(`input_${nanoid(8)}`),
    required: true,
    collapsed: false,
  };

  if (kind === KINDS.TEXT_INPUT) {
    return { ...base, style: 1, max_length: 4000, placeholder: "" };
  }
  if (kind === KINDS.STRING_SELECT) {
    return { ...base, required: true, placeholder: "Make a selection", min_values: 1, max_values: 1, options: [{ id: nanoid(), label: "Option", value: "option_1", description: "", emoji: "", isDefault: true, collapsed: true }] };
  }
  if ([KINDS.USER_SELECT, KINDS.CHANNEL_SELECT, KINDS.ROLE_SELECT, KINDS.MENTIONABLE_SELECT].includes(kind)) {
    return { ...base, required: true, placeholder: "Select…", min_values: 0, max_values: 1 };
  }
  if (kind === KINDS.TEXT_DISPLAY) {
    return { ...base, required: false, content: "" };
  }
  if (kind === KINDS.FILE_UPLOAD) {
    return { ...base, required: true };
  }
  return base;
}

/** ========= Bot Code Builder ========= */
function buildBotCode(modal) {
  const payload = {
    t: modal.title || "Modal",
    id: modal.custom_id || "modal",
    w: !!modal.show_warning ? 1 : 0,
    c: (modal.components || []).map((x) => {
      const common = { k: x.kind, l: x.label || "", d: x.description || "", cid: x.custom_id || "", r: x.required ? 1 : 0 };
      if (x.kind === KINDS.TEXT_INPUT) return { ...common, s: x.style === 2 ? 2 : 1, ph: x.placeholder || "", mx: clampInt(x.max_length ?? 4000, 1, 4000) };
      if (x.kind === KINDS.STRING_SELECT) {
        const opts = Array.isArray(x.options) ? x.options : [];
        return { ...common, ph: x.placeholder || "", mn: clampInt(x.min_values ?? 1, 0, 1), mx: 1, o: opts.map((o) => ({ l: o.label || "", v: o.value || "", d: o.description || "", e: o.emoji || "", df: o.isDefault ? 1 : 0 })) };
      }
      if ([KINDS.USER_SELECT, KINDS.CHANNEL_SELECT, KINDS.ROLE_SELECT, KINDS.MENTIONABLE_SELECT].includes(x.kind)) {
        return { ...common, ph: x.placeholder || "", mn: clampInt(x.min_values ?? 0, 0, 1), mx: 1 };
      }
      if (x.kind === KINDS.TEXT_DISPLAY) return { ...common, txt: x.content || "" };
      return common;
    }),
  };
  return JSON.stringify(payload);
}

function buildDiscordModalJSON(modal) {
  const comps = (modal.components || []).map((c) => {
    const label = { type: 18, label: c.label || "Component", description: c.description || "", components: [] };
    if (c.kind === KINDS.TEXT_INPUT) {
      label.components.push({ type: 4, custom_id: c.custom_id || "input", style: c.style === 2 ? 2 : 1, required: !!c.required, placeholder: c.placeholder, max_length: clampInt(c.max_length ?? 4000, 1, 4000) });
    } else if (c.kind === KINDS.STRING_SELECT) {
      label.components.push({ type: 3, custom_id: c.custom_id || "select", required: !!c.required, placeholder: c.placeholder, min_values: clampInt(c.min_values ?? 1, 0, 1), max_values: 1, options: (c.options || []).map(o => ({ label: o.label, value: o.value, description: o.description, emoji: o.emoji, default: !!o.isDefault })) });
    } else if (c.kind === KINDS.USER_SELECT) label.components.push({ type: 5, custom_id: c.custom_id, required: !!c.required, placeholder: c.placeholder, min_values: c.min_values, max_values: 1 });
    else if (c.kind === KINDS.CHANNEL_SELECT) label.components.push({ type: 8, custom_id: c.custom_id, required: !!c.required, placeholder: c.placeholder, min_values: c.min_values, max_values: 1 });
    else if (c.kind === KINDS.ROLE_SELECT) label.components.push({ type: 9, custom_id: c.custom_id, required: !!c.required, placeholder: c.placeholder, min_values: c.min_values, max_values: 1 });
    else if (c.kind === KINDS.MENTIONABLE_SELECT) label.components.push({ type: 10, custom_id: c.custom_id, required: !!c.required, placeholder: c.placeholder, min_values: c.min_values, max_values: 1 });
    else if (c.kind === KINDS.FILE_UPLOAD) label.components.push({ type: 19, custom_id: c.custom_id, required: !!c.required });
    else if (c.kind === KINDS.TEXT_DISPLAY) return { type: 17, content: c.content || "" };
    return label;
  });
  return { title: modal.title || "Modal", custom_id: modal.custom_id || "modal", components: comps };
}

/** ========= Store ========= */
const useBuilderStore = create((set, get) => ({
  modal: { title: "Modal", custom_id: "modal", show_warning: false, components: [defaultComponent(KINDS.TEXT_INPUT)] },
  setTitle: (title) => set((s) => ({ modal: { ...s.modal, title } })),
  setCustomId: (custom_id) => set((s) => ({ modal: { ...s.modal, custom_id } })),
  setShowWarning: (show_warning) => set((s) => ({ modal: { ...s.modal, show_warning } })),
  setModal: (modal) => set(() => ({ modal })),
  resetModal: () => set(() => ({ modal: { title: "Modal", custom_id: "modal", show_warning: false, components: [defaultComponent(KINDS.TEXT_INPUT)] } })),
  addComponent: (kind) => { const { modal } = get(); if (modal.components.length >= MAX_COMPONENTS) return; set((s) => ({ modal: { ...s.modal, components: [...s.modal.components, defaultComponent(kind)] } })); },
  removeComponent: (id) => { const { modal } = get(); if (modal.components.length <= 1) return; set((s) => ({ modal: { ...s.modal, components: s.modal.components.filter((x) => x.id !== id) } })); },
  reorder: (activeId, overId) => { const { modal } = get(); const list = [...modal.components]; const from = list.findIndex((x) => x.id === activeId); const to = list.findIndex((x) => x.id === overId); if (from < 0 || to < 0 || from === to) return; const [moved] = list.splice(from, 1); list.splice(to, 0, moved); set((s) => ({ modal: { ...s.modal, components: list } })); },
  updateComponent: (id, patch) => set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === id ? { ...x, ...patch } : x)) } })),
  addOption: (compId) => { const { modal } = get(); const c = modal.components.find((x) => x.id === compId); if (!c || c.kind !== KINDS.STRING_SELECT) return; const opts = Array.isArray(c.options) ? c.options : []; if (opts.length >= MAX_SELECT_OPTIONS) return; const next = [...opts, { id: nanoid(), label: `Option ${opts.length + 1}`, value: `option_${opts.length + 1}`, description: "", emoji: "", isDefault: false, collapsed: true }]; set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)) } })); },
  removeOption: (compId, optId) => { const { modal } = get(); const c = modal.components.find((x) => x.id === compId); if (!c || c.kind !== KINDS.STRING_SELECT) return; const opts = Array.isArray(c.options) ? c.options : []; if (opts.length <= 1) return; let next = opts.filter((o) => o.id !== optId); if (!next.some((o) => o.isDefault)) next = next.map((o, i) => (i === 0 ? { ...o, isDefault: true } : o)); set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)) } })); },
  setDefaultOption: (compId, optId) => { const { modal } = get(); const c = modal.components.find((x) => x.id === compId); if (!c || c.kind !== KINDS.STRING_SELECT) return; const opts = Array.isArray(c.options) ? c.options : []; const next = opts.map((o) => ({ ...o, isDefault: o.id === optId })); set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)) } })); },
  updateOption: (compId, optId, patch) => { const { modal } = get(); const c = modal.components.find((x) => x.id === compId); if (!c || c.kind !== KINDS.STRING_SELECT) return; const opts = Array.isArray(c.options) ? c.options : []; const next = opts.map((o) => (o.id === optId ? { ...o, ...patch } : o)); set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)) } })); },
  reorderOption: (compId, activeOptId, overOptId) => { const { modal } = get(); const c = modal.components.find((x) => x.id === compId); if (!c || c.kind !== KINDS.STRING_SELECT) return; const opts = Array.isArray(c.options) ? c.options : []; const from = opts.findIndex((o) => o.id === activeOptId); const to = opts.findIndex((o) => o.id === overOptId); if (from < 0 || to < 0 || from === to) return; const next = [...opts]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); set((s) => ({ modal: { ...s.modal, components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)) } })); },
}));

/** ========= Add menu & UI ========= */
function AddComponentMenu({ onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc); }, []);
  const items = [{ kind: KINDS.TEXT_INPUT, label: "Text Input", icon: "☰" }, { kind: KINDS.STRING_SELECT, label: "Select Menu", icon: "☑" }, { kind: KINDS.TEXT_DISPLAY, label: "Text Display", icon: "T" }, { kind: KINDS.USER_SELECT, label: "User Select", icon: "👥" }, { kind: KINDS.CHANNEL_SELECT, label: "Channel Select", icon: "#" }, { kind: KINDS.ROLE_SELECT, label: "Role Select", icon: "🛡" }, { kind: KINDS.MENTIONABLE_SELECT, label: "User & Role Select", icon: "@" }, { kind: KINDS.FILE_UPLOAD, label: "File Upload", icon: "📄" }];
  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((v) => !v)} className={cn("inline-flex items-center gap-2 rounded-md bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#4f5ae6]", disabled ? "opacity-50 cursor-not-allowed hover:bg-[#5865F2]" : "")}>Add <span className="text-base leading-none">▾</span></button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#111214] shadow-2xl z-50">
          {items.map((x) => (<button key={x.kind} type="button" onClick={() => { onAdd(x.kind); setOpen(false); }} className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[#DBDEE1] hover:bg-white/5 flex items-center gap-2"><span className="w-5 text-center text-[#B5BAC1]">{x.icon}</span><span className="font-semibold">{x.label}</span></button>))}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-[#DBDEE1]">{label}</div>
      <button type="button" onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition-colors cursor-pointer", value ? "bg-[#5865F2]" : "bg-white/10")} aria-pressed={value}><span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]" style={{ left: value ? 22 : 2 }} /></button>
    </div>
  );
}

function usePortalRoot() { const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); return mounted ? document.body : null; }
function useIsMobile() { const [isMobile, setIsMobile] = useState(false); useEffect(() => { const check = () => setIsMobile(window.innerWidth < 640); check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check); }, []); return isMobile; }

function EmojiPickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const portalRoot = usePortalRoot();
  const isMobile = useIsMobile();
  useEffect(() => { const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc); }, []);
  const pickerUI = (
    <div className={cn("rounded-xl border border-white/10 bg-[#111214] shadow-2xl overflow-hidden", isMobile ? "w-[92vw] max-w-[420px]" : "")} onMouseDown={(e) => e.preventDefault()}>
      <EmojiPicker onEmojiClick={(d) => { onChange(d?.emoji || ""); setOpen(false); }} theme="dark" lazyLoadEmojis height={isMobile ? 420 : 360} width={isMobile ? "100%" : 340} />
      <div className="p-2 border-t border-white/10 flex gap-2"><button type="button" className="flex-1 rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10" onClick={() => setOpen(false)}>Close</button><button type="button" className="flex-1 rounded-md bg-[#2B2D31] px-3 py-2 text-xs font-semibold hover:bg-[#313338]" onClick={() => { onChange(""); setOpen(false); }}>Clear Emoji</button></div>
    </div>
  );
  return (
    <div className="flex items-center gap-2" ref={ref}>
      <button type="button" onClick={() => setOpen(true)} className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-[#1e1f22] ring-1 ring-white/10 hover:bg-white/5 cursor-pointer"><span className="text-base">{value || "🙂"}</span></button>
      {value ? <button type="button" className="rounded-md bg-white/5 px-2 py-2 text-xs font-semibold hover:bg-white/10" onClick={() => onChange("")}>Clear</button> : null}
      {open && portalRoot ? createPortal(<div className={cn("fixed inset-0 z-[9999] flex items-center justify-center p-3", isMobile ? "bg-black/60" : "bg-black/30")} onMouseDown={() => setOpen(false)}><div onMouseDown={(e) => e.stopPropagation()}>{pickerUI}</div></div>, portalRoot) : null}
    </div>
  );
}

/** ========= DnD & Editor ========= */
function SortableComponentCard({ compId }) {
  const { modal, removeComponent, updateComponent } = useBuilderStore();
  const c = modal.components.find((x) => x.id === compId);
  if (!c) return null;
  const canDelete = modal.components.length > 1;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: compId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden", isDragging ? "opacity-70" : "")}>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners} className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[#B5BAC1] cursor-grab active:cursor-grabbing">⋮⋮</div>
          <button type="button" className="inline-flex items-center gap-2 cursor-pointer" onClick={() => updateComponent(c.id, { collapsed: !c.collapsed })}><span className="w-5 text-center text-[#B5BAC1]">{c.collapsed ? "▸" : "▾"}</span><span className="text-sm font-semibold text-[#F2F3F5] truncate">{c.label || "Component"}</span><span className="text-xs text-[#B5BAC1] truncate">{(c.kind)}</span></button>
        </div>
        <button type="button" disabled={!canDelete} onClick={() => canDelete && removeComponent(c.id)} className={cn("h-9 w-9 inline-flex items-center justify-center rounded-md ring-1 ring-white/10 cursor-pointer", canDelete ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-40 cursor-not-allowed")}>🗑</button>
      </div>
      {!c.collapsed && <div className="px-4 pb-4"><ComponentEditor comp={c} /></div>}
    </div>
  );
}

function ComponentsEditor() {
  const { modal, reorder } = useBuilderStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function onDragEnd(event) { const activeId = event.active?.id; const overId = event.over?.id; if (!activeId || !overId) return; reorder(activeId, overId); }
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={modal.components.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">{modal.components.map((c) => <SortableComponentCard key={c.id} compId={c.id} />)}</div>
      </SortableContext>
    </DndContext>
  );
}

function SortableOptionCard({ compId, optId }) {
  const { modal, removeOption, updateOption, setDefaultOption } = useBuilderStore();
  const comp = modal.components.find((x) => x.id === compId);
  const opt = comp?.options?.find((o) => o.id === optId);
  if (!opt) return null;
  const opts = comp.options || [];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: optId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-2xl bg-[#141518] ring-1 ring-white/10 overflow-hidden", isDragging ? "opacity-70" : "")}>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners} className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[#B5BAC1] cursor-grab active:cursor-grabbing">⋮⋮</div>
          <button type="button" className="inline-flex items-center gap-2 cursor-pointer min-w-0" onClick={() => updateOption(compId, optId, { collapsed: !opt.collapsed })}><span className="w-5 text-center text-[#B5BAC1]">{opt.collapsed ? "▸" : "▾"}</span><span className="text-sm font-semibold text-[#F2F3F5] truncate">{opt.label || "Option"}</span></button>
        </div>
        <button type="button" disabled={opts.length <= 1} onClick={() => opts.length > 1 && removeOption(compId, optId)} className={cn("h-9 w-9 inline-flex items-center justify-center rounded-md ring-1 ring-white/10 cursor-pointer", opts.length > 1 ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-40")}>🗑</button>
      </div>
      {!opt.collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-start">
             <div className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Emoji</span><EmojiPickerButton value={opt.emoji || ""} onChange={v => updateOption(compId, optId, { emoji: v })} /></div>
             <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Label</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={opt.label || ""} onChange={e => updateOption(compId, optId, { label: e.target.value })} maxLength={100} /></label>
          </div>
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Value</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={opt.value || ""} onChange={e => updateOption(compId, optId, { value: toSafeCustomId(e.target.value) })} maxLength={100} /></label>
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Description</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={opt.description || ""} onChange={e => updateOption(compId, optId, { description: e.target.value })} maxLength={100} /></label>
          <Toggle label="Default selection" value={!!opt.isDefault} onChange={() => setDefaultOption(compId, optId)} />
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ compId }) {
  const { modal, addOption, reorderOption } = useBuilderStore();
  const comp = modal.components.find((x) => x.id === compId);
  const opts = comp?.options || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function onDragEnd(event) { if (event.active?.id && event.over?.id) reorderOption(compId, event.active.id, event.over.id); }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><div className="text-xs text-[#B5BAC1]">Options ({opts.length}/{MAX_SELECT_OPTIONS})</div><button type="button" disabled={opts.length >= MAX_SELECT_OPTIONS} onClick={() => addOption(compId)} className="rounded-md bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#4f5ae6]">Add Option</button></div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}><SortableContext items={opts.map(o => o.id)} strategy={verticalListSortingStrategy}><div className="space-y-3">{opts.map(o => <SortableOptionCard key={o.id} compId={compId} optId={o.id} />)}</div></SortableContext></DndContext>
    </div>
  );
}

function ComponentEditor({ comp }) {
  const { updateComponent } = useBuilderStore();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Label</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.label} onChange={e => updateComponent(comp.id, { label: e.target.value })} maxLength={45} /></label>
        <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">custom_id</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.custom_id} onChange={e => updateComponent(comp.id, { custom_id: toSafeCustomId(e.target.value) })} /></label>
      </div>
      <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Description</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.description} onChange={e => updateComponent(comp.id, { description: e.target.value })} maxLength={100} /></label>
      {REQUIRED_KINDS.has(comp.kind) && <Toggle label="Required" value={!!comp.required} onChange={v => updateComponent(comp.id, { required: v })} />}
      {comp.kind === KINDS.TEXT_INPUT && (
        <>
          <Toggle label="Multiline" value={comp.style === 2} onChange={v => updateComponent(comp.id, { style: v ? 2 : 1 })} />
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Placeholder</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.placeholder || ""} onChange={e => updateComponent(comp.id, { placeholder: e.target.value })} maxLength={100} /></label>
        </>
      )}
      {comp.kind === KINDS.STRING_SELECT && (
        <>
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Placeholder</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.placeholder || ""} onChange={e => updateComponent(comp.id, { placeholder: e.target.value })} maxLength={100} /></label>
          <OptionsEditor compId={comp.id} />
        </>
      )}
      {comp.kind === KINDS.TEXT_DISPLAY && <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Text</span><textarea className="min-h-[90px] rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.content || ""} onChange={e => updateComponent(comp.id, { content: e.target.value })} /></label>}
    </div>
  );
}

/** ========= PREVIEW COMPONENTS (INTEGRATED) ========= */
function PreviewSelect({ label, description, required, placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">{label}{required && <span className="text-[#ED4245]">*</span>}</div>
      {description && <div className="text-xs text-[#B5BAC1]">{description}</div>}
      <button type="button" onClick={() => setOpen(!open)} className="w-full h-10 flex items-center justify-between gap-2 px-3 rounded-[6px] bg-[#17181b] text-sm text-[#DBDEE1] ring-1 ring-[#3b3d44] outline-none cursor-pointer">
        <span className="truncate text-[#DBDEE1]">{selected ? selected.label : placeholder}</span>
        <span className="text-[#B5BAC1]">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="relative z-50 mt-1 rounded-[6px] border border-[#2B2D31] bg-[#111214] shadow-xl max-h-[200px] overflow-auto">
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} className="px-3 py-2 text-sm text-[#DBDEE1] hover:bg-[#2F3136] cursor-pointer flex justify-between">
              <span>{o.emoji} {o.label}</span>
              {o.value === value && <span className="text-[#5865F2]">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscordPreview({ guildId }) {
  const { modal } = useBuilderStore();
  const [iconUrl, setIconUrl] = useState(null);
  
  // FIX: Fetch Server Icon instead of DOM scraping
  useEffect(() => {
    if (!guildId) return;
    fetch("/api/user/guilds")
      .then(r => r.json())
      .then(guilds => {
        const g = Array.isArray(guilds) ? guilds.find(x => x.id === guildId) : null;
        if (g && g.icon) setIconUrl(`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`);
        else setIconUrl("https://cdn.discordapp.com/embed/avatars/0.png");
      })
      .catch(() => setIconUrl("https://cdn.discordapp.com/embed/avatars/0.png"));
  }, [guildId]);

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl bg-[#2B2D31] ring-1 ring-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
             {iconUrl && <img src={iconUrl} className="h-6 w-6 rounded-full object-cover" alt="" />}
             <div className="font-semibold text-[#F2F3F5] truncate">{modal.title || "Modal"}</div>
          </div>
          <button className="h-8 w-8 flex items-center justify-center rounded text-[#B5BAC1] hover:bg-white/5">✕</button>
        </div>
        {modal.show_warning && <div className="px-5 pb-2 text-xs text-[#DBDEE1] bg-yellow-500/10 p-2 rounded mx-5 border border-yellow-500/20">⚠ This form will be submitted to Bot.</div>}
        <div className="space-y-4 px-5 pb-4">
          {modal.components.map(c => {
             if(c.kind === KINDS.TEXT_INPUT) return (
                 <div key={c.id} className="space-y-1">
                     <div className="text-xs font-semibold text-[#F2F3F5]">{c.label} {c.required && <span className="text-red-400">*</span>}</div>
                     {c.description && <div className="text-xs text-[#B5BAC1]">{c.description}</div>}
                     {c.style === 2 ? <textarea className="w-full h-24 bg-[#1e1f22] rounded p-2 text-sm text-white" placeholder={c.placeholder} /> : <input className="w-full h-10 bg-[#1e1f22] rounded px-2 text-sm text-white" placeholder={c.placeholder} />}
                 </div>
             );
             if(c.kind === KINDS.STRING_SELECT) return <PreviewSelect key={c.id} label={c.label} description={c.description} required={c.required} placeholder={c.placeholder} options={c.options || []} value="" onChange={()=>{}} />;
             return <div key={c.id} className="text-xs text-gray-500">Preview not implemented for {c.kind}</div>;
          })}
        </div>
        <div className="flex gap-3 border-t border-white/10 px-5 py-4">
             <button className="flex-1 rounded bg-transparent hover:underline text-white text-sm">Cancel</button>
             <button className="flex-1 rounded bg-[#5865F2] py-2 text-sm font-semibold text-white">Submit</button>
        </div>
      </div>
    </div>
  );
}

/** ========= PAGE ========= */
export default function ModalBuilderPage() {
  const { guildId } = useParams();
  const { modal, setTitle, setCustomId, setShowWarning, addComponent, setModal, resetModal } = useBuilderStore();
  const [codeMode, setCodeMode] = useState("bot");
  const [copied, setCopied] = useState(false);
  const botCode = useMemo(() => buildBotCode(modal), [modal]);
  const jsonCode = useMemo(() => JSON.stringify(buildDiscordModalJSON(modal), null, 2), [modal]);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [tplMsg, setTplMsg] = useState("");

  useEffect(() => { setTemplates(readTemplates(guildId)); }, [guildId]);
  function onSaveTemplate() { 
      const name = templateName.trim(); 
      if(!name) return; 
      const next = [{ id: nanoid(), name, modal }, ...templates].slice(0, 10);
      setTemplates(next); writeTemplates(guildId, next); setTemplateName(""); setTplMsg("Saved"); setTimeout(()=>setTplMsg(""), 1000);
  }

  // --- NEU: Reset mit Icon und Bestätigung ---
  function onReset() {
      if (window.confirm("Möchtest du das Modal wirklich zurücksetzen?")) {
          resetModal();
      }
  }

  return (
    <div className="w-full text-zinc-100 p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-lg font-bold">Settings</div>
                        <button onClick={onReset} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-sm font-bold text-gray-200 flex items-center gap-2 transition-colors">
                            <RotateCcw className="w-3 h-3"/> Reset
                        </button>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs text-gray-400">Title</label>
                        <input value={modal.title} onChange={e => setTitle(e.target.value)} className="bg-black/20 border border-white/10 rounded p-2 text-white" />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs text-gray-400">Custom ID</label>
                        <input value={modal.custom_id} onChange={e => setCustomId(e.target.value)} className="bg-black/20 border border-white/10 rounded p-2 text-white" />
                    </div>
                    <Toggle label="Warning" value={modal.show_warning} onChange={setShowWarning} />
                    
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-2"><div className="text-xs font-bold text-gray-400">Components</div><AddComponentMenu onAdd={addComponent} disabled={modal.components.length >= 5} /></div>
                        <ComponentsEditor />
                    </div>
                </div>

                {/* Templates */}
                <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="text-sm font-bold">Templates</div>
                    <div className="flex gap-2"><input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Name" className="bg-black/20 border border-white/10 rounded p-2 flex-1" /><button onClick={onSaveTemplate} className="bg-[#5865F2] px-3 rounded text-sm font-bold">Save</button></div>
                    {tplMsg && <div className="text-green-400 text-xs">{tplMsg}</div>}
                    <div className="flex gap-2">
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="bg-black/20 border border-white/10 rounded p-2 flex-1 text-white"><option value="">Load...</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                        <button onClick={()=>{ if(selectedTemplateId) { const t = templates.find(x => x.id === selectedTemplateId); if(t) setModal(t.modal); } }} className="bg-white/10 px-3 rounded text-sm">Load</button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-4">
                    <div className="text-sm font-bold mb-4">Preview</div>
                    <DiscordPreview guildId={guildId} />
                </div>
                <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between">
                        <div className="text-sm font-bold">Code</div>
                        <select value={codeMode} onChange={e => setCodeMode(e.target.value)} className="bg-black/20 text-xs rounded border border-white/10"><option value="bot">Bot Code</option><option value="json">JSON</option></select>
                    </div>
                    <textarea value={codeMode === "bot" ? botCode : jsonCode} readOnly className="w-full h-64 bg-black/30 border border-white/10 rounded p-2 font-mono text-xs text-gray-300" />
                </div>
            </div>
        </div>
    </div>
  );
}