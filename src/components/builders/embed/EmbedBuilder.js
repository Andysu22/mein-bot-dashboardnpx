"use client";

import React from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils"; 
import { GripVertical, Trash2 } from "lucide-react";

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

// --- Toggle Component ---
function Toggle({ label, value, onChange, size = "md" }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", size === "sm" ? "" : "rounded-lg bg-[#1e1f22] border border-white/5 px-3 py-2")}>
      <span className={cn("text-gray-300 font-medium", size === "sm" ? "text-xs" : "text-sm")}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-1 focus:ring-offset-black",
          size === "sm" ? "h-4 w-7" : "h-5 w-9",
          value ? "bg-[#5865F2]" : "bg-gray-600"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full bg-white transition-transform shadow-sm",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            value ? (size === "sm" ? "translate-x-3" : "translate-x-4") : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

// --- Sortable Field Component ---
function SortableFieldRow({ field, onChange, onDelete, attributes, listeners, setNodeRef, transform, transition, isDragging }) {
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={cn("group rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 hover:border-white/20 transition-colors", isDragging && "ring-2 ring-[#5865F2]/60 bg-black/40")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <button type="button" className="touch-none p-1 text-gray-500 hover:text-gray-300 active:cursor-grabbing rounded hover:bg-white/5 transition-colors" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="text-sm font-bold text-white truncate max-w-[150px]">{field.name || "Field"}</div>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Inline Switch direkt im Header */}
           <Toggle 
             label="Inline" 
             size="sm"
             value={!!field.inline} 
             onChange={(v) => onChange({ ...field, inline: v })} 
           />
           <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
           <button type="button" onClick={() => onChange({ ...field, collapsed: !field.collapsed })} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 ring-1 ring-white/10 transition-all">
             {field.collapsed ? "Edit" : "Hide"}
           </button>
           <button type="button" onClick={() => onDelete(field.id)} className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-200 ring-1 ring-red-500/20 transition-all" title="Delete Field">
             <Trash2 className="h-3.5 w-3.5" />
           </button>
        </div>
      </div>

      {!field.collapsed && (
        <div className="space-y-3 pt-2 border-t border-white/5 mt-1 animate-in slide-in-from-top-1 duration-200">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Field Name</label>
            <input 
              value={field.name} 
              onChange={(e) => onChange({ ...field, name: e.target.value })} 
              className="w-full rounded-lg bg-[#1e1f22] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all placeholder:text-gray-600" 
              placeholder="e.g. Server Status"
              maxLength={256} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Field Value</label>
            <textarea 
              value={field.value} 
              onChange={(e) => onChange({ ...field, value: e.target.value })} 
              className="w-full min-h-[80px] rounded-lg bg-[#1e1f22] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all placeholder:text-gray-600" 
              placeholder="e.g. Online ✅"
              maxLength={1024} 
            />
          </div>
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

  // UPDATE: Vereinfachte Logik nur für {user_avatar}
  // Wir prüfen, ob die URL existiert. Wenn ja, ist der Switch an.
  const isThumbnailEnabled = !!data.thumbnail_url; 

  const toggleThumbnail = (enabled) => {
      if (enabled) {
          // Automatisch auf die Variable setzen, keine manuelle Eingabe mehr
          handleChange("thumbnail_url", "{user_avatar}");
      } else {
          handleChange("thumbnail_url", "");
      }
  };

  return (
    <div className="space-y-5">
      {/* Title & Description */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Title</label>
          <input 
            value={data.title || ""} 
            onChange={(e) => handleChange("title", e.target.value)} 
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] font-bold placeholder:text-gray-600" 
            placeholder="Embed Title"
            maxLength={256} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Description</label>
          <textarea 
            value={data.description || ""} 
            onChange={(e) => handleChange("description", e.target.value)} 
            className="w-full min-h-[100px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] placeholder:text-gray-600" 
            placeholder="Write your message here..."
            maxLength={4096} 
          />
        </div>
      </div>

      {/* Color & Timestamp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Color</label>
          <div className="flex items-center gap-2">
            <div className="h-10 w-12 rounded-lg border border-white/10 overflow-hidden relative cursor-pointer">
                <input 
                    type="color" 
                    value={toHexColor(data.color)} 
                    onChange={(e) => handleChange("color", e.target.value)} 
                    className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0" 
                />
            </div>
            <input 
                value={toHexColor(data.color)} 
                onChange={(e) => handleChange("color", e.target.value)} 
                className="flex-1 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] font-mono" 
            />
          </div>
        </div>
        
        <div className="flex items-end pb-1">
            <Toggle 
                label="Show Timestamp" 
                value={!!data.timestamp} 
                onChange={(v) => handleChange("timestamp", v)} 
            />
        </div>
      </div>

      {/* Media: Thumbnail & Image */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="text-white font-bold text-sm flex items-center gap-2">
            Media 
            <span className="text-gray-500 text-xs font-normal">(Images & Thumbnails)</span>
        </div>
        
        {/* UPDATE: Nur noch der Toggle, kein Input mehr */}
        <div className="space-y-2">
            <Toggle 
                label="User Thumbnail anzeigen (oben rechts)" 
                value={isThumbnailEnabled} 
                onChange={toggleThumbnail} 
            />
        </div>

        {/* Image URL */}
        <div className="space-y-1 pt-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Big Image URL (Bottom)</label>
            <input 
                value={data.image_url || ""} 
                onChange={(e) => handleChange("image_url", e.target.value)} 
                className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2] placeholder:text-gray-600" 
                placeholder="https://..." 
                maxLength={2048} 
            />
        </div>
      </div>

      {/* Author */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="text-white font-bold text-sm">Author</div>
        <div className="grid grid-cols-1 gap-3">
            <input value={data.author?.name || ""} onChange={(e) => handleDeepChange("author", "name", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Author Name" maxLength={256} />
            <input value={data.author?.icon_url || ""} onChange={(e) => handleDeepChange("author", "icon_url", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Author Icon URL" maxLength={2048} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="text-white font-bold text-sm">Footer</div>
        <div className="grid grid-cols-1 gap-3">
            <input value={data.footer?.text || ""} onChange={(e) => handleDeepChange("footer", "text", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Footer Text" maxLength={2048} />
            <input value={data.footer?.icon_url || ""} onChange={(e) => handleDeepChange("footer", "icon_url", e.target.value)} className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]" placeholder="Footer Icon URL" maxLength={2048} />
        </div>
      </div>

      {/* Fields */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="text-white font-bold text-sm">Fields ({ (data.fields || []).length }/{MAX_FIELDS})</div>
            <button 
                type="button" 
                onClick={onAddField} 
                disabled={(data.fields || []).length >= MAX_FIELDS}
                className={cn("px-3 py-1.5 rounded-lg bg-[#5865F2] hover:opacity-90 text-xs font-bold text-white transition flex items-center gap-1", (data.fields || []).length >= MAX_FIELDS && "opacity-50 cursor-not-allowed")}
            >
                + Add Field
            </button>
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
        {(data.fields || []).length === 0 && <div className="text-xs text-gray-500 italic text-center py-2 border border-dashed border-white/10 rounded-lg">No fields added yet.</div>}
      </div>
    </div>
  );
}