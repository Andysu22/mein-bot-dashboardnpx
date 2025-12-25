"use client";

import React from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils"; 

// --- Helpers ---
const MAX_FIELDS = 25;

function defaultField() {
  return {
    id: nanoid(),
    name: "Field title",
    value: "Field value",
    inline: false,
    collapsed: false,
  };
}

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#5865F2";
  return v.toUpperCase();
}

// --- Sortable Field Component ---
function SortableFieldRow({ field, onChange, onDelete, attributes, listeners, setNodeRef, transform, transition, isDragging }) {
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-xl border border-white/10 bg-black/20 p-3 space-y-2", isDragging && "ring-2 ring-[#5865F2]/60")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 cursor-grab ring-1 ring-white/10" {...attributes} {...listeners}>↕</button>
          <div className="text-sm font-bold text-white truncate max-w-[150px]">{field.name || "Field"}</div>
          <span className="text-[11px] text-gray-400">{field.inline ? "inline" : "block"}</span>
        </div>
        <div className="flex items-center gap-2">
            <button type="button" onClick={() => onChange({ ...field, collapsed: !field.collapsed })} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10">{field.collapsed ? "Edit" : "Hide"}</button>
            <button type="button" onClick={() => onDelete(field.id)} className="px-2 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 text-xs font-semibold text-red-200 ring-1 ring-red-500/20">Del</button>
        </div>
      </div>

      {!field.collapsed && (
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Name</label>
            <input value={field.name} onChange={(e) => onChange({ ...field, name: e.target.value })} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" maxLength={256} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Value</label>
            <textarea value={field.value} onChange={(e) => onChange({ ...field, value: e.target.value })} className="w-full min-h-[80px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" maxLength={1024} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input type="checkbox" checked={!!field.inline} onChange={(e) => onChange({ ...field, inline: e.target.checked })} className="accent-[#5865F2]" /> Inline
          </label>
        </div>
      )}
    </div>
  );
}

function SortableField(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.field.id });
  return <SortableFieldRow {...props} attributes={attributes} listeners={listeners} setNodeRef={setNodeRef} transform={transform} transition={transition} isDragging={isDragging} />;
}

// --- MAIN COMPONENT ---
export default function EmbedBuilder({ data, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleChange = (key, value) => {
    onChange({ ...data, [key]: value });
  };

  const handleDeepChange = (parent, key, value) => {
    onChange({ ...data, [parent]: { ...(data[parent] || {}), [key]: value } });
  };

  const onAddField = () => {
    if ((data.fields || []).length >= MAX_FIELDS) return;
    onChange({ ...data, fields: [...(data.fields || []), defaultField()] });
  };

  const onFieldChange = (updatedField) => {
    onChange({
      ...data,
      fields: (data.fields || []).map((f) => (f.id === updatedField.id ? updatedField : f)),
    });
  };

  const onDeleteField = (id) => {
    onChange({ ...data, fields: (data.fields || []).filter((f) => f.id !== id) });
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const arr = [...(data.fields || [])];
    const from = arr.findIndex((x) => x.id === active.id);
    const to = arr.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onChange({ ...data, fields: arr });
  };

  return (
    <div className="space-y-5">
      {/* Title & Description */}
      <div className="space-y-2">
        <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Title</label>
        <input value={data.title || ""} onChange={(e) => handleChange("title", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" maxLength={256} />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Description</label>
        <textarea value={data.description || ""} onChange={(e) => handleChange("description", e.target.value)} className="w-full min-h-[100px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" maxLength={4096} />
      </div>

      {/* Color & Timestamp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={toHexColor(data.color)} onChange={(e) => handleChange("color", e.target.value)} className="h-10 w-12 rounded-md bg-transparent border border-white/10 cursor-pointer" />
            <input value={toHexColor(data.color)} onChange={(e) => handleChange("color", e.target.value)} className="flex-1 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" />
          </div>
        </div>
        <div className="flex items-center pt-6">
             <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
            <input type="checkbox" checked={!!data.timestamp} onChange={(e) => handleChange("timestamp", e.target.checked)} className="accent-[#5865F2]" />
            Show Timestamp
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="text-white font-bold text-sm">Footer</div>
        <div className="grid grid-cols-1 gap-2">
            <input value={data.footer?.text || ""} onChange={(e) => handleDeepChange("footer", "text", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Footer Text" maxLength={2048} />
            <input value={data.footer?.icon_url || ""} onChange={(e) => handleDeepChange("footer", "icon_url", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Footer Icon URL" maxLength={2048} />
        </div>
      </div>

      {/* Fields */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="text-white font-bold text-sm">Fields</div>
            <button type="button" onClick={onAddField} className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:opacity-90 text-xs font-bold text-white transition">+ Add Field</button>
        </div>
        
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={(data.fields || []).map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
                {(data.fields || []).map((field) => (
                <SortableField key={field.id} field={field} onChange={onFieldChange} onDelete={onDeleteField} />
                ))}
            </div>
            </SortableContext>
        </DndContext>
        {(data.fields || []).length === 0 && <div className="text-xs text-gray-500 italic">No fields added yet.</div>}
      </div>
    </div>
  );
}