"use client";

import React, { useState } from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils"; 
import { 
  GripVertical, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  User, 
  ImageIcon, 
  Type, 
  MessageSquare,
  PanelBottom,
  Plus
} from "lucide-react";

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

// --- Toggle Switch ---
function Toggle({ label, value, onChange, size = "md" }) {
  return (
    <div onClick={() => onChange(!value)} className={cn("flex items-center justify-between gap-3 cursor-pointer select-none group", size === "sm" ? "" : "rounded-lg bg-[#111214] border border-white/5 px-3 py-2 hover:border-white/10 transition-colors")}>
      <span className={cn("text-gray-300 font-medium group-hover:text-white transition-colors", size === "sm" ? "text-xs" : "text-sm")}>{label}</span>
      <div
        className={cn(
          "relative rounded-full transition-colors",
          size === "sm" ? "h-4 w-7" : "h-5 w-9",
          value ? "bg-[#5865F2]" : "bg-gray-700"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full bg-white transition-transform shadow-sm",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            value ? (size === "sm" ? "translate-x-3" : "translate-x-4") : "translate-x-0"
          )}
        />
      </div>
    </div>
  );
}

// --- Collapsible Section Component ---
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/5 rounded-xl bg-[#1e1f22] overflow-hidden transition-all hover:border-white/10">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="font-bold text-sm text-gray-200">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// --- Sortable Field Component ---
function SortableFieldRow({ field, onChange, onDelete, attributes, listeners, setNodeRef, transform, transition, isDragging }) {
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : "auto", position: "relative" };

  return (
    <div ref={setNodeRef} style={style} className={cn("group rounded-xl border bg-[#111214] transition-all overflow-hidden", isDragging ? "border-[#5865F2] shadow-lg scale-[1.02]" : "border-white/5 hover:border-white/10")}>
      
      {/* Header Row */}
      <div className="flex items-center gap-3 p-3 bg-white/[0.02]">
        {/* Drag Handle */}
        <button type="button" className="touch-none p-1 text-gray-500 hover:text-gray-300 active:cursor-grabbing hover:bg-white/5 rounded transition-colors cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Collapse Toggle (Arrow) */}
        <button 
          type="button" 
          onClick={() => onChange({ ...field, collapsed: !field.collapsed })}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
        >
          {field.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Field Name Preview */}
        <div className="flex-1 font-medium text-sm text-gray-200 truncate select-none cursor-pointer" onClick={() => onChange({ ...field, collapsed: !field.collapsed })}>
          {field.name || <span className="text-gray-600 italic">Unbenanntes Feld</span>}
        </div>

        {/* Delete Action */}
        <button type="button" onClick={() => onDelete(field.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Feld löschen">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded Content */}
      {!field.collapsed && (
        <div className="p-3 space-y-3 border-t border-white/5 bg-black/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Name</label>
               <input 
                 value={field.name} 
                 onChange={(e) => onChange({ ...field, name: e.target.value })} 
                 className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" 
                 placeholder="Feld Titel"
                 maxLength={256} 
               />
             </div>
             <div className="space-y-1.5 flex flex-col justify-end pb-0.5">
               <Toggle 
                 label="Inline anzeigen" 
                 size="sm"
                 value={!!field.inline} 
                 onChange={(v) => onChange({ ...field, inline: v })} 
               />
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Wert</label>
            <textarea 
              value={field.value} 
              onChange={(e) => onChange({ ...field, value: e.target.value })} 
              className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors min-h-[80px] resize-y" 
              placeholder="Feld Inhalt..."
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

  const isThumbnailEnabled = !!data.thumbnail_url; 
  const toggleThumbnail = (enabled) => {
      if (enabled) {
          handleChange("thumbnail_url", "{user_avatar}");
      } else {
          handleChange("thumbnail_url", "");
      }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. General Info Section */}
      <CollapsibleSection title="Allgemeine Informationen" icon={MessageSquare} defaultOpen={true}>
        <div className="space-y-3">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Embed Titel</label>
                <input 
                    value={data.title || ""} 
                    onChange={(e) => handleChange("title", e.target.value)} 
                    className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-[#5865F2] outline-none transition-colors" 
                    placeholder="Titel des Embeds"
                    maxLength={256} 
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Beschreibung</label>
                <textarea 
                    value={data.description || ""} 
                    onChange={(e) => handleChange("description", e.target.value)} 
                    className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors min-h-[100px]" 
                    placeholder="Beschreibungstext..."
                    maxLength={4096} 
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Farbe</label>
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-10 rounded-lg border border-white/10 overflow-hidden relative cursor-pointer shadow-sm">
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
                            className="flex-1 bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-[#5865F2] outline-none transition-colors uppercase" 
                        />
                    </div>
                </div>
                <div className="flex items-end pb-0.5">
                    <Toggle 
                        label="Zeitstempel anzeigen" 
                        value={!!data.timestamp} 
                        onChange={(v) => handleChange("timestamp", v)} 
                    />
                </div>
            </div>
        </div>
      </CollapsibleSection>

      {/* 2. Author Section */}
      <CollapsibleSection title="Autor" icon={User}>
        <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Name</label>
                <input value={data.author?.name || ""} onChange={(e) => handleDeepChange("author", "name", e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" placeholder="Name des Autors" maxLength={256} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Icon URL</label>
                <input value={data.author?.icon_url || ""} onChange={(e) => handleDeepChange("author", "icon_url", e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" placeholder="https://..." maxLength={2048} />
            </div>
        </div>
      </CollapsibleSection>

      {/* 3. Media Section */}
      <CollapsibleSection title="Bilder & Medien" icon={ImageIcon}>
         <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#111214] border border-white/5">
                <Toggle 
                    label="User Thumbnail anzeigen (oben rechts)" 
                    value={isThumbnailEnabled} 
                    onChange={toggleThumbnail} 
                />
                <p className="text-[10px] text-gray-500 mt-2 px-1">Zeigt das Profilbild des Users an, der das Ticket öffnet.</p>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Großes Bild URL (Unten)</label>
                <input 
                    value={data.image_url || ""} 
                    onChange={(e) => handleChange("image_url", e.target.value)} 
                    className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" 
                    placeholder="https://..." 
                    maxLength={2048} 
                />
            </div>
         </div>
      </CollapsibleSection>

      {/* 4. Footer Section */}
      <CollapsibleSection title="Footer" icon={PanelBottom}>
        <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Text</label>
                <input value={data.footer?.text || ""} onChange={(e) => handleDeepChange("footer", "text", e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" placeholder="Footer Text" maxLength={2048} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider pl-1">Icon URL</label>
                <input value={data.footer?.icon_url || ""} onChange={(e) => handleDeepChange("footer", "icon_url", e.target.value)} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-colors" placeholder="https://..." maxLength={2048} />
            </div>
        </div>
      </CollapsibleSection>

      {/* 5. Fields Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#5865F2]"/>
                <span className="text-white font-bold text-sm">Felder</span>
                <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded ml-1">{ (data.fields || []).length }/{MAX_FIELDS}</span>
            </div>
            <button 
                type="button" 
                onClick={onAddField} 
                disabled={(data.fields || []).length >= MAX_FIELDS}
                className={cn("px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm", (data.fields || []).length >= MAX_FIELDS && "opacity-50 cursor-not-allowed")}
            >
                <Plus className="w-3.5 h-3.5"/> Feld hinzufügen
            </button>
        </div>
        
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={(data.fields || []).map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
                {(data.fields || []).map((field) => (
                <SortableField key={field.id} field={field} onChange={onFieldChange} onDelete={onDeleteField} />
                ))}
            </div>
            </SortableContext>
        </DndContext>
        
        {(data.fields || []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                <Type className="w-8 h-8 text-gray-600 mb-2 opacity-50"/>
                <div className="text-xs text-gray-500">Keine Felder hinzugefügt.</div>
            </div>
        )}
      </div>
    </div>
  );
}