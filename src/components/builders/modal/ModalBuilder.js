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
  MoreHorizontal,
  Users,
  Shield,
  AtSign
} from "lucide-react";

// --- CONFIG ---
const MAX_COMPONENTS = 5;
const MAX_OPTIONS = 25;

// --- TYPES ---
const KINDS = {
  TEXT_INPUT: "text_input",
  STRING_SELECT: "string_select",
  USER_SELECT: "user_select",
  ROLE_SELECT: "role_select",
  CHANNEL_SELECT: "channel_select",
  MENTIONABLE_SELECT: "mentionable_select"
};

// --- HELPERS ---
function toSafeCustomId(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_:\-]/g, "")
    .slice(0, 100);
  return t || "id";
}

function defaultComponent(kind = KINDS.TEXT_INPUT) {
  const base = {
    id: nanoid(),
    kind,
    custom_id: toSafeCustomId(`${kind}_${nanoid(4)}`),
    label: kind === KINDS.TEXT_INPUT ? "Neue Frage" : "Neues Menü",
    required: true,
    placeholder: "",
    description: "",
    collapsed: false
  };

  if (kind === KINDS.TEXT_INPUT) {
    return { ...base, style: 1, min_length: 0, max_length: 1000 };
  }

  if (kind === KINDS.STRING_SELECT) {
    return {
      ...base,
      min_values: 1,
      max_values: 1,
      options: [{ id: nanoid(), label: "Option 1", value: "opt_1", description: "", emoji: "" }]
    };
  }

  // Für User/Role/Channel Selects
  return { ...base, min_values: 1, max_values: 1 };
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

  const MenuItem = ({ kind, label, icon: Icon }) => (
    <button
      onClick={() => handleSelect(kind)}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5865F2] hover:text-white text-gray-300 rounded-md transition-colors group text-left"
    >
      <div className="p-1.5 bg-[#1e1f22] rounded group-hover:bg-white/20">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-bold">{label}</div>
      </div>
    </button>
  );

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
        <div className="absolute right-0 mt-2 w-60 bg-[#111214] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-1.5 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">Input</div>
            <MenuItem kind={KINDS.TEXT_INPUT} label="Textfeld" icon={TextCursor} />

            <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase mt-2">Auswahl</div>
            <MenuItem kind={KINDS.STRING_SELECT} label="Dropdown Menü" icon={List} />
            <MenuItem kind={KINDS.USER_SELECT} label="User Auswahl" icon={Users} />
            <MenuItem kind={KINDS.ROLE_SELECT} label="Rollen Auswahl" icon={Shield} />
            <MenuItem kind={KINDS.CHANNEL_SELECT} label="Kanal Auswahl" icon={Hash} />
            <MenuItem kind={KINDS.MENTIONABLE_SELECT} label="User & Rollen" icon={AtSign} />
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Sortable Option Row (Inner)
function SortableOptionRow({
  option,
  onChange,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
}) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 999 : "auto"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-3 bg-[#1e1f22] border border-white/5 p-3 rounded-lg mb-2 transition-all hover:border-white/10 hover:bg-[#232428]",
        isDragging && "border-[#5865F2] shadow-lg ring-1 ring-[#5865F2] bg-[#2b2d31]"
      )}
    >
      <button
        type="button"
        className="mt-3 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5">Label</label>
          <input
            value={option.label}
            onChange={(e) => onChange({ ...option, label: e.target.value })}
            className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:border-[#5865F2] outline-none transition-colors"
            placeholder="Option Name"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5">Value</label>
          <input
            value={option.value}
            onChange={(e) => onChange({ ...option, value: toSafeCustomId(e.target.value) })}
            className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs font-mono text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
            placeholder="value"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5 flex items-center gap-1">
            <AlignLeft className="w-3 h-3" /> Beschreibung
          </label>
          <input
            value={option.description || ""}
            onChange={(e) => onChange({ ...option, description: e.target.value })}
            className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-gray-500 pl-0.5 flex items-center gap-1">
            <Smile className="w-3 h-3" /> Emoji
          </label>
          <input
            value={option.emoji || ""}
            onChange={(e) => onChange({ ...option, emoji: e.target.value })}
            className="w-full bg-[#111214] border border-white/5 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#5865F2] outline-none transition-colors"
            placeholder="🚀"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(option.id)}
        className="mt-3 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SortableOptionItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.option.id
  });
  return (
    <SortableOptionRow
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

// 3. Option List Container
function OptionListEditor({ options, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(options, oldIndex, newIndex));
    }
  };

  const handleChange = (newOpt) => onChange(options.map((o) => (o.id === newOpt.id ? newOpt : o)));
  const handleDelete = (id) => onChange(options.filter((o) => o.id !== id));

  const handleAdd = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange([
      ...options,
      { id: nanoid(), label: "New Option", value: `option_${options.length + 1}`, description: "", emoji: "" }
    ]);
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-white flex items-center gap-2">Antwort-Möglichkeiten</label>
          <span className="text-[10px] text-gray-500">Definiere die Optionen für das Dropdown.</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={options.length >= MAX_OPTIONS}
          className="text-xs bg-[#5865F2]/10 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Option
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">{options.map((opt) => <SortableOptionItem key={opt.id} option={opt} onChange={handleChange} onDelete={handleDelete} />)}</div>
        </SortableContext>
      </DndContext>

      {options.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-500 bg-[#111214] rounded-lg border border-dashed border-white/5">
          Keine Optionen vorhanden.
        </div>
      )}
    </div>
  );
}

// 4. Component Row (Outer)
function SortableComponentRow({
  component,
  onChange,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
}) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : "auto"
  };

  const getIcon = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT:
        return <TextCursor className="w-5 h-5" />;
      case KINDS.STRING_SELECT:
        return <List className="w-5 h-5" />;
      case KINDS.USER_SELECT:
        return <Users className="w-5 h-5" />;
      case KINDS.ROLE_SELECT:
        return <Shield className="w-5 h-5" />;
      case KINDS.CHANNEL_SELECT:
        return <Hash className="w-5 h-5" />;
      case KINDS.MENTIONABLE_SELECT:
        return <AtSign className="w-5 h-5" />;
      default:
        return <List className="w-5 h-5" />;
    }
  };

  const getLabel = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT:
        return "Text Input";
      case KINDS.STRING_SELECT:
        return "Dropdown Menu";
      case KINDS.USER_SELECT:
        return "User Select";
      case KINDS.ROLE_SELECT:
        return "Role Select";
      case KINDS.CHANNEL_SELECT:
        return "Channel Select";
      case KINDS.MENTIONABLE_SELECT:
        return "Mentionable Select";
      default:
        return "Component";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-[#1a1b1e] transition-all overflow-hidden mb-4",
        isDragging ? "border-[#5865F2] shadow-xl ring-1 ring-[#5865F2]" : "border-white/5 hover:border-white/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-[#2b2d31]/30 border-b border-white/5 select-none">
        <button
          type="button"
          className="touch-none p-2 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div
          className="flex-1 cursor-pointer flex items-center gap-4"
          onClick={() => onChange({ ...component, collapsed: !component.collapsed })}
        >
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border bg-gradient-to-br shadow-inner text-gray-300 border-white/10 from-white/5 to-white/0")}>
            {getIcon(component.kind)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-100">{component.label || "Unbenanntes Feld"}</span>
            <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
              {getLabel(component.kind)}
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span className="text-gray-600">ID:</span> {component.custom_id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...component, collapsed: !component.collapsed })}
            className="p-2 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            {component.collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(component.id)}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
          >
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
                <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Label
                </label>
                <input
                  value={component.label}
                  onChange={(e) => onChange({ ...component, label: e.target.value })}
                  className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                  maxLength={45}
                  placeholder="Anzeigetext"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5">
                  <MoreHorizontal className="w-3.5 h-3.5" /> Placeholder
                </label>
                <input
                  value={component.placeholder || ""}
                  onChange={(e) => onChange({ ...component, placeholder: e.target.value })}
                  className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                  maxLength={100}
                  placeholder="Platzhaltertext..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Beschreibung
                </label>
                <input
                  value={component.description || ""}
                  onChange={(e) => onChange({ ...component, description: e.target.value })}
                  className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#5865F2] outline-none placeholder:text-gray-600 transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                  maxLength={100}
                  placeholder="Zusatzinfo..."
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Custom ID
                </label>
                <input
                  value={component.custom_id}
                  onChange={(e) => onChange({ ...component, custom_id: toSafeCustomId(e.target.value) })}
                  className="w-full bg-[#111214] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-300 focus:border-[#5865F2] outline-none transition-all shadow-sm focus:ring-1 focus:ring-[#5865F2]/20"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center justify-between pt-6 px-1">
                <div
                  onClick={() => onChange({ ...component, required: !component.required })}
                  className="flex items-center gap-3 cursor-pointer group select-none"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all shadow-sm",
                      component.required
                        ? "bg-[#5865F2] border-[#5865F2]"
                        : "border-gray-600 bg-[#111214] group-hover:border-gray-400"
                    )}
                  >
                    {component.required && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <span className={cn("text-xs font-medium group-hover:text-white transition-colors", component.required ? "text-white" : "text-gray-400")}>
                    Pflichtfeld
                  </span>
                </div>

                {component.kind === KINDS.TEXT_INPUT && (
                  <div className="flex bg-[#111214] p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => onChange({ ...component, style: 1 })}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all",
                        component.style === 1 ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      )}
                    >
                      Kurz
                    </button>
                    <button
                      onClick={() => onChange({ ...component, style: 2 })}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all",
                        component.style === 2 ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      )}
                    >
                      Lang
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Options Editor (Only for String Select) */}
          {component.kind === KINDS.STRING_SELECT && (
            <OptionListEditor options={component.options || []} onChange={(newOpts) => onChange({ ...component, options: newOpts })} />
          )}
        </div>
      )}
    </div>
  );
}

function SortableComponentItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.component.id });
  return (
    <SortableComponentRow
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

// --- MAIN BUILDER ---
export default function ModalBuilder({ data, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- Normalization ---
  // Historisch gab es gespeicherte Builder-Daten ohne IDs (oder mit falschen Keys).
  // Das bricht DnD-Kit (SortableContext braucht stabile IDs). Tickets funktionierte
  // meist, Bewerbungen nicht immer. Daher normalisieren wir hier defensiv.
  const normalizeModalData = (incoming) => {
    const safe = incoming && typeof incoming === "object" ? { ...incoming } : { title: "", components: [] };
    const comps = Array.isArray(safe.components) ? safe.components : [];

    const normComps = comps
      .filter(Boolean)
      .slice(0, MAX_COMPONENTS)
      .map((c) => {
        const kind = c.kind || c.type || KINDS.TEXT_INPUT;
        const base = {
          id: c.id || nanoid(),
          kind,
          custom_id: toSafeCustomId(c.custom_id || c.customId || `${kind}_${nanoid(4)}`),
          label: String(c.label ?? (kind === KINDS.TEXT_INPUT ? "Neue Frage" : "Neues Menü")).slice(0, 45),
          required: !!c.required,
          placeholder: String(c.placeholder ?? "").slice(0, 100),
          description: String(c.description ?? "").slice(0, 100),
          collapsed: !!c.collapsed
        };

        if (kind === KINDS.TEXT_INPUT) {
          // Wir akzeptieren sowohl `style` als Zahl als auch String.
          const styleRaw = c.style;
          const style = styleRaw === 2 || styleRaw === "paragraph" ? 2 : 1;
          return {
            ...base,
            style,
            min_length: Number.isFinite(c.min_length) ? c.min_length : 0,
            max_length: Number.isFinite(c.max_length) ? c.max_length : 1000
          };
        }

        if (kind === KINDS.STRING_SELECT) {
          const options = Array.isArray(c.options) ? c.options : [];
          return {
            ...base,
            min_values: Number.isFinite(c.min_values) ? c.min_values : 1,
            max_values: Number.isFinite(c.max_values) ? c.max_values : 1,
            options: options.slice(0, MAX_OPTIONS).map((o) => ({
              id: o?.id || nanoid(),
              label: String(o?.label ?? "Option").slice(0, 100),
              value: toSafeCustomId(o?.value ?? "value"),
              description: String(o?.description ?? "").slice(0, 100),
              emoji: String(o?.emoji ?? "").slice(0, 64)
            }))
          };
        }

        // User/Role/Channel/Mentionable Select
        return {
          ...base,
          min_values: Number.isFinite(c.min_values) ? c.min_values : 1,
          max_values: Number.isFinite(c.max_values) ? c.max_values : 1
        };
      });

    return { ...safe, title: String(safe.title ?? "").slice(0, 45), components: normComps };
  };

  // Auto-Fix fehlender IDs/Keys beim Laden (wichtig für Bewerbungen)
  useEffect(() => {
    try {
      const normalized = normalizeModalData(data);
      if (JSON.stringify(normalized) !== JSON.stringify(data)) {
        onChange(normalized);
      }
      // eslint-disable-next-line no-empty
    } catch {}
    // Wir wollen bewusst auf Änderungen von `data` reagieren.
  }, [data]);

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = (data.components || []).findIndex((c) => c.id === active.id);
    const newIndex = (data.components || []).findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange({ ...data, components: arrayMove(data.components, oldIndex, newIndex) });
    }
  };

  const addComp = (kind) => {
    if ((data.components || []).length >= MAX_COMPONENTS) return;
    onChange({ ...data, components: [...(data.components || []), defaultComponent(kind)] });
  };

  const changeComp = (c) => onChange({ ...data, components: data.components.map((x) => (x.id === c.id ? c : x)) });
  const delComp = (id) => onChange({ ...data, components: data.components.filter((x) => x.id !== id) });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-[#1e1f22] p-6 rounded-xl border border-white/5 shadow-sm">
        <div className="space-y-2">
          <label className="text-[11px] uppercase font-bold text-gray-400 pl-1 flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-[#5865F2]" /> Fenstertitel
          </label>
          <input
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-[#5865F2] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#5865F2]/30"
            placeholder="Titel des Fensters (z.B. Support Ticket)"
            maxLength={45}
          />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-5 px-1">
          <div>
            <div className="text-white font-bold text-lg flex items-center gap-2">
              Formular Felder
              <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                {(data.components || []).length} / {MAX_COMPONENTS}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Definiere die Fragen, die der User beantworten muss.</p>
          </div>
          <AddFieldMenu onAdd={addComp} disabled={(data.components || []).length >= MAX_COMPONENTS} />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={(data.components || []).map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {(data.components || []).map((comp) => (
                <SortableComponentItem key={comp.id} component={comp} onChange={changeComp} onDelete={delComp} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {(data.components || []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <List className="w-8 h-8 text-gray-600 opacity-50" />
            </div>
            <div className="text-sm font-medium text-gray-300">Dein Formular ist leer</div>
            <div className="text-xs text-gray-500 mt-1">Klicke oben auf "Feld hinzufügen", um zu starten.</div>
          </div>
        )}
      </div>
    </div>
  );
}
