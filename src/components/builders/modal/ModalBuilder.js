"use client";

import React, { useRef, useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// --- KINDS & CONSTANTS ---
const MAX_COMPONENTS = 5;
const MAX_SELECT_OPTIONS = 25;
const KINDS = {
  TEXT_INPUT: "text_input",
  STRING_SELECT: "string_select",
  TEXT_DISPLAY: "text_display",
  USER_SELECT: "user_select",
  CHANNEL_SELECT: "channel_select",
  ROLE_SELECT: "role_select",
  MENTIONABLE_SELECT: "mentionable_select",
  FILE_UPLOAD: "file_upload",
};

function toSafeCustomId(s) {
    const t = String(s ?? "").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_:\-]/g, "").slice(0, 100);
    return t || "id";
}

function defaultComponent(kind) {
  const base = {
    id: nanoid(),
    kind,
    label: kind === KINDS.TEXT_INPUT ? "Text Input" : "Component", // Simplified labels
    custom_id: toSafeCustomId(`input_${nanoid(8)}`),
    required: true,
    collapsed: false, // Default open for better UX in embedded mode? Or true to save space.
    description: "",
  };
  if (kind === KINDS.TEXT_INPUT) return { ...base, style: 1, max_length: 4000, placeholder: "" };
  if (kind === KINDS.STRING_SELECT) return {
      ...base,
      placeholder: "Make a selection",
      min_values: 1, max_values: 1,
      options: [{ id: nanoid(), label: "Option", value: "option_1", description: "", emoji: "", isDefault: true, collapsed: false }]
  };
  if ([KINDS.USER_SELECT, KINDS.CHANNEL_SELECT, KINDS.ROLE_SELECT, KINDS.MENTIONABLE_SELECT].includes(kind)) {
      return { ...base, placeholder: "Select…", min_values: 0, max_values: 1 };
  }
  if (kind === KINDS.TEXT_DISPLAY) return { ...base, required: false, content: "Info Text" };
  return base;
}

// --- SUB-COMPONENTS (Toggle, Menu) ---
function Toggle({ label, value, onChange }) {
  const left = value ? 22 : 2;
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-[#DBDEE1]">{label}</div>
      <button type="button" onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition-colors cursor-pointer", value ? "bg-[#5865F2]" : "bg-white/10")}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]" style={{ left }} />
      </button>
    </div>
  );
}

function AddComponentMenu({ onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
      const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = [
    { kind: KINDS.TEXT_INPUT, label: "Text Input", icon: "☰" },
    { kind: KINDS.STRING_SELECT, label: "Select Menu", icon: "☑" },
    { kind: KINDS.TEXT_DISPLAY, label: "Text Display", icon: "T" },
    { kind: KINDS.USER_SELECT, label: "User Select", icon: "👥" },
    { kind: KINDS.CHANNEL_SELECT, label: "Channel Select", icon: "#" },
    { kind: KINDS.ROLE_SELECT, label: "Role Select", icon: "🛡" },
    { kind: KINDS.MENTIONABLE_SELECT, label: "User & Role", icon: "@" },
    { kind: KINDS.FILE_UPLOAD, label: "File Upload", icon: "📄" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} className={cn("inline-flex items-center gap-2 rounded-md bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#4f5ae6]", disabled && "opacity-50 cursor-not-allowed")}>Add <span className="text-base leading-none">▾</span></button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#111214] shadow-2xl z-50">
          {items.map((x) => (
            <button key={x.kind} type="button" onClick={() => { onAdd(x.kind); setOpen(false); }} className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[#DBDEE1] hover:bg-white/5 flex items-center gap-2">
              <span className="w-5 text-center text-[#B5BAC1]">{x.icon}</span><span className="font-semibold">{x.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- COMPONENT EDITOR ---
function ComponentEditor({ comp, onUpdate }) {
  return (
    <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1 min-w-0"><span className="text-xs text-[#B5BAC1]">Label <span className="text-red-400">*</span></span><input className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} maxLength={45} /></label>
            <label className="grid gap-1 min-w-0"><span className="text-xs text-[#B5BAC1]">custom_id</span><input className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.custom_id || ""} onChange={(e) => onUpdate({ custom_id: toSafeCustomId(e.target.value) })} /></label>
        </div>
        <label className="grid gap-1 min-w-0"><span className="text-xs text-[#B5BAC1]">Description</span><input className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.description || ""} onChange={(e) => onUpdate({ description: e.target.value })} maxLength={100} /></label>
        
        {comp.kind !== KINDS.TEXT_DISPLAY && <Toggle label="Required" value={!!comp.required} onChange={(v) => onUpdate({ required: v })} />}
        
        {comp.kind === KINDS.TEXT_INPUT && (
            <>
                <Toggle label="Multiline" value={comp.style === 2} onChange={(v) => onUpdate({ style: v ? 2 : 1 })} />
                <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Placeholder</span><input className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={comp.placeholder || ""} onChange={(e) => onUpdate({ placeholder: e.target.value })} maxLength={100} /></label>
            </>
        )}
        
        {comp.kind === KINDS.STRING_SELECT && (
             <div className="space-y-2 pt-2 border-t border-white/10">
                 <div className="text-xs text-[#B5BAC1]">Options</div>
                 {(comp.options || []).map((opt, idx) => (
                     <div key={opt.id} className="flex gap-2">
                         <input value={opt.label} onChange={(e) => { const n = [...comp.options]; n[idx].label = e.target.value; onUpdate({ options: n }); }} className="flex-1 rounded-md bg-[#1e1f22] px-2 py-1 text-xs text-white ring-1 ring-white/10" placeholder="Label" />
                         <input value={opt.value} onChange={(e) => { const n = [...comp.options]; n[idx].value = e.target.value; onUpdate({ options: n }); }} className="flex-1 rounded-md bg-[#1e1f22] px-2 py-1 text-xs text-white ring-1 ring-white/10" placeholder="Value" />
                         <button onClick={() => { const n = comp.options.filter((_, i) => i !== idx); onUpdate({ options: n }); }} className="text-red-400 px-2 hover:bg-white/5 rounded">×</button>
                     </div>
                 ))}
                 <button onClick={() => { if(comp.options.length >= MAX_SELECT_OPTIONS) return; onUpdate({ options: [...comp.options, { id: nanoid(), label: "New", value: "new", isDefault: false }] }); }} className="text-xs text-[#5865F2] hover:underline font-bold">+ Add Option</button>
             </div>
        )}
    </div>
  );
}

// --- SORTABLE WRAPPER ---
function SortableComponentCard({ comp, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comp.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden", isDragging && "opacity-70")}>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners} className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[#B5BAC1] cursor-grab active:cursor-grabbing">⋮⋮</div>
          <button type="button" className="inline-flex items-center gap-2 cursor-pointer" onClick={() => onUpdate(comp.id, { collapsed: !comp.collapsed })}>
            <span className="w-5 text-center text-[#B5BAC1]">{comp.collapsed ? "▸" : "▾"}</span>
            <span className="text-sm font-semibold text-[#F2F3F5] truncate">{comp.label || "Component"}</span>
            <span className="text-xs text-[#B5BAC1] truncate ml-1 opacity-60">({comp.kind})</span>
          </button>
        </div>
        <button type="button" onClick={() => onDelete(comp.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 ring-1 ring-white/10 cursor-pointer text-red-300">🗑</button>
      </div>
      {!comp.collapsed && (
        <div className="px-4 pb-4">
          <ComponentEditor comp={comp} onUpdate={(patch) => onUpdate(comp.id, patch)} />
        </div>
      )}
    </div>
  );
}

// --- MAIN EXPORT ---
export default function ModalBuilder({ data, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Helper zum Updaten des "data" Objekts
  const updateModal = (patch) => onChange({ ...data, ...patch });
  
  const addComponent = (kind) => {
      if ((data.components || []).length >= MAX_COMPONENTS) return;
      updateModal({ components: [...(data.components || []), defaultComponent(kind)] });
  };
  
  const updateComponent = (id, patch) => {
      updateModal({ components: (data.components || []).map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };
  
  const removeComponent = (id) => {
      updateModal({ components: (data.components || []).filter((c) => c.id !== id) });
  };
  
  const onDragEnd = (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const arr = [...(data.components || [])];
      const from = arr.findIndex((x) => x.id === active.id);
      const to = arr.findIndex((x) => x.id === over.id);
      if (from < 0 || to < 0) return;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      updateModal({ components: arr });
  };

  return (
    <div className="space-y-6">
       {/* Modal Settings */}
       <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-sm font-semibold border-b border-white/10 pb-2 mb-2">Modal Settings</div>
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">Title <span className="text-red-400">*</span></span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={data.title || ""} onChange={(e) => updateModal({ title: e.target.value })} maxLength={45} /></label>
          <label className="grid gap-1"><span className="text-xs text-[#B5BAC1]">custom_id</span><input className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]" value={data.custom_id || ""} onChange={(e) => updateModal({ custom_id: e.target.value })} /></label>
          <Toggle label="Show warning (debug)" value={!!data.show_warning} onChange={(v) => updateModal({ show_warning: v })} />
       </div>

       {/* Components List */}
       <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="text-xs text-[#B5BAC1]">Components ({(data.components || []).length}/{MAX_COMPONENTS})</div>
              <AddComponentMenu onAdd={addComponent} disabled={(data.components || []).length >= MAX_COMPONENTS} />
          </div>
          
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <SortableContext items={(data.components || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                      {(data.components || []).map((c) => (
                          <SortableComponentCard key={c.id} comp={c} onUpdate={updateComponent} onDelete={removeComponent} />
                      ))}
                  </div>
              </SortableContext>
          </DndContext>
          {(data.components || []).length === 0 && <div className="text-center text-xs text-gray-500 py-4">No components yet. Add one!</div>}
       </div>
    </div>
  );
}