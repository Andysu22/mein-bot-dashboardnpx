"use client";

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  DndContext,
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
  AtSign,
  AlertTriangle,
  Info
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

  return { ...base, min_values: 1, max_values: 1 };
}

// --- COMPONENTS ---

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
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary hover:text-primary-foreground text-muted-foreground rounded-md transition-colors group text-left"
    >
      <div className="p-1.5 bg-muted rounded group-hover:bg-primary-foreground/20">
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
          "flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-all shadow-sm",
          disabled && "opacity-50 cursor-not-allowed hover:bg-primary"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>Hinzufügen</span>
        <ChevronDown className={cn("w-3.5 h-3.5 ml-1 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-popover border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-1.5 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">Input</div>
            <MenuItem kind={KINDS.TEXT_INPUT} label="Textfeld" icon={TextCursor} />

            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase mt-2">Auswahl</div>
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

function SortableOptionRow({
  option,
  onChange,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
  canDelete // Neu: Um das Löschen der letzten Option zu verhindern
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
        "group flex items-start gap-3 bg-card border border-border p-3 rounded-lg mb-2 hover:border-primary/30 hover:bg-muted/30",
        isDragging && "opacity-50 border-primary shadow-lg ring-1 ring-primary bg-muted"
      )}
    >
      <button
        type="button"
        className="mt-3 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground pl-0.5">Label</label>
          <input
            value={option.label}
            onChange={(e) => onChange({ ...option, label: e.target.value })}
            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-foreground focus:border-primary outline-none transition-colors"
            placeholder="Option Name"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground pl-0.5">Value</label>
          <input
            value={option.value}
            onChange={(e) => onChange({ ...option, value: toSafeCustomId(e.target.value) })}
            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs font-mono text-muted-foreground focus:border-primary outline-none transition-colors"
            placeholder="value"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-1">
            <AlignLeft className="w-3 h-3" /> Beschreibung
          </label>
          <input
            value={option.description || ""}
            onChange={(e) => onChange({ ...option, description: e.target.value })}
            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-muted-foreground focus:border-primary outline-none transition-colors"
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-1">
            <Smile className="w-3 h-3" /> Emoji
          </label>
          <input
            value={option.emoji || ""}
            onChange={(e) => onChange({ ...option, emoji: e.target.value })}
            className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-muted-foreground focus:border-primary outline-none transition-colors"
            placeholder="🚀"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canDelete}
        onClick={() => onDelete(option.id)}
        className={cn(
          "mt-3 p-1.5 text-muted-foreground rounded transition-all",
          canDelete 
            ? "hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100" 
            : "opacity-20"
        )}
        /* TOOLTIP HINWEIS */
        title={!canDelete ? "Mindestens eine Option muss vorhanden bleiben." : "Option löschen"}
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

function OptionListEditor({ options, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
  const handleDelete = (id) => {
    if (options.length <= 1) return; // Sicherheit: Letzte Option darf nicht weg
    onChange(options.filter((o) => o.id !== id));
  };

  const handleAdd = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange([
      ...options,
      { id: nanoid(), label: "Neue Option", value: `option_${options.length + 1}`, description: "", emoji: "" }
    ]);
  };

  return (
    <div className="mt-6 pt-6 border-t border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-foreground flex items-center gap-2">Antwort-Möglichkeiten</label>
          <span className="text-[10px] text-muted-foreground">Definiere die Optionen für das Dropdown.</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={options.length >= MAX_OPTIONS}
          className="text-xs bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Option
        </button>
      </div>
      
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {options.map((opt) => (
              <SortableOptionItem 
                key={opt.id} 
                option={opt} 
                onChange={handleChange} 
                onDelete={handleDelete}
                canDelete={options.length > 1} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {options.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
          Keine Optionen vorhanden.
        </div>
      )}
    </div>
  );
}

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
  };

  const isProtected = component.custom_id === "ticket_cat";

  const getIcon = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT: return <TextCursor className="w-5 h-5" />;
      case KINDS.STRING_SELECT: return <List className="w-5 h-5" />;
      case KINDS.USER_SELECT: return <Users className="w-5 h-5" />;
      case KINDS.ROLE_SELECT: return <Shield className="w-5 h-5" />;
      case KINDS.CHANNEL_SELECT: return <Hash className="w-5 h-5" />;
      case KINDS.MENTIONABLE_SELECT: return <AtSign className="w-5 h-5" />;
      default: return <List className="w-5 h-5" />;
    }
  };

  const getLabel = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT: return "Text Input";
      case KINDS.STRING_SELECT: return "Dropdown Menu";
      case KINDS.USER_SELECT: return "User Select";
      case KINDS.ROLE_SELECT: return "Role Select";
      case KINDS.CHANNEL_SELECT: return "Channel Select";
      case KINDS.MENTIONABLE_SELECT: return "Mentionable Select";
      default: return "Component";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border overflow-hidden mb-4 bg-card transition-all",
        isDragging ? "opacity-50 border-primary shadow-xl ring-1 ring-primary" : "border-border hover:border-primary/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 border-b border-border select-none">
        <button
          type="button"
          className="touch-none p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div
          className="flex-1 cursor-pointer flex items-center gap-4"
          onClick={() => onChange({ ...component, collapsed: !component.collapsed })}
        >
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border bg-gradient-to-br shadow-inner text-muted-foreground border-border from-muted/50 to-transparent")}>
            {getIcon(component.kind)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">{component.label || "Unbenanntes Feld"}</span>
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
              {getLabel(component.kind)}
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-muted-foreground/70">ID:</span> {component.custom_id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...component, collapsed: !component.collapsed })}
            className="p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors"
          >
            {component.collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {!isProtected && (
            <button
              type="button"
              onClick={() => onDelete(component.id)}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!component.collapsed && (
        <div className="p-5 bg-card space-y-6">
          
          {/* GEKÜRZTE INFOBOX IN GELB/ORANGE NUR FÜR KATEGORIE */}
          {isProtected && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
              <div className="mt-0.5 bg-amber-500/10 p-1.5 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">System-Feld</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dieses Feld ist für die <b>Kategorien-Anzeige</b> im Dashboard nötig. Name und Optionen sind frei wählbar, die ID muss aber bleiben.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Label (Anzeigename)
                </label>
                <input
                  value={component.label}
                  onChange={(e) => onChange({ ...component, label: e.target.value })}
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:border-primary outline-none placeholder:text-muted-foreground transition-all shadow-sm focus:ring-1 focus:ring-primary/20"
                  maxLength={45}
                  placeholder="Anzeigetext"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Beschreibung
                </label>
                <input
                  value={component.description || ""}
                  onChange={(e) => onChange({ ...component, description: e.target.value })}
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:border-primary outline-none placeholder:text-muted-foreground transition-all shadow-sm focus:ring-1 focus:ring-primary/20"
                  maxLength={100}
                  placeholder="Zusatzinfo..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Custom ID (System-ID)
                </label>
                <input
                  value={component.custom_id}
                  disabled={isProtected}
                  onChange={(e) => onChange({ ...component, custom_id: toSafeCustomId(e.target.value) })}
                  className={cn(
                    "w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm font-mono text-muted-foreground focus:border-primary outline-none transition-all shadow-sm focus:ring-1 focus:ring-primary/20",
                    isProtected && "bg-muted cursor-not-allowed opacity-70"
                  )}
                  maxLength={100}
                />
              </div>

              <div className="flex items-center justify-between pt-6 px-1">
                <div
                  onClick={() => {
                    if (isProtected) return;
                    onChange({ ...component, required: !component.required })
                  }}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer group select-none",
                    isProtected && "cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all shadow-sm",
                      component.required
                        ? "bg-primary border-primary"
                        : "border-input bg-background group-hover:border-muted-foreground",
                      isProtected && "opacity-80"
                    )}
                  >
                    {component.required && <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />}
                  </div>
                  <span className={cn("text-xs font-medium group-hover:text-foreground transition-colors", component.required ? "text-foreground" : "text-muted-foreground")}>
                    Pflichtfeld
                  </span>
                </div>
              </div>
            </div>
          </div>

          {component.kind === KINDS.STRING_SELECT && (
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
          return {
            ...base,
            style: c.style === 2 || c.style === "paragraph" ? 2 : 1,
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

        return { ...base, min_values: 1, max_values: 1 };
      });

    return { ...safe, title: String(safe.title ?? "").slice(0, 45), components: normComps };
  };

  useEffect(() => {
    try {
      const normalized = normalizeModalData(data);
      if (JSON.stringify(normalized) !== JSON.stringify(data)) {
        onChange(normalized);
      }
    } catch {}
  }, [data]);

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const comps = data.components || [];
    const oldIndex = comps.findIndex((c) => c.id === active.id);
    const newIndex = comps.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange({ ...data, components: arrayMove(comps, oldIndex, newIndex) });
    }
  };

  const addComp = (kind) => {
    if ((data.components || []).length >= MAX_COMPONENTS) return;
    onChange({ ...data, components: [...(data.components || []), defaultComponent(kind)] });
  };

  const changeComp = (c) => onChange({ ...data, components: (data.components || []).map((x) => (x.id === c.id ? c : x)) });
  const delComp = (id) => onChange({ ...data, components: (data.components || []).filter((x) => x.id !== id) });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="space-y-2">
          <label className="text-[11px] uppercase font-bold text-muted-foreground pl-1 flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-primary" /> Fenstertitel
          </label>
          <input
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm font-bold text-foreground focus:border-primary outline-none transition-all shadow-inner focus:ring-1 focus:ring-primary/30"
            placeholder="Titel des Fensters (z.B. Support Ticket)"
            maxLength={45}
          />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-5 px-1">
          <div>
            <div className="text-foreground font-bold text-lg flex items-center gap-2">
              Formular Felder
              <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border">
                {(data.components || []).length} / {MAX_COMPONENTS}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Definiere die Fragen für den Nutzer.</p>
          </div>
          <AddFieldMenu onAdd={addComp} disabled={(data.components || []).length >= MAX_COMPONENTS} />
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={(data.components || []).map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {(data.components || []).map((comp) => (
                <SortableComponentItem key={comp.id} component={comp} onChange={changeComp} onDelete={delComp} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {(data.components || []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <List className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">Dein Formular ist leer</div>
            <div className="text-xs text-muted-foreground/70 mt-1">Klicke oben auf "Feld hinzufügen", um zu starten.</div>
          </div>
        )}
      </div>
    </div>
  );
}