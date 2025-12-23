"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { nanoid } from "nanoid";

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import EmojiPicker from "emoji-picker-react";

/** Limits */
const MAX_COMPONENTS = 5;
const MIN_COMPONENTS = 1;
const MAX_SELECT_OPTIONS = 25;
const MIN_SELECT_OPTIONS = 1;

/** Kinds */
const KINDS = {
  TEXT_INPUT: "TEXT_INPUT",
  STRING_SELECT: "STRING_SELECT",
  TEXT_DISPLAY: "TEXT_DISPLAY",
  USER_SELECT: "USER_SELECT",
  CHANNEL_SELECT: "CHANNEL_SELECT",
  ROLE_SELECT: "ROLE_SELECT",
  MENTIONABLE_SELECT: "MENTIONABLE_SELECT",
  FILE_UPLOAD: "FILE_UPLOAD",
};

const ADD_MENU = [
  { kind: KINDS.TEXT_INPUT, label: "Text Input" },
  { kind: KINDS.STRING_SELECT, label: "Select Menu" },
  { kind: KINDS.TEXT_DISPLAY, label: "Text Display" },
  { kind: KINDS.USER_SELECT, label: "User Select" },
  { kind: KINDS.CHANNEL_SELECT, label: "Channel Select" },
  { kind: KINDS.ROLE_SELECT, label: "Role Select" },
  { kind: KINDS.MENTIONABLE_SELECT, label: "User & Role Select" },
  { kind: KINDS.FILE_UPLOAD, label: "File Upload" },
];

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}
function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Defaults */
function defaultSelectOptions() {
  return [
    {
      id: nanoid(),
      collapsed: true, // ✅ default collapsed
      emoji: "",
      label: "Option",
      description: "",
      value: "option_1",
      isDefault: true,
    },
  ];
}

function defaultComponent(kind) {
  const id = nanoid();

  const supportsRequired =
    kind === KINDS.TEXT_INPUT ||
    kind === KINDS.STRING_SELECT ||
    kind === KINDS.USER_SELECT ||
    kind === KINDS.CHANNEL_SELECT ||
    kind === KINDS.ROLE_SELECT ||
    kind === KINDS.MENTIONABLE_SELECT ||
    kind === KINDS.FILE_UPLOAD;

  const base = {
    id,
    kind,
    collapsed: true,
    label:
      kind === KINDS.TEXT_DISPLAY
        ? "Text Display"
        : kind === KINDS.STRING_SELECT
        ? "Select Menu"
        : kind === KINDS.FILE_UPLOAD
        ? "File Upload"
        : kind === KINDS.USER_SELECT
        ? "User Select"
        : kind === KINDS.ROLE_SELECT
        ? "Role Select"
        : kind === KINDS.CHANNEL_SELECT
        ? "Channel Select"
        : kind === KINDS.MENTIONABLE_SELECT
        ? "User & Role Select"
        : "Text Input",
    description: "",
    custom_id: kind === KINDS.TEXT_DISPLAY ? "" : `input_${id.slice(0, 8)}`,
    required: supportsRequired ? true : false,
    placeholder: "",
  };

  if (kind === KINDS.TEXT_INPUT) {
    return {
      ...base,
      style: 1, // 1 short, 2 paragraph
      max_length: 4000,
      placeholder: "",
    };
  }

  if (kind === KINDS.STRING_SELECT) {
    return {
      ...base,
      min_values: 1,
      max_values: 1,
      placeholder: "Aktivität auswählen...",
      options: defaultSelectOptions(),
    };
  }

  if (
    kind === KINDS.USER_SELECT ||
    kind === KINDS.ROLE_SELECT ||
    kind === KINDS.MENTIONABLE_SELECT ||
    kind === KINDS.CHANNEL_SELECT
  ) {
    return {
      ...base,
      min_values: 1,
      max_values: 1,
      placeholder: "Select…",
      channel_types: kind === KINDS.CHANNEL_SELECT ? [] : undefined,
    };
  }

  if (kind === KINDS.FILE_UPLOAD) {
    return {
      ...base,
      min_values: 1,
      max_values: 1,
    };
  }

  if (kind === KINDS.TEXT_DISPLAY) {
    return { ...base, content: "Hier kannst du Text anzeigen." };
  }

  return base;
}

const useBuilderStore = create((set, get) => ({
  modal: {
    title: "Modal",
    custom_id: "modal",
    components: [defaultComponent(KINDS.TEXT_INPUT)],
  },

  setTitle: (title) => set((s) => ({ modal: { ...s.modal, title } })),
  setCustomId: (custom_id) => set((s) => ({ modal: { ...s.modal, custom_id } })),

  // NEW: Action to completely overwrite modal state (for loading existing data)
  setFullModal: (newModal) => set({ modal: newModal }),

  addComponent: (kind) => {
    const { modal } = get();
    if (modal.components.length >= MAX_COMPONENTS) return;
    set((s) => ({
      modal: { ...s.modal, components: [...s.modal.components, defaultComponent(kind)] },
    }));
  },

  toggleCollapsed: (id) =>
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === id ? { ...c, collapsed: !c.collapsed } : c)),
      },
    })),

  removeComponent: (id) => {
    const { modal } = get();
    if (modal.components.length <= MIN_COMPONENTS) return;
    set((s) => ({
      modal: { ...s.modal, components: s.modal.components.filter((x) => x.id !== id) },
    }));
  },

  updateComponent: (id, patch) =>
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      },
    })),

  reorder: (activeId, overId) => {
    const { modal } = get();
    const from = modal.components.findIndex((x) => x.id === activeId);
    const to = modal.components.findIndex((x) => x.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...modal.components];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ modal: { ...modal, components: next } });
  },

  /** ✅ Select Options */
  addSelectOption: (componentId) => {
    const { modal } = get();
    const comp = modal.components.find((c) => c.id === componentId);
    if (!comp || comp.kind !== KINDS.STRING_SELECT) return;

    const opts = Array.isArray(comp.options) ? comp.options : [];
    if (opts.length >= MAX_SELECT_OPTIONS) return;

    let next = [
      ...opts,
      {
        id: nanoid(),
        collapsed: true, // ✅ default collapsed
        emoji: "",
        label: `Option ${opts.length + 1}`,
        description: "",
        value: `option_${opts.length + 1}`,
        isDefault: false,
      },
    ];

    if (!next.some((o) => o.isDefault)) next = next.map((o, i) => ({ ...o, isDefault: i === 0 }));

    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === componentId ? { ...c, options: next } : c)),
      },
    }));
  },

  toggleSelectOptionCollapsed: (componentId, optionId) => {
    const { modal } = get();
    const comp = modal.components.find((c) => c.id === componentId);
    if (!comp || comp.kind !== KINDS.STRING_SELECT) return;

    const opts = Array.isArray(comp.options) ? comp.options : [];
    const next = opts.map((o) => (o.id === optionId ? { ...o, collapsed: !o.collapsed } : o));

    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === componentId ? { ...c, options: next } : c)),
      },
    }));
  },

  reorderSelectOption: (componentId, activeId, overId) => {
    const { modal } = get();
    const comp = modal.components.find((c) => c.id === componentId);
    if (!comp || comp.kind !== KINDS.STRING_SELECT) return;

    const opts = Array.isArray(comp.options) ? comp.options : [];
    const from = opts.findIndex((o) => o.id === activeId);
    const to = opts.findIndex((o) => o.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...opts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === componentId ? { ...c, options: next } : c)),
      },
    }));
  },

  updateSelectOption: (componentId, optionId, patch) => {
    const { modal } = get();
    const comp = modal.components.find((c) => c.id === componentId);
    if (!comp || comp.kind !== KINDS.STRING_SELECT) return;

    let next = (Array.isArray(comp.options) ? comp.options : []).map((o) =>
      o.id === optionId ? { ...o, ...patch } : o
    );

    if (patch && patch.isDefault === true) {
      next = next.map((o) => (o.id === optionId ? { ...o, isDefault: true } : { ...o, isDefault: false }));
    }

    if (!next.some((o) => o.isDefault) && next.length > 0) {
      next = next.map((o, idx) => ({ ...o, isDefault: idx === 0 }));
    }

    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === componentId ? { ...c, options: next } : c)),
      },
    }));
  },

  removeSelectOption: (componentId, optionId) => {
    const { modal } = get();
    const comp = modal.components.find((c) => c.id === componentId);
    if (!comp || comp.kind !== KINDS.STRING_SELECT) return;

    const opts = Array.isArray(comp.options) ? comp.options : [];
    if (opts.length <= MIN_SELECT_OPTIONS) return;

    let next = opts.filter((o) => o.id !== optionId);
    if (!next.some((o) => o.isDefault) && next.length > 0) {
      next = next.map((o, idx) => ({ ...o, isDefault: idx === 0 }));
    }

    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((c) => (c.id === componentId ? { ...c, options: next } : c)),
      },
    }));
  },
}));

/** Outputs */
function buildDiscordModalJSON(modal) {
  const out = { title: modal.title, custom_id: modal.custom_id, components: [] };

  for (const c of modal.components) {
    if (c.kind === KINDS.TEXT_DISPLAY) {
      out.components.push({ type: 10, content: c.content || "" });
      continue;
    }

    out.components.push({
      type: 18,
      label: c.label || "",
      description: c.description || undefined,
      component: buildInnerComponent(c),
    });
  }
  return removeUndefDeep(out);
}

function buildInnerComponent(c) {
  if (c.kind === KINDS.TEXT_INPUT) {
    return {
      type: 4,
      custom_id: c.custom_id,
      style: c.style || 1,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      max_length: Number.isFinite(c.max_length) ? c.max_length : undefined,
    };
  }

  if (c.kind === KINDS.STRING_SELECT) {
    const opts = Array.isArray(c.options) ? c.options : [];
    return {
      type: 3,
      custom_id: c.custom_id,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
      options: opts.map((o) => ({
        label: o.label,
        value: o.value,
        description: o.description || undefined,
        default: !!o.isDefault,
        emoji: o.emoji ? { name: o.emoji } : undefined,
      })),
    };
  }

  if (c.kind === KINDS.USER_SELECT)
    return {
      type: 5,
      custom_id: c.custom_id,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
    };

  if (c.kind === KINDS.ROLE_SELECT)
    return {
      type: 6,
      custom_id: c.custom_id,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
    };

  if (c.kind === KINDS.MENTIONABLE_SELECT)
    return {
      type: 7,
      custom_id: c.custom_id,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
    };

  if (c.kind === KINDS.CHANNEL_SELECT)
    return {
      type: 8,
      custom_id: c.custom_id,
      required: !!c.required,
      placeholder: c.placeholder || undefined,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
      channel_types: Array.isArray(c.channel_types) ? c.channel_types : [],
    };

  if (c.kind === KINDS.FILE_UPLOAD)
    return {
      type: 19,
      custom_id: c.custom_id,
      required: !!c.required,
      min_values: c.min_values ?? 1,
      max_values: c.max_values ?? 1,
    };

  return { type: 4, custom_id: c.custom_id || "unknown", style: 1 };
}

function jsString(s) {
  return JSON.stringify(String(s ?? ""));
}

function buildDiscordJsCode(modal) {
  const used = new Set(["ModalBuilder", "LabelBuilder"]);
  if (modal.components.some((c) => c.kind === KINDS.TEXT_INPUT)) used.add("TextInputBuilder"), used.add("TextInputStyle");
  if (modal.components.some((c) => c.kind === KINDS.STRING_SELECT))
    used.add("StringSelectMenuBuilder"), used.add("StringSelectMenuOptionBuilder");
  if (modal.components.some((c) => c.kind === KINDS.FILE_UPLOAD)) used.add("FileUploadBuilder");
  if (modal.components.some((c) => c.kind === KINDS.USER_SELECT)) used.add("UserSelectMenuBuilder");
  if (modal.components.some((c) => c.kind === KINDS.ROLE_SELECT)) used.add("RoleSelectMenuBuilder");
  if (modal.components.some((c) => c.kind === KINDS.MENTIONABLE_SELECT)) used.add("MentionableSelectMenuBuilder");
  if (modal.components.some((c) => c.kind === KINDS.CHANNEL_SELECT)) used.add("ChannelSelectMenuBuilder");

  const lines = [];
  lines.push(`import { ${Array.from(used).sort().join(", ")} } from "discord.js";`);
  lines.push("");
  lines.push("interaction.showModal(");
  lines.push("  new ModalBuilder()");
  lines.push(`    .setTitle(${jsString(modal.title)})`);
  lines.push(`    .setCustomId(${jsString(modal.custom_id)})`);

  for (const c of modal.components) {
    if (c.kind === KINDS.TEXT_DISPLAY) continue;

    lines.push("    .addLabelComponents(");
    lines.push("      new LabelBuilder()");
    lines.push(`        .setLabel(${jsString(c.label)})`);
    if (c.description) lines.push(`        .setDescription(${jsString(c.description)})`);

    if (c.kind === KINDS.TEXT_INPUT) {
      lines.push("        .setTextInputComponent(");
      lines.push("          new TextInputBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setStyle(${c.style === 2 ? "TextInputStyle.Paragraph" : "TextInputStyle.Short"})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      if (Number.isFinite(c.max_length)) lines.push(`            .setMaxLength(${Number(c.max_length)})`);
      lines.push("        )");
    }

    if (c.kind === KINDS.STRING_SELECT) {
      const opts = Array.isArray(c.options) ? c.options : [];
      lines.push("        .setStringSelectMenuComponent(");
      lines.push("          new StringSelectMenuBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      if (opts.length > 0) {
        lines.push("            .addOptions(");
        opts.forEach((o, idx) => {
          const parts = [
            "new StringSelectMenuOptionBuilder()",
            `.setLabel(${jsString(o.label)})`,
            `.setValue(${jsString(o.value)})`,
          ];
          if (o.description) parts.push(`.setDescription(${jsString(o.description)})`);
          if (o.emoji) parts.push(`.setEmoji(${jsString(o.emoji)})`);
          if (o.isDefault) parts.push(".setDefault(true)");
          lines.push(`              ${parts.join("")}${idx === opts.length - 1 ? "" : ","}`);
        });
        lines.push("            )");
      }
      lines.push("        )");
    }

    if (c.kind === KINDS.FILE_UPLOAD) {
      lines.push("        .setFileUploadComponent(");
      lines.push("          new FileUploadBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      lines.push("        )");
    }

    if (c.kind === KINDS.USER_SELECT) {
      lines.push("        .setUserSelectMenuComponent(");
      lines.push("          new UserSelectMenuBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      lines.push("        )");
    }

    if (c.kind === KINDS.ROLE_SELECT) {
      lines.push("        .setRoleSelectMenuComponent(");
      lines.push("          new RoleSelectMenuBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      lines.push("        )");
    }

    if (c.kind === KINDS.MENTIONABLE_SELECT) {
      lines.push("        .setMentionableSelectMenuComponent(");
      lines.push("          new MentionableSelectMenuBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      lines.push("        )");
    }

    if (c.kind === KINDS.CHANNEL_SELECT) {
      lines.push("        .setChannelSelectMenuComponent(");
      lines.push("          new ChannelSelectMenuBuilder()");
      lines.push(`            .setCustomId(${jsString(c.custom_id)})`);
      lines.push(`            .setRequired(${c.required ? "true" : "false"})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${jsString(c.placeholder)})`);
      lines.push(`            .setMinValues(${Number(c.min_values ?? 1)})`);
      lines.push(`            .setMaxValues(${Number(c.max_values ?? 1)})`);
      lines.push("        )");
    }

    lines.push("    )");
  }

  lines.push(");");
  return lines.join("\n");
}

/** BOT code */
function removeUndefDeep(obj) {
  if (Array.isArray(obj)) return obj.map(removeUndefDeep).filter((v) => v !== undefined);
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const vv = removeUndefDeep(v);
    if (vv === undefined) continue;
    if (typeof vv === "string" && vv.length === 0) continue;
    out[k] = vv;
  }
  return out;
}
function b64urlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function buildBotPayload(modal) {
  const kindCode = (k) => {
    switch (k) {
      case KINDS.TEXT_INPUT:
        return "ti";
      case KINDS.STRING_SELECT:
        return "ss";
      case KINDS.USER_SELECT:
        return "us";
      case KINDS.ROLE_SELECT:
        return "rs";
      case KINDS.MENTIONABLE_SELECT:
        return "ms";
      case KINDS.CHANNEL_SELECT:
        return "cs";
      case KINDS.FILE_UPLOAD:
        return "fu";
      case KINDS.TEXT_DISPLAY:
        return "td";
      default:
        return "u";
    }
  };

  const comps = modal.components.map((c) => {
    const base = { k: kindCode(c.kind), l: c.label, d: c.description || undefined };

    if (c.kind === KINDS.TEXT_DISPLAY) return { ...base, x: c.content || "" };

    const common = { ...base, id: c.custom_id, r: c.required ? 1 : 0, p: c.placeholder || undefined };

    if (c.kind === KINDS.TEXT_INPUT) return { ...common, s: c.style === 2 ? 2 : 1, mx: c.max_length ?? undefined };

    if (c.kind === KINDS.STRING_SELECT) {
      const opts = Array.isArray(c.options) ? c.options : [];
      return {
        ...common,
        nv: c.min_values ?? 1,
        xv: c.max_values ?? 1,
        o: opts.map((o) => ({
          e: o.emoji || undefined,
          l: o.label,
          d: o.description || undefined,
          v: o.value,
          df: o.isDefault ? 1 : 0,
        })),
      };
    }

    if (c.kind === KINDS.FILE_UPLOAD) return { ...common, nv: c.min_values ?? 1, xv: c.max_values ?? 1 };

    return { ...common, nv: c.min_values ?? 1, xv: c.max_values ?? 1 };
  });

  return removeUndefDeep({ t: modal.title, i: modal.custom_id, c: comps });
}
function buildBotCode(modal) {
  const payload = buildBotPayload(modal);
  return `BOT:v1:${b64urlEncode(JSON.stringify(payload))}`;
}

/** Add menu */
function AddComponentMenu({ onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold",
          disabled ? "bg-white/5 text-gray-500 cursor-not-allowed" : "bg-[#5865F2] hover:bg-[#4f5ae6] text-white cursor-pointer"
        )}
      >
        Add <span className="text-white/80">{open ? "▴" : "▾"}</span>
      </button>

      {open && !disabled && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#18191c] shadow-2xl z-50">
          <div className="p-1">
            {ADD_MENU.map((x) => (
              <button
                key={x.kind}
                type="button"
                onClick={() => {
                  onAdd(x.kind);
                  setOpen(false);
                }}
                className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5"
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Switch */
function Toggle({ label, value, onChange }) {
  const left = value ? 26 : 2;
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-gray-200">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn("relative h-6 w-12 rounded-full transition-colors cursor-pointer", value ? "bg-[#5865F2]" : "bg-white/10")}
        aria-pressed={value}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]" style={{ left }} />
      </button>
    </div>
  );
}

function usePortalRoot() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? document.body : null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/** Emoji Picker + Clear button (✅ mobile portal + prevent autofocus keyboard) */
function EmojiPickerButton({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const portalRoot = usePortalRoot();
  const isMobile = useIsMobile();

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const openPicker = () => {
    setOpen(true);
    // ✅ prevent mobile keyboard autofocus
    setTimeout(() => {
      try {
        if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
      } catch {}
    }, 0);
  };

  const pickerUI = (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-[#111214] shadow-2xl overflow-hidden",
        isMobile ? "w-[92vw] max-w-[420px]" : ""
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      <EmojiPicker
        onEmojiClick={(emojiData) => {
          onChange(emojiData?.emoji || "");
          setOpen(false);
        }}
        theme="dark"
        lazyLoadEmojis
        height={isMobile ? 420 : 360}
        width={isMobile ? "100%" : 340}
      />
      <div className="p-2 border-t border-white/10 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          className="relative h-10 w-10 rounded-md bg-[#1e1f22] ring-1 ring-white/10 hover:bg-[#232428] flex items-center justify-center text-lg cursor-pointer"
          title="Emoji"
        >
          {value ? value : "＋"}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-10 px-3 rounded-md bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-xs font-semibold cursor-pointer"
            title="Remove emoji"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Desktop dropdown */}
      {open && !isMobile && (
        <div className="absolute z-50 mt-2">{pickerUI}</div>
      )}

      {/* ✅ Mobile portal fullscreen */}
      {open && isMobile && portalRoot
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
              <div className="w-full flex items-center justify-center">
                {pickerUI}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}

/** Sortable Option Card */
function SortableOptionCard({ compId, optionId, title, canDelete, onDelete, children }) {
  const { toggleSelectOptionCollapsed } = useBuilderStore();
  const { modal } = useBuilderStore();
  const comp = modal.components.find((c) => c.id === compId);
  const option = (Array.isArray(comp?.options) ? comp.options : []).find((o) => o.id === optionId);

  const sortable = useSortable({ id: optionId });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };

  const open = option ? !option.collapsed : false;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn("rounded-lg bg-white/[0.03] ring-1 ring-white/10 overflow-hidden", sortable.isDragging && "ring-2 ring-[#5865F2]")}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            {...sortable.attributes}
            {...sortable.listeners}
            type="button"
            className="select-none rounded-md bg-white/5 px-2 py-1 text-xs text-gray-200 hover:bg-white/10 cursor-grab active:cursor-grabbing"
            title="Drag"
          >
            ⋮⋮
          </button>

          <button
            type="button"
            onClick={() => toggleSelectOptionCollapsed(compId, optionId)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
          >
            <span className="text-gray-300">{open ? "▾" : "▸"}</span>
            <span className="text-sm font-semibold text-gray-200 truncate">{title}</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold",
            canDelete ? "bg-white/5 hover:bg-white/10 cursor-pointer" : "bg-white/5 text-gray-600 cursor-not-allowed"
          )}
          title={canDelete ? "Remove option" : "At least 1 option required"}
        >
          🗑
        </button>
      </div>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

/** Select options editor (✅ drag & drop) */
function SelectOptionsEditor({ comp }) {
  const { addSelectOption, updateSelectOption, removeSelectOption, reorderSelectOption } = useBuilderStore();
  const options = Array.isArray(comp.options) ? comp.options : [];
  const canAdd = options.length < MAX_SELECT_OPTIONS;
  const canDelete = options.length > MIN_SELECT_OPTIONS;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    reorderSelectOption(comp.id, activeId, overId);
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-gray-400">Options (1–{MAX_SELECT_OPTIONS})</div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {options.map((o, idx) => (
              <SortableOptionCard
                key={o.id}
                compId={comp.id}
                optionId={o.id}
                title={`Option ${idx + 1} - ${o.label || "Option"}`}
                onDelete={() => removeSelectOption(comp.id, o.id)}
                canDelete={canDelete}
              >
                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-3 items-start">
                  <div className="grid gap-1">
                    <div className="text-[11px] text-gray-400">Emoji</div>
                    <EmojiPickerButton
                      value={o.emoji || ""}
                      onChange={(v) => updateSelectOption(comp.id, o.id, { emoji: v })}
                    />
                  </div>

                  <div className="grid gap-3 min-w-0">
                    <label className="grid gap-1 min-w-0">
                      <span className="text-[11px] text-gray-400">Label ({(o.label || "").length}/100)</span>
                      <input
                        className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                        value={o.label || ""}
                        onChange={(e) => updateSelectOption(comp.id, o.id, { label: e.target.value })}
                        maxLength={100}
                      />
                    </label>

                    <label className="grid gap-1 min-w-0">
                      <span className="text-[11px] text-gray-400">Description ({(o.description || "").length}/100)</span>
                      <input
                        className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                        value={o.description || ""}
                        onChange={(e) => updateSelectOption(comp.id, o.id, { description: e.target.value })}
                        maxLength={100}
                      />
                    </label>

                    <label className="grid gap-1 min-w-0">
                      <span className="text-[11px] text-gray-400">Value</span>
                      <input
                        className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                        value={o.value || ""}
                        onChange={(e) => updateSelectOption(comp.id, o.id, { value: e.target.value })}
                        maxLength={100}
                      />
                    </label>

                    <Toggle
                      label="Default selection"
                      value={!!o.isDefault}
                      onChange={(v) => updateSelectOption(comp.id, o.id, { isDefault: v })}
                    />
                  </div>
                </div>
              </SortableOptionCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        disabled={!canAdd}
        onClick={() => addSelectOption(comp.id)}
        className={cn(
          "rounded-md px-3 py-2 text-xs font-semibold",
          canAdd ? "bg-[#5865F2] hover:bg-[#4f5ae6] cursor-pointer" : "bg-white/5 text-gray-500 cursor-not-allowed"
        )}
      >
        Add Option
      </button>
    </div>
  );
}

/** Sortable component card */
function SortableComponentCard({ compId }) {
  const { modal, toggleCollapsed, updateComponent, removeComponent } = useBuilderStore();
  const c = modal.components.find((x) => x.id === compId);
  if (!c) return null;

  const sortable = useSortable({ id: c.id });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };

  const canDelete = modal.components.length > MIN_COMPONENTS;

  const supportsRequired =
    c.kind === KINDS.TEXT_INPUT ||
    c.kind === KINDS.STRING_SELECT ||
    c.kind === KINDS.USER_SELECT ||
    c.kind === KINDS.CHANNEL_SELECT ||
    c.kind === KINDS.ROLE_SELECT ||
    c.kind === KINDS.MENTIONABLE_SELECT ||
    c.kind === KINDS.FILE_UPLOAD;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn("rounded-lg ring-1 ring-white/10 overflow-hidden bg-white/[0.03]", sortable.isDragging && "ring-2 ring-[#5865F2]")}
    >
      <div className="flex items-center gap-3 p-3 border-b border-white/10">
        <button
          {...sortable.attributes}
          {...sortable.listeners}
          type="button"
          className="select-none rounded-md bg-white/5 px-2 py-1 text-xs text-gray-200 hover:bg-white/10 cursor-grab active:cursor-grabbing"
          title="Drag"
        >
          ⋮⋮
        </button>

        <button
          type="button"
          onClick={() => toggleCollapsed(c.id)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
        >
          <span className="text-gray-300">{c.collapsed ? "▸" : "▾"}</span>
          <span className="text-sm font-semibold text-gray-200 truncate">{c.label || "Component"}</span>
          <span className="text-xs text-gray-500 truncate">
            {c.kind === KINDS.TEXT_INPUT
              ? "Text Input"
              : c.kind === KINDS.STRING_SELECT
              ? "Select Menu"
              : c.kind === KINDS.FILE_UPLOAD
              ? "File Upload"
              : c.kind === KINDS.TEXT_DISPLAY
              ? "Text Display"
              : c.kind}
          </span>
        </button>

        <button
          type="button"
          disabled={!canDelete}
          onClick={() => removeComponent(c.id)}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold",
            canDelete ? "bg-white/5 hover:bg-white/10 cursor-pointer" : "bg-white/5 text-gray-600 cursor-not-allowed"
          )}
          title={canDelete ? "Remove" : "At least 1 component required"}
        >
          🗑
        </button>
      </div>

      {!c.collapsed && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1 min-w-0">
              <span className="text-[11px] text-gray-400">
                Label <span className="text-red-400">*</span> ({(c.label || "").length}/45)
              </span>
              <input
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={c.label || ""}
                onChange={(e) => updateComponent(c.id, { label: e.target.value })}
                maxLength={45}
              />
            </label>

            <label className="grid gap-1 min-w-0">
              <span className="text-[11px] text-gray-400">Description ({(c.description || "").length}/100)</span>
              <input
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={c.description || ""}
                onChange={(e) => updateComponent(c.id, { description: e.target.value })}
                maxLength={100}
              />
            </label>
          </div>

          {c.kind !== KINDS.TEXT_DISPLAY && (
            <label className="grid gap-1 min-w-0">
              <span className="text-[11px] text-gray-400">custom_id</span>
              <input
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={c.custom_id || ""}
                onChange={(e) => updateComponent(c.id, { custom_id: e.target.value })}
              />
            </label>
          )}

          {supportsRequired ? (
            <Toggle label="Required" value={!!c.required} onChange={(v) => updateComponent(c.id, { required: v })} />
          ) : null}

          {c.kind === KINDS.TEXT_INPUT && (
            <>
              <Toggle label="Multiline" value={c.style === 2} onChange={(v) => updateComponent(c.id, { style: v ? 2 : 1 })} />

              <label className="grid gap-1">
                <span className="text-[11px] text-gray-400">Max Length (1–4000)</span>
                <input
                  type="number"
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={Number.isFinite(c.max_length) ? c.max_length : 4000}
                  onChange={(e) => updateComponent(c.id, { max_length: clampInt(e.target.value, 1, 4000) })}
                />
              </label>

              <label className="grid gap-1 min-w-0">
                <span className="text-[11px] text-gray-400">Placeholder ({(c.placeholder || "").length}/100)</span>
                <input
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={c.placeholder || ""}
                  onChange={(e) => updateComponent(c.id, { placeholder: e.target.value })}
                  maxLength={100}
                />
              </label>
            </>
          )}

          {c.kind === KINDS.STRING_SELECT && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-[11px] text-gray-400">Min Values (0–1)</span>
                  <input
                    type="number"
                    className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={c.min_values ?? 1}
                    onChange={(e) => updateComponent(c.id, { min_values: clampInt(e.target.value, 0, 1) })}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] text-gray-400">Max Values (=1)</span>
                  <input
                    type="number"
                    className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={c.max_values ?? 1}
                    onChange={() => updateComponent(c.id, { max_values: 1 })}
                  />
                </label>
              </div>

              <label className="grid gap-1 min-w-0">
                <span className="text-[11px] text-gray-400">Placeholder ({(c.placeholder || "").length}/150)</span>
                <input
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={c.placeholder || ""}
                  onChange={(e) => updateComponent(c.id, { placeholder: e.target.value })}
                  maxLength={150}
                />
              </label>

              <SelectOptionsEditor comp={c} />
            </>
          )}

          {(c.kind === KINDS.USER_SELECT ||
            c.kind === KINDS.ROLE_SELECT ||
            c.kind === KINDS.MENTIONABLE_SELECT ||
            c.kind === KINDS.CHANNEL_SELECT) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-[11px] text-gray-400">Min Values</span>
                  <input
                    type="number"
                    className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={c.min_values ?? 1}
                    onChange={(e) => updateComponent(c.id, { min_values: clampInt(e.target.value, 0, 25) })}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] text-gray-400">Max Values</span>
                  <input
                    type="number"
                    className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={c.max_values ?? 1}
                    onChange={(e) => updateComponent(c.id, { max_values: clampInt(e.target.value, 1, 25) })}
                  />
                </label>
              </div>

              <label className="grid gap-1 min-w-0">
                <span className="text-[11px] text-gray-400">Placeholder</span>
                <input
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={c.placeholder || ""}
                  onChange={(e) => updateComponent(c.id, { placeholder: e.target.value })}
                />
              </label>
            </>
          )}

          {c.kind === KINDS.FILE_UPLOAD && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-[11px] text-gray-400">Min Files</span>
                <input
                  type="number"
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={c.min_values ?? 1}
                  onChange={(e) => updateComponent(c.id, { min_values: clampInt(e.target.value, 0, 10) })}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] text-gray-400">Max Files</span>
                <input
                  type="number"
                  className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  value={c.max_values ?? 1}
                  onChange={(e) => updateComponent(c.id, { max_values: clampInt(e.target.value, 1, 10) })}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** DnD list */
function ComponentsEditor() {
  const { modal, reorder } = useBuilderStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    reorder(activeId, overId);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={modal.components.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {modal.components.map((c) => (
            <SortableComponentCard key={c.id} compId={c.id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** Guild icon resolver */
function useGuildIcon(guildId) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const u = new URL(window.location.href);
      const icon = u.searchParams.get("icon");
      if (icon) {
        setUrl(icon);
        return;
      }
    } catch {}

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const imgs = Array.from(document.querySelectorAll("img"));
      const match = imgs.find(
        (img) => typeof img.src === "string" && img.src.includes(`cdn.discordapp.com/icons/${guildId}/`)
      );
      if (match?.src) {
        setUrl(match.src);
        clearInterval(timer);
      }
      if (tries > 20) clearInterval(timer);
    }, 200);

    return () => clearInterval(timer);
  }, [guildId]);

  return url;
}

/** Preview Select: Discord-like */
function PreviewSelect({ label, description, required, placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);

  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const portalRoot = usePortalRoot();

  const selected = options.find((o) => o.value === value);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 320 });

  useEffect(() => {
    function recalc() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 6, width: r.width });
    }

    if (open) {
      recalc();
      window.addEventListener("scroll", recalc, true);
      window.addEventListener("resize", recalc);
      return () => {
        window.removeEventListener("scroll", recalc, true);
        window.removeEventListener("resize", recalc);
      };
    }
  }, [open]);

  useEffect(() => {
    const onDoc = (e) => {
      const a = anchorRef.current;
      const d = dropdownRef.current;
      if (a && a.contains(e.target)) return;
      if (d && d.contains(e.target)) return;
      setOpen(false);
      setHoveredValue(null);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setHoveredValue(null);
      }
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hasValue = !!value;

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
        {label}
        {required && <span className="text-[#ED4245]">*</span>}
      </div>

      {description ? <div className="text-xs text-[#B5BAC1]">{description}</div> : null}

      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-10 flex items-center justify-between gap-2 px-3",
          "rounded-[6px] bg-[#17181b] text-sm text-[#DBDEE1]",
          "ring-1 ring-[#3b3d44] outline-none cursor-pointer",
          open ? "ring-2 ring-[#5865F2]" : ""
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.emoji ? <span className="text-base">{selected.emoji}</span> : null}
          <div className={cn("truncate", selected ? "text-[#DBDEE1]" : "text-[#949BA4]")}>
            {selected ? selected.label : placeholder}
          </div>
        </div>

        {/* Right controls: Clear X + Chevron */}
        <div className="flex items-center gap-1">
          {hasValue ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setOpen(false);
                setHoveredValue(null);
              }}
              className={cn(
                "h-8 w-8 inline-flex items-center justify-center rounded-[6px]",
                "text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-white/5",
                "cursor-pointer"
              )}
              title="Clear"
              aria-label="Clear selection"
            >
              ✕
            </button>
          ) : null}

          <span className="h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-[#B5BAC1]" aria-hidden>
            <span className="text-base leading-none">{open ? "▴" : "▾"}</span>
          </span>
        </div>
      </button>

      {open && portalRoot
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
              className="rounded-[8px] border border-[#1F2225] bg-[#2B2D31] shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="max-h-[240px] overflow-auto">
                {options.map((o) => {
                  const isActive = o.value === value;
                  const isHovered = hoveredValue === o.value;

                  return (
                    <button
                      key={o.id}
                      type="button"
                      onMouseEnter={() => setHoveredValue(o.value)}
                      onMouseLeave={() => setHoveredValue(null)}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                        setHoveredValue(null);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left flex items-start gap-2 cursor-pointer",
                        "border-b border-white/5 last:border-b-0",
                        isActive ? "bg-[#3A3C43]" : isHovered ? "bg-[#2F3136]" : "bg-[#2B2D31]"
                      )}
                    >
                      <div className="mt-[2px] w-5 flex justify-center">{o.emoji ? <span className="text-base">{o.emoji}</span> : null}</div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[#F2F3F5] truncate font-semibold">{o.label}</div>
                        {o.description ? <div className="text-[12px] text-[#B5BAC1] truncate">{o.description}</div> : null}
                      </div>

                      <div className="w-6 flex justify-end">
                        {isActive ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#5865F2] text-white text-xs">
                            ✓
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}

/** Preview for auto-populated selects */
function PreviewAutoSelect({ kind, label, description, required, placeholder }) {
  const mock = useMemo(() => {
    const mk = (emoji, label, description) => ({ id: nanoid(), emoji, label, description, value: nanoid() });
    if (kind === KINDS.USER_SELECT) return [mk("👤", "User 1", "Test description"), mk("👤", "User 2", "Test description"), mk("👤", "User 3", "")];
    if (kind === KINDS.ROLE_SELECT) return [mk("🏷️", "Role A", "Test description"), mk("🏷️", "Role B", ""), mk("🏷️", "Role C", "")];
    if (kind === KINDS.CHANNEL_SELECT) return [mk("#️⃣", "#general", "Test description"), mk("#️⃣", "#support", ""), mk("#️⃣", "#off-topic", "")];
    return [mk("@", "Mentionable 1", "Test description"), mk("@", "Mentionable 2", ""), mk("@", "Mentionable 3", "")];
  }, [kind]);

  const [val, setVal] = useState(mock[0]?.value || "");

  useEffect(() => {
    // allow empty (cleared) state
    if (val !== "" && !mock.some((m) => m.value === val)) setVal(mock[0]?.value || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <PreviewSelect
      label={label}
      description={description}
      required={required}
      placeholder={placeholder || "Select…"}
      options={mock}
      value={val}
      onChange={setVal}
    />
  );
}

/** Preview modal */
function DiscordPreview({ guildId }) {
  const { modal } = useBuilderStore();
  const guildIconUrl = useGuildIcon(guildId);
  const [values, setValues] = useState({});

  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const c of modal.components) {
        if (c.kind === KINDS.TEXT_INPUT) {
          if (next[c.id] === undefined) next[c.id] = "";
        }
        if (c.kind === KINDS.STRING_SELECT) {
          const opts = Array.isArray(c.options) ? c.options : [];
          const def = opts.find((o) => o.isDefault) || opts[0];
          if (next[c.id] === undefined) next[c.id] = def?.value || "";
        }
      }
      return next;
    });
  }, [modal]);

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl bg-[#26272c] ring-1 ring-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            {guildIconUrl ? <img src={guildIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : null}
            <div className="font-semibold text-[#F2F3F5] truncate">{modal.title || "Modal"}</div>
          </div>

          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-white/5 cursor-pointer"
            title="Close"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 pb-4">
          {modal.components.map((c) => {
            const label = c.label || "Component";
            const desc = c.description || "";

            if (c.kind === KINDS.TEXT_DISPLAY) {
              return (
                <div
                  key={c.id}
                  className="rounded-[6px] bg-[#17181b] p-3 ring-1 ring-[#3b3d44] text-sm text-[#DBDEE1] whitespace-pre-wrap"
                >
                  {c.content || ""}
                </div>
              );
            }

            if (c.kind === KINDS.TEXT_INPUT) {
              const v = values[c.id] ?? "";
              return (
                <div key={c.id} className="space-y-1">
                  <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
                    {label}
                    {c.required && <span className="text-[#ED4245]">*</span>}
                  </div>

                  {desc ? <div className="text-xs text-[#B5BAC1]">{desc}</div> : null}

                  {c.style === 2 ? (
                    <textarea
                      value={v}
                      onChange={(e) => setValues((s) => ({ ...s, [c.id]: e.target.value }))}
                      placeholder={c.placeholder || ""}
                      className="w-full min-h-[96px] resize-none rounded-[6px] bg-[#17181b] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-[#3b3d44] outline-none focus:ring-2 focus:ring-[#5865F2]"
                    />
                  ) : (
                    <input
                      value={v}
                      onChange={(e) => setValues((s) => ({ ...s, [c.id]: e.target.value }))}
                      placeholder={c.placeholder || ""}
                      className="w-full h-10 rounded-[6px] bg-[#17181b] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-[#3b3d44] outline-none focus:ring-2 focus:ring-[#5865F2]"
                    />
                  )}
                </div>
              );
            }

            if (c.kind === KINDS.STRING_SELECT) {
              const opts = Array.isArray(c.options) ? c.options : [];
              const v = values[c.id] ?? "";
              return (
                <PreviewSelect
                  key={c.id}
                  label={label}
                  description={desc}
                  required={!!c.required}
                  placeholder={c.placeholder || "Select…"}
                  options={opts.map((o) => ({
                    id: o.id,
                    value: o.value,
                    label: o.label,
                    description: o.description || "",
                    emoji: o.emoji || "",
                  }))}
                  value={v}
                  onChange={(val) => setValues((s) => ({ ...s, [c.id]: val }))}
                />
              );
            }

            if (
              c.kind === KINDS.USER_SELECT ||
              c.kind === KINDS.ROLE_SELECT ||
              c.kind === KINDS.CHANNEL_SELECT ||
              c.kind === KINDS.MENTIONABLE_SELECT
            ) {
              return (
                <PreviewAutoSelect
                  key={c.id}
                  kind={c.kind}
                  label={label}
                  description={desc}
                  required={!!c.required}
                  placeholder={c.placeholder || "Select…"}
                />
              );
            }

            if (c.kind === KINDS.FILE_UPLOAD) {
              return (
                <div key={c.id} className="space-y-1">
                  <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
                    {label}
                    {c.required && <span className="text-[#ED4245]">*</span>}
                  </div>

                  {desc ? <div className="text-xs text-[#B5BAC1]">{desc}</div> : null}

                  <div className="rounded-[6px] bg-[#17181b] ring-1 ring-[#3b3d44] p-6 text-center">
                    <div className="text-[#DBDEE1] text-sm">
                      Drop file here or <span className="text-[#5865F2]">browse</span>
                    </div>
                    <div className="mt-1 text-xs text-[#949BA4]">Upload a file under 10MB.</div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="flex gap-3 border-t border-white/10 px-5 py-4">
          <button
            className="flex-1 rounded-[6px] bg-[#2B2D31] px-3 py-2 text-sm font-semibold hover:bg-[#313338] text-[#F2F3F5] cursor-pointer"
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-[6px] bg-[#5865F2] px-3 py-2 text-sm font-semibold hover:bg-[#4f5ae6] text-white cursor-pointer"
            type="button"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/** Main Component */
export default function ModalBuilderEditor({ initialData, onChange }) {
  // Use the store
  const { modal, setTitle, setCustomId, addComponent, setFullModal } = useBuilderStore();

  // Generate code on change
  const botCode = useMemo(() => buildBotCode(modal), [modal]);

  // Notify parent component (page.js) whenever modal state changes
  useEffect(() => {
    if (onChange) {
      onChange(botCode, modal);
    }
  }, [botCode, modal, onChange]);

  // Load initial data if provided (for editing existing modals)
  useEffect(() => {
    if (initialData) {
      setFullModal(initialData);
    }
  }, [initialData, setFullModal]);

  const canAdd = modal.components.length < MAX_COMPONENTS;

  return (
    <div className="w-full text-zinc-100 border rounded-xl border-white/10 bg-[#1e1f22]/50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6">
          
          {/* Editor Area */}
          <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
            <div className="border-b border-white/10 p-4">
              <div className="text-sm font-semibold">Modal Konfiguration</div>

              <div className="mt-3 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">
                    Fenster Titel <span className="text-red-400">*</span> ({(modal.title || "").length}/45)
                  </span>
                  <input
                    className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={modal.title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={45}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">custom_id (Technisch)</span>
                  <input
                    className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={modal.custom_id}
                    onChange={(e) => setCustomId(e.target.value)}
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Elemente ({modal.components.length}/{MAX_COMPONENTS})
                  </div>
                  <AddComponentMenu onAdd={addComponent} disabled={!canAdd} />
                </div>

                {!canAdd && <div className="text-xs text-amber-400">Maximal {MAX_COMPONENTS} Elemente pro Modal.</div>}
              </div>
            </div>

            <div className="p-4">
              <ComponentsEditor />
            </div>
          </div>

          {/* Preview Area (Optional, currently hidden to save space or can be added below) */}
          {/* You can add <DiscordPreview /> here if you want a live preview in the editor */}

        </div>
      </div>
    </div>
  );
}