"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
// Emoji Mart Imports
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import {
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  TextCursor,
  List,
  Smile,
  Hash,
  Users,
  Shield,
  AlertTriangle,
  X,
  MessageSquare,
  LayoutTemplate,
  GripHorizontal
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
      options: [
        { id: nanoid(), label: "Option 1", value: "opt_1", description: "", emoji: "" }
      ]
    };
  }

  return { ...base, min_values: 1, max_values: 1 };
}

// --- UI STYLE TOKENS (nur Design, keine Logik) ---
const UI = {
  page: "w-full max-w-6xl mx-auto space-y-10 pb-24",
  shell:
    "relative rounded-2xl border border-[#1E1F22] bg-gradient-to-b from-[#2B2D31] to-[#24262B] shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
  shellInner: "p-6 sm:p-7",
  sectionHeader: "flex items-start justify-between gap-6",
  sectionTitleWrap: "space-y-1",
  sectionTitle: "text-xl font-extrabold text-[#F2F3F5] tracking-tight",
  sectionSub: "text-xs text-[#949BA4] leading-relaxed",
  badge:
    "text-[10px] font-bold px-2 py-0.5 rounded-[6px] border uppercase tracking-wide",
  divider: "border-t border-[#1E1F22]",
  inputLabel:
    "text-[10px] font-bold text-[#949BA4] uppercase tracking-wider block",
  inputBase:
    "w-full h-10 px-3 bg-[#1E1F22] border border-transparent rounded-[6px] text-sm text-[#DBDEE1] placeholder:text-[#5C5E66] outline-none transition-all focus:border-[#5865F2]/60 focus:ring-2 focus:ring-[#5865F2]/20",
  inputMono:
    "w-full h-10 px-3 bg-[#1E1F22] border border-transparent rounded-[6px] text-sm font-mono text-[#949BA4] placeholder:text-[#5C5E66] outline-none transition-all focus:border-[#5865F2]/60 focus:ring-2 focus:ring-[#5865F2]/20 focus:text-[#DBDEE1]",
  subtleCard:
    "rounded-xl border border-[#1E1F22] bg-[#232428]/60 shadow-[0_6px_22px_rgba(0,0,0,0.25)]",
  subtleCardInner: "p-5",
  emptyState:
    "flex flex-col items-center justify-center py-16 border-2 border-dashed border-[#2B2D31] rounded-2xl bg-[#2B2D31]/25 hover:bg-[#2B2D31]/40 transition-all cursor-pointer group"
};

// --- UI COMPONENTS ---

function IOSSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#5865F2]" : "bg-[#3F4147]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function EmojiSelector({ emoji, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full h-full" ref={pickerRef}>
      <div className="flex items-center gap-0.5 bg-[#1E1F22] hover:bg-[#232428] rounded-[4px] transition-colors h-[38px] w-full border border-transparent focus-within:border-[#5865F2]/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="h-full flex-grow pl-2 pr-1 text-[#B5BAC1] hover:text-white transition-colors flex items-center justify-center"
        >
          {emoji ? (
            <span className="text-lg leading-none truncate">{emoji}</span>
          ) : (
            <Smile className="w-4 h-4 shrink-0" />
          )}
        </button>
        {emoji && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-full w-[24px] flex items-center justify-center text-[#B5BAC1] hover:text-red-400 transition-colors border-l border-[#2B2D31] shrink-0"
            title="Entfernen"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showPicker && (
        <div className="absolute right-0 bottom-full mb-2 z-[9999] shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 origin-bottom-right border border-[#2B2D31] bg-[#2B2D31]">
          <Picker
            data={data}
            onEmojiSelect={(emojiData) => {
              onChange(emojiData.native);
              setShowPicker(false);
            }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            searchPosition="sticky"
            perLine={8}
            maxFrequentRows={1}
          />
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

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
      className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-[#5865F2] hover:text-white rounded-[6px] transition-colors text-left group text-[#DBDEE1]"
    >
      <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
      <span className="font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[8px] text-xs font-extrabold transition-all shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#5865F2]/35",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Plus className="w-4 h-4" />
        <span>Feld hinzufügen</span>
        <ChevronDown className={cn("w-3 h-3 ml-1 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0F1012] border border-[#1E1F22] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-bold text-[#949BA4] uppercase tracking-wider">Input</div>
            <MenuItem kind={KINDS.TEXT_INPUT} label="Textfeld" icon={TextCursor} />
            <div className="my-1 border-t border-[#2B2D31]" />
            <div className="px-2 py-1.5 text-[10px] font-bold text-[#949BA4] uppercase tracking-wider">Auswahl</div>
            <MenuItem kind={KINDS.STRING_SELECT} label="Dropdown Menü" icon={List} />
            <MenuItem kind={KINDS.USER_SELECT} label="User Auswahl" icon={Users} />
            <MenuItem kind={KINDS.ROLE_SELECT} label="Rollen Auswahl" icon={Shield} />
            <MenuItem kind={KINDS.CHANNEL_SELECT} label="Kanal Auswahl" icon={Hash} />
          </div>
        </div>
      )}
    </div>
  );
}

/* --- OPTION ROW (Design überarbeitet, Logik identisch) --- */
function OptionRow({ option, onChange, onDelete, canDelete, dragHandleProps, isOverlay }) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl p-3 transition-all border",
        isOverlay
          ? "bg-[#2B2D31] border-[#5865F2] shadow-2xl z-50 cursor-grabbing"
          : "bg-[#2B2D31] border-[#1E1F22] hover:border-[#3F4147] hover:bg-[#2B2D31]/80"
      )}
    >
      <div
        className="mt-[26px] text-[#949BA4] hover:text-[#DBDEE1] cursor-grab active:cursor-grabbing p-1.5 hover:bg-white/5 rounded-md h-[38px] flex items-center"
        {...dragHandleProps}
        title="Ziehen zum Sortieren"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-3 space-y-1.5">
          <label className={UI.inputLabel}>Label</label>
          <input
            value={option.label}
            onChange={(e) => onChange && onChange({ ...option, label: e.target.value })}
            className={cn(UI.inputBase, "h-[38px] rounded-[6px]")}
            placeholder="Option Name"
          />
        </div>

        <div className="md:col-span-3 space-y-1.5">
          <label className={UI.inputLabel}>Technischer Wert</label>
          <input
            value={option.value}
            onChange={(e) => onChange && onChange({ ...option, value: toSafeCustomId(e.target.value) })}
            className={cn(UI.inputMono, "h-[38px] rounded-[6px]")}
            placeholder="value"
          />
        </div>

        <div className="md:col-span-6 space-y-1.5">
          <label className={UI.inputLabel}>Beschreibung (Optional)</label>
          <div className="flex gap-2">
            <input
              value={option.description || ""}
              onChange={(e) => onChange && onChange({ ...option, description: e.target.value })}
              className={cn(UI.inputBase, "flex-1 h-[38px] rounded-[6px] min-w-[100px]")}
              placeholder="Info..."
            />
            <div className="w-[64px] shrink-0 z-10 h-[38px]">
              <EmojiSelector
                emoji={option.emoji || ""}
                onChange={(newEmoji) => onChange && onChange({ ...option, emoji: newEmoji })}
              />
            </div>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => onDelete && onDelete(option.id)}
              className={cn(
                "w-[38px] h-[38px] flex items-center justify-center rounded-[6px] transition-all border border-transparent shrink-0",
                canDelete
                  ? "text-[#949BA4] hover:text-red-400 hover:bg-[#1E1F22] hover:border-red-400/20"
                  : "text-[#4E5058] cursor-not-allowed"
              )}
              title={canDelete ? "Option löschen" : "Mindestens 1 Option muss bleiben"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableOptionItem({ option, onChange, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id
  });
  const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.3 : 1,
  position: "relative",
  zIndex: isDragging ? 100 : "auto"
};



  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <OptionRow
        option={option}
        onChange={onChange}
        onDelete={onDelete}
        canDelete={canDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/* --- OPTIONS EDITOR (Design überarbeitet, Logik identisch) --- */
function OptionListEditor({ options, onChange }) {
  const [activeOptId, setActiveOptId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e) => setActiveOptId(e.active.id);
  const handleDragEnd = (e) => {
    setActiveOptId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onChange(arrayMove(options, oldIndex, newIndex));
  };
  const handleChange = (newOpt) => onChange(options.map((o) => (o.id === newOpt.id ? newOpt : o)));
  const handleDelete = (id) => {
    if (options.length > 1) onChange(options.filter((o) => o.id !== id));
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (options.length >= MAX_OPTIONS) return;
    onChange([
      ...options,
      {
        id: nanoid(),
        label: `Option ${options.length + 1}`,
        value: `val_${options.length + 1}`,
        description: "",
        emoji: ""
      }
    ]);
  };

  const activeOption = useMemo(() => options.find((o) => o.id === activeOptId), [activeOptId, options]);

  return (
    <div className="mt-8 pt-6 border-t border-[#1E1F22]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#F2F3F5]">Antwort-Optionen</span>
          <span className="text-[10px] bg-[#1E1F22] text-[#949BA4] px-2 py-0.5 rounded-[6px] font-mono border border-[#2B2D31]">
            {options.length}
          </span>
          <span className="text-[10px] text-[#5C5E66] hidden sm:inline">
            (Drag & Drop zum Sortieren)
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={options.length >= MAX_OPTIONS}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[8px] text-xs font-extrabold transition-all shadow-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#5865F2]/35",
            options.length >= MAX_OPTIONS &&
              "opacity-50 cursor-not-allowed bg-[#3F4147] hover:bg-[#3F4147] text-[#949BA4] shadow-none"
          )}
          title={options.length >= MAX_OPTIONS ? `Max. ${MAX_OPTIONS} Optionen` : "Option hinzufügen"}
        >
          <Plus className="w-3.5 h-3.5" /> Option hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
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
          <DragOverlay>
            {activeOption ? (
              <div className="w-full max-w-4xl opacity-95 cursor-grabbing">
                <OptionRow option={activeOption} canDelete={true} isOverlay={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {options.length === 0 && (
        <div className="text-center py-6 text-xs text-[#5C5E66] italic bg-[#1E1F22]/50 rounded border border-dashed border-[#2B2D31]">
          Keine Optionen definiert.
        </div>
      )}
    </div>
  );
}

/* --- COMPONENT ROW (Design überarbeitet, Logik identisch) --- */
function ComponentRow({ component, onChange, onDelete, dragHandleProps, isOverlay }) {
  const isProtected = component.custom_id === "ticket_cat";

  const getIcon = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT:
        return <TextCursor className="w-4 h-4" />;
      case KINDS.STRING_SELECT:
        return <List className="w-4 h-4" />;
      case KINDS.USER_SELECT:
        return <Users className="w-4 h-4" />;
      case KINDS.ROLE_SELECT:
        return <Shield className="w-4 h-4" />;
      case KINDS.CHANNEL_SELECT:
        return <Hash className="w-4 h-4" />;
      default:
        return <List className="w-4 h-4" />;
    }
  };

  const getTypeName = (kind) => {
    switch (kind) {
      case KINDS.TEXT_INPUT:
        return "Textfeld";
      case KINDS.STRING_SELECT:
        return "Auswahlmenü";
      default:
        return "Selector";
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all mb-4 overflow-hidden border",
        isOverlay
          ? "border-[#5865F2] shadow-2xl z-50 opacity-95 scale-[1.01] bg-[#2B2D31]"
          : "border-[#1E1F22] bg-[#2B2D31] hover:border-[#3F4147] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 select-none",
          !component.collapsed && "border-b border-[#1E1F22] bg-[#232428]",
          component.collapsed && "bg-[#26282E]"
        )}
      >
        <div
          className="text-[#949BA4] hover:text-[#DBDEE1] cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-lg"
          {...dragHandleProps}
          title="Ziehen zum Sortieren"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div
          className="flex-1 cursor-pointer grid grid-cols-12 gap-4 items-center"
          onClick={() => onChange && onChange({ ...component, collapsed: !component.collapsed })}
        >
          <div className="col-span-12 sm:col-span-6 flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0",
                isProtected
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-[#1E1F22] border-[#1E1F22] text-[#B5BAC1]"
              )}
            >
              {getIcon(component.kind)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-[#F2F3F5] truncate">
                {component.label || "Unbenannt"}
              </span>
              <span className="text-[11px] text-[#949BA4] font-semibold">
                {getTypeName(component.kind)}
              </span>
            </div>
          </div>

          <div className="hidden sm:block sm:col-span-3 text-xs text-[#5C5E66] font-mono truncate px-2">
            {component.custom_id}
          </div>

          <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-3">
            {component.required && (
              <span className="text-[10px] font-extrabold text-[#F0B132] bg-[#F0B132]/10 px-2 py-0.5 rounded-[8px] border border-[#F0B132]/20 uppercase tracking-wide">
                Pflicht
              </span>
            )}
            {!isProtected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(component.id);
                }}
                className="p-2 text-[#949BA4] hover:text-red-400 hover:bg-[#1E1F22] rounded-lg transition-colors"
                title="Feld löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="p-1.5 text-[#949BA4] rounded-lg bg-white/[0.03] border border-white/[0.04]">
              {component.collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      {!component.collapsed && !isOverlay && (
        <div className="p-6 bg-[#2B2D31] animate-in slide-in-from-top-1 duration-200">
          {isProtected && (
            <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/15 p-4 flex gap-4 items-start">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/10">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wide mb-1">
                  System-Feld
                </h4>
                <p className="text-xs text-[#B5BAC1] leading-relaxed max-w-2xl">
                  Dieses Feld wird für die interne{" "}
                  <b className="text-[#DBDEE1]">Kategorien-Logik</b> benötigt. Du kannst den Anzeigetext und die
                  Beschreibung ändern, aber die technische ID ist fixiert, damit der Bot funktioniert.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
            <div className="space-y-5">
              <div>
                <label className={UI.inputLabel}>Label (Frage an Nutzer)</label>
                <input
                  value={component.label}
                  onChange={(e) => onChange && onChange({ ...component, label: e.target.value })}
                  className={cn(UI.inputBase, "mt-2")}
                  placeholder="z.B. Wie lautet deine Frage?"
                />
              </div>

              <div>
                <label className={UI.inputLabel}>Placeholder / Beschreibung</label>
                <input
                  value={component.description || ""}
                  onChange={(e) => onChange && onChange({ ...component, description: e.target.value })}
                  className={cn(UI.inputBase, "mt-2")}
                  placeholder="Zusatzinformationen (optional)..."
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className={cn(UI.inputLabel, "flex items-center gap-1")}>
                  <Hash className="w-3 h-3 text-[#949BA4]" /> Technischer Name (ID)
                </label>
                <input
                  value={component.custom_id}
                  disabled={isProtected}
                  onChange={(e) => onChange && onChange({ ...component, custom_id: toSafeCustomId(e.target.value) })}
                  className={cn(
                    UI.inputMono,
                    "mt-2",
                    isProtected && "opacity-50 cursor-not-allowed text-[#5C5E66]"
                  )}
                />
              </div>

              <div className="mt-1">
                <div className="flex items-center justify-between h-10 bg-[#1E1F22]/55 px-3 rounded-[10px] border border-[#1E1F22] hover:border-[#3F4147] transition-all">
                  <div className="leading-tight">
                    <div className="text-sm font-extrabold text-[#DBDEE1]">Pflichtfeld?</div>
                    <div className="text-[11px] text-[#949BA4]">Muss ausgefüllt werden</div>
                  </div>
                  <IOSSwitch
                    checked={component.required}
                    onChange={(val) => !isProtected && onChange({ ...component, required: val })}
                    disabled={isProtected}
                  />
                </div>
              </div>
            </div>
          </div>

          {component.kind === KINDS.STRING_SELECT && (
            <OptionListEditor
              options={component.options || []}
              onChange={(newOpts) => onChange && onChange({ ...component, options: newOpts })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SortableComponentItem({ component, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: component.id
  });
  const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.3 : 1,
  zIndex: isDragging ? 50 : "auto",
  position: "relative"
};


  return (
    <div ref={setNodeRef} style={style}>
      <ComponentRow
        component={component}
        onChange={onChange}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// --- MAIN BUILDER ---
export default function ModalBuilder({ data, onChange }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Normalizer
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
        if (kind === KINDS.TEXT_INPUT)
          return {
            ...base,
            style: c.style === 2 ? 2 : 1,
            min_length: c.min_length || 0,
            max_length: c.max_length || 1000
          };
        if (kind === KINDS.STRING_SELECT)
          return {
            ...base,
            min_values: c.min_values || 1,
            max_values: c.max_values || 1,
            options: (c.options || [])
              .slice(0, MAX_OPTIONS)
              .map((o) => ({
                id: o?.id || nanoid(),
                label: o?.label || "Option",
                value: toSafeCustomId(o?.value),
                description: o?.description || "",
                emoji: o?.emoji || ""
              }))
          };
        return { ...base, min_values: 1, max_values: 1 };
      });
    return { ...safe, title: String(safe.title ?? "").slice(0, 45), components: normComps };
  };

  useEffect(() => {
    try {
      const normalized = normalizeModalData(data);
      if (JSON.stringify(normalized) !== JSON.stringify(data)) onChange(normalized);
    } catch {}
  }, [data]);

  const handleDragStart = (e) => setActiveId(e.active.id);
  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const comps = data.components || [];
    const oldIndex = comps.findIndex((c) => c.id === active.id);
    const newIndex = comps.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1)
      onChange({ ...data, components: arrayMove(comps, oldIndex, newIndex) });
  };

  const addComp = (kind) => {
    if ((data.components || []).length >= MAX_COMPONENTS) return;
    onChange({
      ...data,
      components: [...(data.components || []), { ...defaultComponent(kind), collapsed: false }]
    });
  };

  const changeComp = (c) =>
    onChange({ ...data, components: (data.components || []).map((x) => (x.id === c.id ? c : x)) });

  const delComp = (id) => {
    const comps = data.components || [];
    // Mindestens 1 Feld muss bleiben
    if (comps.length <= 1) return;
    // System-Feld darf niemals gelöscht werden
    const target = comps.find((x) => x.id === id);
    if (target?.custom_id === "ticket_cat") return;
    onChange({ ...data, components: comps.filter((x) => x.id !== id) });
  };

  const activeComponent = useMemo(
    () => (data.components || []).find((c) => c.id === activeId),
    [activeId, data.components]
  );

  return (
    <div className={UI.page}>
      {/* HERO / PAGE HEADER */}
      <div className="rounded-2xl border border-[#1E1F22] bg-gradient-to-b from-[#1E1F22]/40 to-[#111214]/40 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#DBDEE1]">
              <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Modal Builder</h1>
            </div>
            <p className="text-xs text-[#949BA4] leading-relaxed max-w-2xl">
              Baue dein Discord Ticket-Formular: Felder hinzufügen, sortieren, Pflichtfelder setzen und Dropdown-Optionen verwalten.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-lg border border-[#2B2D31] bg-[#2B2D31]/60 text-[#949BA4] font-mono">
              Max Felder: {MAX_COMPONENTS}
            </span>
            <span className="text-[10px] px-2 py-1 rounded-lg border border-[#2B2D31] bg-[#2B2D31]/60 text-[#949BA4] font-mono">
              Max Optionen: {MAX_OPTIONS}
            </span>
          </div>
        </div>
      </div>

      {/* TITLE SECTION */}
      <div className={UI.shell}>
        <div className={UI.shellInner}>
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <label className={UI.inputLabel}>Formular Titel (Popup Überschrift)</label>
              <input
                value={data.title || ""}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className={cn(
                  "w-full text-3xl sm:text-4xl font-extrabold bg-transparent border-none p-0 focus:ring-0 placeholder:text-[#4E5058] text-[#F2F3F5] outline-none transition-colors"
                )}
                placeholder="Create Ticket"
                maxLength={45}
              />
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[#1E1F22] bg-[#232428]/60 text-[#949BA4]">
                <GripHorizontal className="inline w-3.5 h-3.5 mr-1" />
                Drag & Drop
              </span>
              <span className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[#1E1F22] bg-[#232428]/60 text-[#949BA4]">
                Klick zum Einklappen
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENTS SECTION */}
      <div className={UI.shell}>
        <div className={UI.shellInner}>
          <div className={UI.sectionHeader}>
            <div className={UI.sectionTitleWrap}>
              <div className="flex items-center gap-3">
                <h3 className={UI.sectionTitle}>Eingabefelder</h3>
                <span
                  className={cn(
                    UI.badge,
                    (data.components || []).length >= MAX_COMPONENTS
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-[#232428]/60 text-[#949BA4] border-[#1E1F22]"
                  )}
                >
                  {(data.components || []).length} / {MAX_COMPONENTS}
                </span>
              </div>
              <p className={UI.sectionSub}>Definiere die Fragen und Optionen für den Nutzer.</p>
            </div>

            <AddFieldMenu onAdd={addComp} disabled={(data.components || []).length >= MAX_COMPONENTS} />
          </div>

          <div className="mt-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={(data.components || []).map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col min-h-[50px]">
                  {(data.components || []).map((comp) => (
                    <SortableComponentItem
                      key={comp.id}
                      component={comp}
                      onChange={changeComp}
                      onDelete={delComp}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeComponent ? (
                  <div className="w-full max-w-5xl cursor-grabbing">
                    <ComponentRow component={activeComponent} isOverlay={true} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {(data.components || []).length === 0 && (
              <div onClick={() => addComp(KINDS.TEXT_INPUT)} className={UI.emptyState}>
                <div className="w-16 h-16 bg-[#2B2D31] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-[#1E1F22] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <Plus className="w-8 h-8 text-[#949BA4]" />
                </div>
                <h3 className="text-sm font-extrabold text-[#DBDEE1]">Noch keine Felder</h3>
                <p className="text-xs text-[#949BA4] mt-1">Klicke hier, um dein erstes Eingabefeld zu erstellen.</p>
              </div>
            )}

            {/* Footer hint */}
            <div className="mt-6 rounded-xl border border-[#1E1F22] bg-[#232428]/40 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2]">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-extrabold text-[#DBDEE1]">Regeln</div>
                  <div className="text-xs text-[#949BA4] leading-relaxed">
                    Mindestens <b className="text-[#DBDEE1]">1 Feld</b> muss immer vorhanden sein. Das System-Feld{" "}
                    <b className="text-[#DBDEE1]">ticket_cat</b> kann nicht gelöscht werden.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}
