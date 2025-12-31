// src/components/builders/embed/EmbedBuilder.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils"; 
import MarkdownHelpDialog from "@/components/builders/shared/MarkdownHelpDialog";
import { 
  GripVertical, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  User, 
  ImageIcon, 
  Type, 
  PanelBottom,
  Plus,
  Clock,
  Palette,
  Layout,
  Link as LinkIcon,
  Check
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
  // Simple check
  if (t.startsWith("#") && (t.length === 4 || t.length === 7)) return t.toUpperCase();
  if (!t.startsWith("#") && (t.length === 3 || t.length === 6)) return `#${t}`.toUpperCase();
  return "#5865F2";
}

// --- Modern Color Picker Component ---
function ModernColorPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const presets = [
    "#5865F2", // Blurple
    "#57F287", // Green
    "#ED4245", // Red
    "#FEE75C", // Yellow
    "#EB459E", // Fuchsia
    "#FFFFFF", // White
    "#2B2D31", // Dark Grey
    "#000000", // Black
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#111214] border border-white/10 rounded-md px-2 py-1.5 hover:border-white/20 transition-all group"
      >
        <div 
            className="w-5 h-5 rounded-[4px] shadow-sm border border-white/10" 
            style={{ backgroundColor: value }} 
        />
        <span className="font-mono text-xs text-gray-300 group-hover:text-white uppercase">
            {value}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-500 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl p-3 w-56 animate-in fade-in zoom-in-95 duration-100">
           
           <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Presets</div>
           <div className="grid grid-cols-4 gap-2 mb-4">
              {presets.map(color => (
                  <button
                    key={color}
                    onClick={() => { onChange(color); setIsOpen(false); }}
                    className="w-full aspect-square rounded-md border border-white/5 hover:scale-105 transition-transform relative group"
                    style={{ backgroundColor: color }}
                  >
                     {value.toUpperCase() === color && (
                         <div className="absolute inset-0 flex items-center justify-center">
                             <Check className={cn("w-4 h-4 shadow-sm", color === '#FFFFFF' || color === '#FEE75C' || color === '#57F287' ? "text-black" : "text-white")} />
                         </div>
                     )}
                  </button>
              ))}
           </div>

           <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Custom</div>
           <div className="flex gap-2">
              <div className="relative flex-1">
                 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">#</span>
                 <input 
                    value={value.replace('#', '')} 
                    onChange={(e) => onChange(`#${e.target.value}`)}
                    className="w-full bg-[#111214] border border-white/10 rounded-md pl-5 pr-2 py-1.5 text-xs text-white uppercase focus:border-[#5865F2] outline-none"
                    maxLength={6}
                 />
              </div>
              <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10">
                 <input 
                    type="color" 
                    value={toHexColor(value)} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 border-0" 
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- Collapsible Section Component ---
function CollapsibleBuilderSection({ title, icon: Icon, children, defaultOpen = false, extraAction }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAnimationDone, setIsAnimationDone] = useState(defaultOpen);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimationDone(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsAnimationDone(false);
    }
  }, [isOpen]);

  return (
    <div className="border border-white/10 rounded-md bg-[#16171a] transition-all duration-200">
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1e1f22] hover:bg-[#232428] transition-colors rounded-t-md cursor-pointer select-none"
        onClick={(e) => {
            // Prevent collapsing when interacting with inputs in header (if any)
            if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                setIsOpen(!isOpen);
            }
        }}
      >
        <div className="flex items-center gap-2.5 text-gray-200 font-medium text-sm">
          {Icon && <Icon className="w-4 h-4 text-[#5865F2]" />}
          <span>{title}</span>
        </div>
        
        <div className="flex items-center gap-3">
            {extraAction && <div onClick={e => e.stopPropagation()}>{extraAction}</div>}
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-white transition-colors">
                {isOpen ? (
                <ChevronUp className="w-4 h-4" />
                ) : (
                <ChevronDown className="w-4 h-4" />
                )}
            </button>
        </div>
      </div>
      <div
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
        style={{ overflow: isAnimationDone && isOpen ? "visible" : "hidden" }} 
      >
        <div className="p-5 border-t border-white/5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

// --- Toggle Switch ---
function ToggleSwitch({ checked, onChange }) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out border border-transparent",
        checked ? "bg-[#5865F2]" : "bg-[#3f4147]"
      )}
    >
      <div 
        className={cn(
          "w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] shadow-sm transition-transform duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0.5"
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
    <div ref={setNodeRef} style={style} className={cn("rounded-md border bg-[#1e1f22] transition-all overflow-hidden mb-2 group", isDragging ? "border-[#5865F2] shadow-xl ring-1 ring-[#5865F2]" : "border-white/5 hover:border-white/10")}>
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
        
        {/* SECTION 1: GENERAL */}
        <CollapsibleBuilderSection 
            title="Allgemein" 
            icon={Layout} 
            defaultOpen={true}
            extraAction={
                <div className="flex items-center gap-2">
                    <ModernColorPicker 
                        value={toHexColor(data.color)} 
                        onChange={(c) => onChange({...data, color: c})} 
                    />
                    <MarkdownHelpDialog />
                </div>
            }
        >
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Type className="w-3 h-3"/> Embed Titel</label>
                    <input value={data.title || ""} onChange={(e) => onChange({...data, title: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm font-medium text-white focus:border-[#5865F2] outline-none transition-all placeholder:text-gray-600" placeholder="Titel des Embeds" maxLength={256} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Layout className="w-3 h-3"/> Beschreibung</label>
                    <textarea value={data.description || ""} onChange={(e) => onChange({...data, description: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 focus:border-[#5865F2] outline-none transition-all resize-y min-h-[100px] placeholder:text-gray-600 leading-relaxed custom-scrollbar" placeholder="Schreibe hier den Hauptinhalt..." maxLength={4096} />
                </div>
            </div>
        </CollapsibleBuilderSection>

        {/* SECTION 2: AUTHOR */}
        {!hiddenSections.includes('author') && (
            <CollapsibleBuilderSection title="Autor" icon={User} defaultOpen={false}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Autor Name</label>
                        <input value={data.author?.name || ""} onChange={(e) => onChange({...data, author: {...data.author, name: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none" placeholder="Name..." maxLength={256} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Icon URL</label>
                        <input value={data.author?.icon_url || ""} onChange={(e) => onChange({...data, author: {...data.author, icon_url: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                </div>
            </CollapsibleBuilderSection>
        )}

        {/* SECTION 3: IMAGES */}
        {!hiddenSections.includes('images') && (
            <CollapsibleBuilderSection title="Bilder" icon={ImageIcon} defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Thumbnail (Klein rechts)</label>
                        <input value={data.thumbnail_url || ""} onChange={(e) => onChange({...data, thumbnail_url: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Hauptbild (Groß unten)</label>
                        <input value={data.image_url || ""} onChange={(e) => onChange({...data, image_url: e.target.value})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                    </div>
                </div>
            </CollapsibleBuilderSection>
        )}

        {/* SECTION 4: FIELDS */}
        {!hiddenSections.includes('fields') && (
             <CollapsibleBuilderSection 
                title={`Felder (${(data.fields || []).length}/${MAX_FIELDS})`} 
                icon={Layout} 
                defaultOpen={false}
                extraAction={
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); onAddField(); }} 
                        disabled={(data.fields || []).length >= MAX_FIELDS} 
                        className={cn("px-2 py-1 rounded-sm bg-[#5865F2] hover:bg-[#4752c4] text-[10px] font-bold text-white transition flex items-center gap-1", (data.fields || []).length >= MAX_FIELDS && "opacity-50 cursor-not-allowed")}
                    >
                        <Plus className="w-3 h-3"/> Neu
                    </button>
                }
             >
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
                    <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/10 rounded-md bg-white/[0.01]">
                        <span className="text-xs text-gray-500">Keine Felder hinzugefügt.</span>
                    </div>
                )}
            </CollapsibleBuilderSection>
        )}

        {/* SECTION 5: FOOTER */}
        {!hiddenSections.includes('footer') && (
            <CollapsibleBuilderSection title="Footer & Zeitstempel" icon={PanelBottom} defaultOpen={false}>
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-400 pl-1">Footer Text</label>
                            <input value={data.footer?.text || ""} onChange={(e) => onChange({...data, footer: {...data.footer, text: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#5865F2] outline-none" placeholder="Kleingedrucktes..." maxLength={2048} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Footer Icon</label>
                            <input value={data.footer?.icon_url || ""} onChange={(e) => onChange({...data, footer: {...data.footer, icon_url: e.target.value}})} className="w-full bg-[#111214] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-400 focus:border-[#5865F2] outline-none font-mono" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-[#111214] p-3 rounded-md border border-white/5">
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
            </CollapsibleBuilderSection>
        )}

    </div>
  );
}
