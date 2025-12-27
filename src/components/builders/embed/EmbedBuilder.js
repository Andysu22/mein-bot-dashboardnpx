"use client";

import React from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
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
  PanelBottom,
  Plus,
  Clock,
  Palette,
  Layout,
  Link as LinkIcon
} from "lucide-react";

// --- Helpers ---
const MAX_FIELDS = 25;

function defaultField() {
  return {
    id: nanoid(),
    name: "",
    value: "",
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
function ToggleSwitch({ checked, onChange }) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out border border-transparent",
        checked ? "bg-[#5865F2]" : "bg-[#3f4147]"
      )}
    >
      <div 
        className={cn(
          "w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] shadow-sm transition-transform duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </div>
  );
}

// --- Sortable Field Row ---
function SortableFieldRow({ field, onChange, onDelete, listeners, attributes, setNodeRef, transform, transition, isDragging }) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg border bg-[#1e1f22] transition-all overflow-hidden mb-3 group", isDragging ? "border-[#5865F2] shadow-xl ring-1 ring-[#5865F2]" : "border-white/5 hover:border-white/10")}>
      <div className="flex items-center gap-3 p-3 cursor-pointer select-none bg-[#2b2d31]/50 hover:bg-[#2b2d31]" onClick={() => onChange({ ...field, collapsed: !field.collapsed })}>
        <button type="button" className="touch-none text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2">
             <span className={cn("text-xs font-bold truncate", field.name ? "text-gray-200" : "text-gray-500 italic")}>
                {field.name || "Unbenanntes Feld"}
             </span>
             {field.inline && <span className="text-[9px] uppercase font-bold bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.5 rounded-[3px]">Inline</span>}
           </div>
        </div>
        <div className="flex items-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(field.id); }} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" />
            </button>
            <div className="text-gray-500">
                {field.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
        </div>
      </div>
      {!field.collapsed && (
        <div className="p-4 space-y-4 border-t border-white/5">
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Titel</label>
                    <input value={field.name} onChange={(e) => onChange({...field, name: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-all placeholder:text-gray-600" placeholder="Feld Name..." maxLength={256} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Inhalt</label>
                    <textarea value={field.value} onChange={(e) => onChange({...field, value: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none transition-all resize-y min-h-[80px] placeholder:text-gray-600" placeholder="Was soll hier stehen?" maxLength={1024} />
                </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-300">Inline Anzeigen</span>
                    <span className="text-[10px] text-gray-500">Zeigt dieses Feld neben dem vorherigen an.</span>
                </div>
                <ToggleSwitch checked={field.inline} onChange={(v) => onChange({...field, inline: v})} />
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

// --- MAIN BUILDER ---
// HIER: hiddenSections als Prop hinzugefügt (Default ist leeres Array = zeige alles)
export default function EmbedBuilder({ data, onChange, hiddenSections = [] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = (data.fields || []).findIndex((f) => f.id === active.id);
    const newIndex = (data.fields || []).findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
        onChange({ ...data, fields: arrayMove(data.fields, oldIndex, newIndex) });
    }
  };

  const onAddField = () => {
      if ((data.fields || []).length >= MAX_FIELDS) return;
      onChange({ ...data, fields: [...(data.fields || []), defaultField()] });
  };

  const onFieldChange = (f) => onChange({ ...data, fields: data.fields.map(x => x.id === f.id ? f : x) });
  const onDeleteField = (id) => onChange({ ...data, fields: data.fields.filter(x => x.id !== id) });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl mx-auto">
        
        {/* SECTION 1: GENERAL (Always visible) */}
        <div className="bg-[#1e1f22] rounded-xl border border-white/5 overflow-hidden">
            <div className="bg-[#2b2d31] px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[#5865F2]"/> Allgemein
                </h3>
                
                <div className="flex items-center gap-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Farbe</label>
                    <div className="relative flex items-center gap-2 bg-[#111214] p-1 rounded-md border border-white/10">
                        <input type="color" value={toHexColor(data.color)} onChange={(e) => onChange({...data, color: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" />
                        <input value={data.color || "#5865F2"} onChange={(e) => onChange({...data, color: e.target.value})} className="w-16 bg-transparent text-xs font-mono text-white outline-none uppercase" maxLength={7} />
                    </div>
                </div>
            </div>
            <div className="p-5 grid gap-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Type className="w-3 h-3"/> Embed Titel</label>
                    <input value={data.title || ""} onChange={(e) => onChange({...data, title: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-2.5 text-sm font-bold text-white focus:border-[#5865F2] outline-none transition-all placeholder:text-gray-600" placeholder="Titel des Embeds" maxLength={256} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Layout className="w-3 h-3"/> Beschreibung</label>
                    <textarea value={data.description || ""} onChange={(e) => onChange({...data, description: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-300 focus:border-[#5865F2] outline-none transition-all resize-y min-h-[100px] placeholder:text-gray-600 leading-relaxed" placeholder="Schreibe hier den Hauptinhalt..." maxLength={4096} />
                </div>
            </div>
        </div>

        {/* SECTION 2: AUTHOR (Conditional) */}
        {!hiddenSections.includes('author') && (
            <div className="bg-[#1e1f22] rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-[#2b2d31] px-4 py-3 border-b border-white/5">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-400"/> Autor (Oben)
                    </h3>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Autor Name</label>
                        <input value={data.author?.name || ""} onChange={(e) => onChange({...data, author: {...data.author, name: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white focus:border-[#5865F2] outline-none" placeholder="Name..." maxLength={256} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Icon URL</label>
                        <input value={data.author?.icon_url || ""} onChange={(e) => onChange({...data, author: {...data.author, icon_url: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                </div>
            </div>
        )}

        {/* SECTION 3: IMAGES (Conditional) */}
        {!hiddenSections.includes('images') && (
            <div className="bg-[#1e1f22] rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-[#2b2d31] px-4 py-3 border-b border-white/5">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-green-400"/> Bilder
                    </h3>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Thumbnail (Klein rechts)</label>
                        <input value={data.thumbnail_url || ""} onChange={(e) => onChange({...data, thumbnail_url: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Hauptbild (Groß unten)</label>
                        <input value={data.image_url || ""} onChange={(e) => onChange({...data, image_url: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                </div>
            </div>
        )}

        {/* SECTION 4: FIELDS (Conditional) */}
        {!hiddenSections.includes('fields') && (
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layout className="w-4 h-4 text-blue-400"/> Felder
                        <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{(data.fields || []).length}/{MAX_FIELDS}</span>
                    </h3>
                    <button type="button" onClick={onAddField} disabled={(data.fields || []).length >= MAX_FIELDS} className={cn("px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752c4] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm", (data.fields || []).length >= MAX_FIELDS && "opacity-50 cursor-not-allowed")}>
                        <Plus className="w-3.5 h-3.5"/> Feld hinzufügen
                    </button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={(data.fields || []).map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col">
                        {(data.fields || []).map((field) => (
                            <SortableField key={field.id} field={field} onChange={onFieldChange} onDelete={onDeleteField} />
                        ))}
                    </div>
                    </SortableContext>
                </DndContext>
                {(data.fields || []).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                        <span className="text-xs text-gray-500">Keine Felder hinzugefügt.</span>
                    </div>
                )}
            </div>
        )}

        {/* SECTION 5: FOOTER (Conditional) */}
        {!hiddenSections.includes('footer') && (
            <div className="bg-[#1e1f22] rounded-xl border border-white/5 overflow-hidden">
                <div className="bg-[#2b2d31] px-4 py-3 border-b border-white/5">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <PanelBottom className="w-4 h-4 text-purple-400"/> Footer & Zeit
                    </h3>
                </div>
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Footer Text</label>
                            <input value={data.footer?.text || ""} onChange={(e) => onChange({...data, footer: {...data.footer, text: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs font-medium text-white focus:border-[#5865F2] outline-none" placeholder="Kleingedrucktes..." maxLength={2048} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Footer Icon</label>
                            <input value={data.footer?.icon_url || ""} onChange={(e) => onChange({...data, footer: {...data.footer, icon_url: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-[#111214] p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#1e1f22] rounded-md text-gray-400"><Clock className="w-4 h-4" /></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-200 uppercase">Zeitstempel</span>
                                <span className="text-[10px] text-gray-500">Zeigt das aktuelle Datum unten im Footer an.</span>
                            </div>
                        </div>
                        <ToggleSwitch checked={!!data.timestamp} onChange={(v) => onChange({ ...data, timestamp: v })} />
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}