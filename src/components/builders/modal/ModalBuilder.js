"use client";

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable, 
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils"; 
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  TextCursor, 
  List, 
  Check,
  Type,
  Smile,
  Hash,
  AlignLeft,
  MoreHorizontal
} from "lucide-react";

// --- CONFIG ---
const MAX_COMPONENTS = 5;
const MAX_OPTIONS = 25;

// --- HELPERS ---
function defaultComponent(kind = "text_input") {
  return {
    id: nanoid(),
    kind, // 'text_input' | 'string_select'
    custom_id: nanoid(10),
    label: kind === "text_input" ? "Neue Frage" : "Neues Menü",
    style: 1, // 1 = Short, 2 = Paragraph
    required: true,
    placeholder: "",
    description: "", // NEU: Standardwert
    min_length: 0,
    max_length: 1000,
    options: kind === "string_select" ? [
        { id: nanoid(), label: "Option 1", value: "opt_1", description: "", emoji: "" }
    ] : [], 
    collapsed: false,
  };
}

// --- COMPONENTS ---

// 1. Add Field Dropdown Menu
function AddFieldMenu({ onAdd, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleSelect = (kind) => {
        onAdd(kind);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-md text-sm font-medium transition-all shadow-sm",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-[#5865F2]"
                )}
            >
                <Plus className="w-4 h-4" />
                <span>Hinzufügen</span>
                <ChevronDown className={cn("w-3.5 h-3.5 ml-1 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#111214] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-1.5 space-y-1">
                        <button 
                            onClick={() => handleSelect('text_input')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5865F2] hover:text-white text-gray-300 rounded-md transition-colors group text-left"
                        >
                            <div className="p-1.5 bg-[#1e1f22] rounded group-hover:bg-white/20">
                                <TextCursor className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold">Textfeld</div>
                                <div className="text-[10px] opacity-70"></div>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => handleSelect('string_select')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5865F2] hover:text-white text-gray-300 rounded-md transition-colors group text-left"
                        >
                            <div className="p-1.5 bg-[#1e1f22] rounded group-hover:bg-white/20">
                                <List className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold">Auswahlmenü</div>
                                <div className="text-[10px] opacity-70"></div>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// 2. Sortable Option Row (Inner)
function SortableOptionRow({ option, onChange, onDelete, attributes, listeners, setNodeRef, transform, transition, isDragging }) {
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition, 
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 999 : "auto"
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("group flex items-start gap-3 bg-[#1e1f22] border border-white/5 p-3 rounded-lg mb-2 transition-all hover:border-white/10 hover:bg-[#232428]", isDragging && "border-[#5865F2] shadow-lg ring-1 ring-[#5865F2] bg-[#2b2d31]")}>
            {/* Drag Handle */}
            <button 
                type="button" 
                className="mt-3 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
                {...attributes} 
                {...listeners}
            >
                <GripVertical className="w-4 h-4" />
            </button>

            {/* Inputs Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {/* Row 1: Label & Value */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5">Label (Name)</label>
                    <input 
                        value={option.label} 
                        onChange={(e) => onChange({...option, label: e.target.value})} 
                        className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:border-[#5865F2] outline-none transition-colors"
                        placeholder="Option Name"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5">Value (Intern)</label>
                    <input 
                        value={option.value} 
                        onChange={(e) => onChange({...option, value: e.target.value})} 
                        className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs font-mono text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
                        placeholder="option_value"
                    />
                </div>

                {/* Row 2: Description & Emoji */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Beschreibung</label>
                    <input 
                        value={option.description || ""} 
                        onChange={(e) => onChange({...option, description: e.target.value})} 
                        className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
                        placeholder="Zusatztext (optional)"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5 flex items-center gap-1"><Smile className="w-3 h-3"/> Emoji</label>
                    <input 
                        value={option.emoji || ""} 
                        onChange={(e) => onChange({...option, emoji: e.target.value})} 
                        className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
                        placeholder="🚀"
                    />
                </div>
            </div>

            {/* Delete Button */}
            <button 
                type="button" 
                onClick={() => onDelete(option.id)} 
                className="mt-3 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Option löschen"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

function SortableOptionItem(props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.option.id });
    return <SortableOptionRow {...props} attributes={attributes} listeners={listeners} setNodeRef={setNodeRef} transform={transform} transition={transition} isDragging={isDragging} />;
}

// 3. Option List Container
function OptionListEditor({ options, onChange }) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = options.findIndex(o => o.id === active.id);
        const newIndex = options.findIndex(o => o.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
            onChange(arrayMove(options, oldIndex, newIndex));
        }
    };

    const handleChange = (newOpt) => onChange(options.map(o => o.id === newOpt.id ? newOpt : o));
    const handleDelete = (id) => onChange(options.filter(o => o.id !== id));
    
    const handleAdd = () => {
        if (options.length >= MAX_OPTIONS) return;
        onChange([...options, { id: nanoid(), label: "New Option", value: "new_val", description: "", emoji: "" }]);
    };

    return (
        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                        Antwort-Möglichkeiten
                    </label>
                    <span className="text-[10px] text-gray-500">Definiere die Optionen für das Dropdown.</span>
                </div>
                <button 
                    type="button"
                    onClick={handleAdd}
                    disabled={options.length >= MAX_OPTIONS}
                    className="text-xs bg-[#5865F2]/10 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none font-medium"
                >
                    <Plus className="w-3.5 h-3.5"/> Option
                </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col">
                        {options.map(opt => (
                            <SortableOptionItem key={opt.id} option={opt} onChange={handleChange} onDelete={handleDelete} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            
            {options.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-500 bg-[#111214] rounded-lg border border-dashed border-white/5 flex flex-col items-center gap-2">
                    <List className="w-6 h-6 opacity-20"/>
                    <span>Keine Optionen vorhanden.</span>
                </div>
            )}
            
            <div className="text-[10px] text-gray-600 text-right pr-1">
                {options.length} / {MAX_OPTIONS} Optionen
            </div>
        </div>
    );
}

// 4. Component Row (Outer)
function SortableComponentRow({ component, onChange, onDelete, attributes, listeners, setNodeRef, transform, transition, isDragging }) {
  const style = { 
      transform: CSS.Transform.toString(transform), 
      transition, 
      opacity: isDragging ? 0.5 : 1, 
      position: "relative", 
      zIndex: isDragging ? 50 : "auto" 
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-xl border bg-[#1a1b1e] transition-all overflow-hidden mb-4", isDragging ? "border-[#5865F2] shadow-xl ring-1 ring-[#5865F2]" : "border-white/5 hover:border-white/10")}>
      
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-[#2b2d31]/30 border-b border-white/5 select-none">
        <button type="button" className="touch-none p-2 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 cursor-pointer flex items-center gap-4" onClick={() => onChange({ ...component, collapsed: !component.collapsed })}>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border bg-gradient-to-br shadow-inner", component.kind === 'text_input' ? "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400" : "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400")}>
                {component.kind === 'text_input' ? <TextCursor className="w-5 h-5"/> : <List className="w-5 h-5"/>}
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-gray-100">{component.label || "Unbenanntes Feld"}</span>
                <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
                    {component.kind === 'text_input' ? "Text Input" : "Selection Menu"}
                    <span className="w-1 h-1 rounded-full bg-gray-700"/>
                    <span className="text-gray-600">ID:</span> {component.custom_id}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-1">
            <button type="button" onClick={() => onChange({ ...component, collapsed: !component.collapsed })} className="p-2 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors">
                {component.collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button type="button" onClick={() => onDelete(component.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1">
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Body */}
      {!component.collapsed && (
        <div className="p-5 bg-[#18191c]">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Type className="w-3.5 h-3.5"/> Frage / Label</label>
                        <input 
                            value={component.label} 
                            onChange={(e) => onChange({...component, label: e.target.value})} 
                            className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                            maxLength={45}
                            placeholder="Was möchtest du wissen?"
                        />
                    </div>
                    {/* HIER HABE ICH PLACEHOLDER & DESCRIPTION EINGEFÜGT */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><MoreHorizontal className="w-3.5 h-3.5"/> Placeholder</label>
                        <input 
                            value={component.placeholder || ""} 
                            onChange={(e) => onChange({...component, placeholder: e.target.value})} 
                            className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                            maxLength={100}
                            placeholder="Beispiel-Antwort..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> Beschreibung (Optional)</label>
                        <input 
                            value={component.description || ""} 
                            onChange={(e) => onChange({...component, description: e.target.value})} 
                            className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                            maxLength={100}
                            placeholder="Zusatzinfo unter dem Label..."
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/> Custom ID</label>
                        <input 
                            value={component.custom_id} 
                            onChange={(e) => onChange({...component, custom_id: e.target.value})} 
                            className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-300 focus:border-[#5865F2] outline-none transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                            maxLength={100}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 px-1">
                        <div 
                            onClick={() => onChange({...component, required: !component.required})}
                            className="flex items-center gap-3 cursor-pointer group select-none"
                        >
                            <div className={cn("w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all shadow-sm", component.required ? "bg-[#5865F2] border-[#5865F2]" : "border-gray-600 bg-[#111214] group-hover:border-gray-400")}>
                                {component.required && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                            <span className={cn("text-xs font-medium group-hover:text-white transition-colors", component.required ? "text-white" : "text-gray-400")}>Pflichtfeld</span>
                        </div>

                        {component.kind === 'text_input' && (
                            <div className="flex bg-[#111214] p-1 rounded-lg border border-white/10">
                                <button onClick={() => onChange({...component, style: 1})} className={cn("px-4 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all", component.style === 1 ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/5")}>Kurz</button>
                                <button onClick={() => onChange({...component, style: 2})} className={cn("px-4 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all", component.style === 2 ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/5")}>Lang</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Options Editor (Only for Select) */}
            {component.kind === 'string_select' && (
                <OptionListEditor 
                    options={component.options || []} 
                    onChange={(newOpts) => onChange({ ...component, options: newOpts })} 
                />
            )}
        </div>
      )}
    </div>
  );
}

function SortableComponentItem(props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.component.id });
    return <SortableComponentRow {...props} attributes={attributes} listeners={listeners} setNodeRef={setNodeRef} transform={transform} transition={transition} isDragging={isDragging} />;
}

// --- MAIN BUILDER ---
export default function ModalBuilder({ data, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = (data.components || []).findIndex(c => c.id === active.id);
    const newIndex = (data.components || []).findIndex(c => c.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
        onChange({ ...data, components: arrayMove(data.components, oldIndex, newIndex) });
    }
  };

  const addComp = (kind) => {
      if ((data.components || []).length >= MAX_COMPONENTS) return;
      onChange({ ...data, components: [...(data.components || []), defaultComponent(kind)] });
  };

  const changeComp = (c) => onChange({ ...data, components: data.components.map(x => x.id === c.id ? c : x) });
  const delComp = (id) => onChange({ ...data, components: data.components.filter(x => x.id !== id) });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* Title Input */}
        <div className="bg-[#1e1f22] p-6 rounded-xl border border-white/5 shadow-sm">
            <div className="space-y-2">
                <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-[#5865F2]" /> Fenstertitel
                </label>
                <input 
                    value={data.title || ""} 
                    onChange={(e) => onChange({...data, title: e.target.value})} 
                    className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-[#5865F2] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#5865F2]/30"
                    placeholder="Titel des Fensters (z.B. Support Ticket)"
                    maxLength={45}
                />
            </div>
        </div>

        {/* Components Manager */}
        <div>
            <div className="flex items-end justify-between mb-5 px-1">
                <div>
                    <div className="text-white font-bold text-lg flex items-center gap-2">
                        Formular Felder
                        <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            { (data.components || []).length } / {MAX_COMPONENTS}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Definiere die Fragen, die der User beantworten muss.</p>
                </div>
                
                {/* NEW DROPDOWN MENU */}
                <AddFieldMenu onAdd={addComp} disabled={(data.components || []).length >= MAX_COMPONENTS} />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={(data.components || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1">
                        {(data.components || []).map(comp => (
                            <SortableComponentItem 
                                key={comp.id} 
                                component={comp} 
                                onChange={changeComp} 
                                onDelete={delComp} 
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {(data.components || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <List className="w-8 h-8 text-gray-600 opacity-50"/>
                    </div>
                    <div className="text-sm font-medium text-gray-300">Dein Formular ist leer</div>
                    <div className="text-xs text-gray-500 mt-1">Klicke oben auf "Feld hinzufügen", um zu starten.</div>
                </div>
            )}
        </div>
    </div>
  );
}