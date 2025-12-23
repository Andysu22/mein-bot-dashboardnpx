"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { nanoid } from "nanoid";

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import EmojiPicker from "emoji-picker-react";

/** ========= Helpers ========= */
const MAX_COMPONENTS = 5;
const MAX_SELECT_OPTIONS = 25;

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toSafeCustomId(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_:\-]/g, "")
    .slice(0, 100);
  return t || "id";
}

/** ========= Kinds ========= */
const KINDS = Object.freeze({
  TEXT_INPUT: "text_input",
  STRING_SELECT: "string_select",
  TEXT_DISPLAY: "text_display",
  USER_SELECT: "user_select",
  CHANNEL_SELECT: "channel_select",
  ROLE_SELECT: "role_select",
  MENTIONABLE_SELECT: "mentionable_select",
  FILE_UPLOAD: "file_upload",
});

/** Which kinds support required */
const REQUIRED_KINDS = new Set([
  KINDS.TEXT_INPUT,
  KINDS.STRING_SELECT,
  KINDS.USER_SELECT,
  KINDS.CHANNEL_SELECT,
  KINDS.ROLE_SELECT,
  KINDS.MENTIONABLE_SELECT,
  KINDS.FILE_UPLOAD,
]);

/** ========= Defaults ========= */
function defaultComponent(kind) {
  const base = {
    id: nanoid(),
    kind,
    label:
      kind === KINDS.TEXT_INPUT
        ? "Text Input"
        : kind === KINDS.STRING_SELECT
        ? "Select Menu"
        : kind === KINDS.TEXT_DISPLAY
        ? "Text Display"
        : kind === KINDS.USER_SELECT
        ? "User Select"
        : kind === KINDS.CHANNEL_SELECT
        ? "Channel Select"
        : kind === KINDS.ROLE_SELECT
        ? "Role Select"
        : kind === KINDS.MENTIONABLE_SELECT
        ? "User & Role Select"
        : kind === KINDS.FILE_UPLOAD
        ? "File Upload"
        : "Component",
    description: "",
    custom_id: toSafeCustomId(`input_${nanoid(8)}`),
    required: true,
    collapsed: true,
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
      required: true,
      placeholder: "Make a selection",
      min_values: 1,
      max_values: 1,
      options: [
        {
          id: nanoid(),
          label: "Option",
          value: "option_1",
          description: "",
          emoji: "",
          isDefault: true,
          collapsed: true,
        },
      ],
    };
  }

  if (
    kind === KINDS.USER_SELECT ||
    kind === KINDS.CHANNEL_SELECT ||
    kind === KINDS.ROLE_SELECT ||
    kind === KINDS.MENTIONABLE_SELECT
  ) {
    return {
      ...base,
      required: true,
      placeholder: "Select…",
      min_values: 0,
      max_values: 1,
    };
  }

  if (kind === KINDS.TEXT_DISPLAY) {
    return {
      ...base,
      required: false,
      content: "",
    };
  }

  if (kind === KINDS.FILE_UPLOAD) {
    return {
      ...base,
      required: true,
    };
  }

  return base;
}

/** ========= Bot Code (compact) =========
 * You can store this string in DB and let your bot render it at runtime.
 * It’s intentionally compact but still readable.
 */
function buildBotCode(modal) {
  // extremely compact schema; keep only what you need
  const payload = {
    t: modal.title || "Modal",
    id: modal.custom_id || "modal",
    w: !!modal.show_warning ? 1 : 0,
    c: (modal.components || []).map((x) => {
      const common = {
        k: x.kind,
        l: x.label || "",
        d: x.description || "",
        cid: x.custom_id || "",
        r: x.required ? 1 : 0,
      };

      if (x.kind === KINDS.TEXT_INPUT) {
        return {
          ...common,
          s: x.style === 2 ? 2 : 1,
          ph: x.placeholder || "",
          mx: clampInt(x.max_length ?? 4000, 1, 4000),
        };
      }

      if (x.kind === KINDS.STRING_SELECT) {
        const opts = Array.isArray(x.options) ? x.options : [];
        return {
          ...common,
          ph: x.placeholder || "",
          mn: clampInt(x.min_values ?? 1, 0, 1),
          mx: 1,
          o: opts.map((o) => ({
            l: o.label || "",
            v: o.value || "",
            d: o.description || "",
            e: o.emoji || "",
            df: o.isDefault ? 1 : 0,
          })),
        };
      }

      if (
        x.kind === KINDS.USER_SELECT ||
        x.kind === KINDS.CHANNEL_SELECT ||
        x.kind === KINDS.ROLE_SELECT ||
        x.kind === KINDS.MENTIONABLE_SELECT
      ) {
        return {
          ...common,
          ph: x.placeholder || "",
          mn: clampInt(x.min_values ?? 0, 0, 1),
          mx: 1,
        };
      }

      if (x.kind === KINDS.TEXT_DISPLAY) {
        return { ...common, txt: x.content || "" };
      }

      if (x.kind === KINDS.FILE_UPLOAD) {
        return { ...common };
      }

      return common;
    }),
  };

  // compact JSON (no whitespace)
  return JSON.stringify(payload);
}

/** ========= JSON / discord.js outputs ========= */
function buildDiscordModalJSON(modal) {
  // NOTE: This is a best-effort example JSON structure; your bot might use v2 builders.
  // Keep this if you still want JSON export.
  const comps = (modal.components || []).map((c) => {
    // Label container (type 18) contains one child component for modals v2-like
    const label = {
      type: 18,
      label: c.label || "Component",
      description: c.description || "",
      components: [],
    };

    if (c.kind === KINDS.TEXT_INPUT) {
      label.components.push({
        type: 4,
        custom_id: c.custom_id || "input",
        style: c.style === 2 ? 2 : 1,
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        max_length: clampInt(c.max_length ?? 4000, 1, 4000),
      });
    } else if (c.kind === KINDS.STRING_SELECT) {
      const opts = Array.isArray(c.options) ? c.options : [];
      label.components.push({
        type: 3,
        custom_id: c.custom_id || "select",
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        min_values: clampInt(c.min_values ?? 1, 0, 1),
        max_values: 1,
        options: opts.map((o) => ({
          label: o.label || "Option",
          value: o.value || "value",
          description: o.description || undefined,
          emoji: o.emoji || undefined,
          default: !!o.isDefault,
        })),
      });
    } else if (c.kind === KINDS.USER_SELECT) {
      label.components.push({
        type: 5,
        custom_id: c.custom_id || "user_select",
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        min_values: clampInt(c.min_values ?? 0, 0, 1),
        max_values: 1,
      });
    } else if (c.kind === KINDS.CHANNEL_SELECT) {
      label.components.push({
        type: 8,
        custom_id: c.custom_id || "channel_select",
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        min_values: clampInt(c.min_values ?? 0, 0, 1),
        max_values: 1,
      });
    } else if (c.kind === KINDS.ROLE_SELECT) {
      label.components.push({
        type: 9,
        custom_id: c.custom_id || "role_select",
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        min_values: clampInt(c.min_values ?? 0, 0, 1),
        max_values: 1,
      });
    } else if (c.kind === KINDS.MENTIONABLE_SELECT) {
      label.components.push({
        type: 10,
        custom_id: c.custom_id || "mentionable_select",
        required: !!c.required,
        placeholder: c.placeholder || undefined,
        min_values: clampInt(c.min_values ?? 0, 0, 1),
        max_values: 1,
      });
    } else if (c.kind === KINDS.FILE_UPLOAD) {
      label.components.push({
        type: 19,
        custom_id: c.custom_id || "file",
        required: !!c.required,
      });
    } else if (c.kind === KINDS.TEXT_DISPLAY) {
      return {
        type: 17,
        content: c.content || "",
      };
    }

    return label;
  });

  return {
    title: modal.title || "Modal",
    custom_id: modal.custom_id || "modal",
    components: comps,
  };
}

function buildDiscordJsCode(modal) {
  // Best-effort sample; keep exports minimal.
  const lines = [];
  lines.push(`import { ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle,`);
  lines.push(`  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,`);
  lines.push(`  UserSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, MentionableSelectMenuBuilder,`);
  lines.push(`  FileUploadBuilder } from "discord.js";`);
  lines.push("");
  lines.push("interaction.showModal(");
  lines.push("  new ModalBuilder()");
  lines.push(`    .setTitle(${JSON.stringify(modal.title || "Modal")})`);
  lines.push(`    .setCustomId(${JSON.stringify(modal.custom_id || "modal")})`);

  for (const c of modal.components || []) {
    if (c.kind === KINDS.TEXT_DISPLAY) continue;

    lines.push("    .addLabelComponents(");
    lines.push("      new LabelBuilder()");
    lines.push(`        .setLabel(${JSON.stringify(c.label || "Component")})`);

    if (c.kind === KINDS.TEXT_INPUT) {
      lines.push("        .setTextInputComponent(");
      lines.push("          new TextInputBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "input")})`);
      lines.push(`            .setStyle(${c.style === 2 ? "TextInputStyle.Paragraph" : "TextInputStyle.Short"})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push("        )");
    } else if (c.kind === KINDS.STRING_SELECT) {
      const opts = Array.isArray(c.options) ? c.options : [];
      lines.push("        .setStringSelectMenuComponent(");
      lines.push("          new StringSelectMenuBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "select")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push(`            .setMinValues(${clampInt(c.min_values ?? 1, 0, 1)})`);
      lines.push(`            .setMaxValues(1)`);
      lines.push("            .addOptions(");
      for (const o of opts) {
        lines.push("              new StringSelectMenuOptionBuilder()");
        lines.push(`                .setLabel(${JSON.stringify(o.label || "Option")})`);
        lines.push(`                .setValue(${JSON.stringify(o.value || "value")})`);
        if (o.description) lines.push(`                .setDescription(${JSON.stringify(o.description)})`);
        if (o.emoji) lines.push(`                .setEmoji(${JSON.stringify(o.emoji)})`);
        if (o.isDefault) lines.push("                .setDefault(true)");
        lines.push("            )");
      }
      lines.push("        )");
    } else if (c.kind === KINDS.USER_SELECT) {
      lines.push("        .setUserSelectMenuComponent(");
      lines.push("          new UserSelectMenuBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "user_select")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push(`            .setMinValues(${clampInt(c.min_values ?? 0, 0, 1)})`);
      lines.push("            .setMaxValues(1)");
      lines.push("        )");
    } else if (c.kind === KINDS.CHANNEL_SELECT) {
      lines.push("        .setChannelSelectMenuComponent(");
      lines.push("          new ChannelSelectMenuBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "channel_select")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push(`            .setMinValues(${clampInt(c.min_values ?? 0, 0, 1)})`);
      lines.push("            .setMaxValues(1)");
      lines.push("        )");
    } else if (c.kind === KINDS.ROLE_SELECT) {
      lines.push("        .setRoleSelectMenuComponent(");
      lines.push("          new RoleSelectMenuBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "role_select")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push(`            .setMinValues(${clampInt(c.min_values ?? 0, 0, 1)})`);
      lines.push("            .setMaxValues(1)");
      lines.push("        )");
    } else if (c.kind === KINDS.MENTIONABLE_SELECT) {
      lines.push("        .setMentionableSelectMenuComponent(");
      lines.push("          new MentionableSelectMenuBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "mentionable_select")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      if (c.placeholder) lines.push(`            .setPlaceholder(${JSON.stringify(c.placeholder)})`);
      lines.push(`            .setMinValues(${clampInt(c.min_values ?? 0, 0, 1)})`);
      lines.push("            .setMaxValues(1)");
      lines.push("        )");
    } else if (c.kind === KINDS.FILE_UPLOAD) {
      lines.push("        .setFileUploadComponent(");
      lines.push("          new FileUploadBuilder()");
      lines.push(`            .setCustomId(${JSON.stringify(c.custom_id || "file")})`);
      lines.push(`            .setRequired(${!!c.required})`);
      lines.push("        )");
    }

    lines.push("    )");
  }

  lines.push(");");
  return lines.join("\n");
}

/** ========= Store ========= */
const useBuilderStore = create((set, get) => ({
  modal: {
    title: "Modal",
    custom_id: "modal",
    show_warning: false,
    components: [defaultComponent(KINDS.TEXT_INPUT)],
  },

  setTitle: (title) => set((s) => ({ modal: { ...s.modal, title } })),
  setCustomId: (custom_id) => set((s) => ({ modal: { ...s.modal, custom_id } })),
  setShowWarning: (show_warning) => set((s) => ({ modal: { ...s.modal, show_warning } })),

  addComponent: (kind) => {
    const { modal } = get();
    if (modal.components.length >= MAX_COMPONENTS) return;
    set((s) => ({
      modal: { ...s.modal, components: [...s.modal.components, defaultComponent(kind)] },
    }));
  },

  removeComponent: (id) => {
    const { modal } = get();
    if (modal.components.length <= 1) return; // min 1
    set((s) => ({
      modal: { ...s.modal, components: s.modal.components.filter((x) => x.id !== id) },
    }));
  },

  reorder: (activeId, overId) => {
    const { modal } = get();
    const list = [...modal.components];
    const from = list.findIndex((x) => x.id === activeId);
    const to = list.findIndex((x) => x.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    set((s) => ({ modal: { ...s.modal, components: list } }));
  },

  updateComponent: (id, patch) =>
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      },
    })),

  // Select options helpers
  addOption: (compId) => {
    const { modal } = get();
    const c = modal.components.find((x) => x.id === compId);
    if (!c || c.kind !== KINDS.STRING_SELECT) return;
    const opts = Array.isArray(c.options) ? c.options : [];
    if (opts.length >= MAX_SELECT_OPTIONS) return;
    const next = [
      ...opts,
      {
        id: nanoid(),
        label: `Option ${opts.length + 1}`,
        value: `option_${opts.length + 1}`,
        description: "",
        emoji: "",
        isDefault: false,
        collapsed: true,
      },
    ];
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)),
      },
    }));
  },

  removeOption: (compId, optId) => {
    const { modal } = get();
    const c = modal.components.find((x) => x.id === compId);
    if (!c || c.kind !== KINDS.STRING_SELECT) return;
    const opts = Array.isArray(c.options) ? c.options : [];
    if (opts.length <= 1) return; // min 1 option
    let next = opts.filter((o) => o.id !== optId);
    // ensure exactly one default
    if (!next.some((o) => o.isDefault)) {
      next = next.map((o, i) => (i === 0 ? { ...o, isDefault: true } : o));
    }
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)),
      },
    }));
  },

  setDefaultOption: (compId, optId) => {
    const { modal } = get();
    const c = modal.components.find((x) => x.id === compId);
    if (!c || c.kind !== KINDS.STRING_SELECT) return;
    const opts = Array.isArray(c.options) ? c.options : [];
    const next = opts.map((o) => ({ ...o, isDefault: o.id === optId }));
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)),
      },
    }));
  },

  updateOption: (compId, optId, patch) => {
    const { modal } = get();
    const c = modal.components.find((x) => x.id === compId);
    if (!c || c.kind !== KINDS.STRING_SELECT) return;
    const opts = Array.isArray(c.options) ? c.options : [];
    const next = opts.map((o) => (o.id === optId ? { ...o, ...patch } : o));
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)),
      },
    }));
  },

  reorderOption: (compId, activeOptId, overOptId) => {
    const { modal } = get();
    const c = modal.components.find((x) => x.id === compId);
    if (!c || c.kind !== KINDS.STRING_SELECT) return;
    const opts = Array.isArray(c.options) ? c.options : [];
    const from = opts.findIndex((o) => o.id === activeOptId);
    const to = opts.findIndex((o) => o.id === overOptId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...opts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set((s) => ({
      modal: {
        ...s.modal,
        components: s.modal.components.map((x) => (x.id === compId ? { ...x, options: next } : x)),
      },
    }));
  },
}));

/** ========= Add menu ========= */
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

  const items = [
    { kind: KINDS.TEXT_INPUT, label: "Text Input", icon: "☰" },
    { kind: KINDS.STRING_SELECT, label: "Select Menu", icon: "☑" },
    { kind: KINDS.TEXT_DISPLAY, label: "Text Display", icon: "T" },
    { kind: KINDS.USER_SELECT, label: "User Select", icon: "👥" },
    { kind: KINDS.CHANNEL_SELECT, label: "Channel Select", icon: "#" },
    { kind: KINDS.ROLE_SELECT, label: "Role Select", icon: "🛡" },
    { kind: KINDS.MENTIONABLE_SELECT, label: "User & Role Select", icon: "@" },
    { kind: KINDS.FILE_UPLOAD, label: "File Upload", icon: "📄" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white cursor-pointer",
          "hover:bg-[#4f5ae6]",
          disabled ? "opacity-50 cursor-not-allowed hover:bg-[#5865F2]" : ""
        )}
      >
        Add <span className="text-base leading-none">▾</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#111214] shadow-2xl z-50">
          {items.map((x) => (
            <button
              key={x.kind}
              type="button"
              onClick={() => {
                onAdd(x.kind);
                setOpen(false);
              }}
              className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[#DBDEE1] hover:bg-white/5 flex items-center gap-2"
            >
              <span className="w-5 text-center text-[#B5BAC1]">{x.icon}</span>
              <span className="font-semibold">{x.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** ========= Switch (fixed thumb) ========= */
function Toggle({ label, value, onChange }) {
  // Thumb is 20px, track is 44px => 2px padding each side => left: 2 or 22
  const left = value ? 22 : 2;
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-[#DBDEE1]">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn("relative h-6 w-11 rounded-full transition-colors cursor-pointer", value ? "bg-[#5865F2]" : "bg-white/10")}
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

/** ========= Emoji Picker (mobile-friendly + clear) ========= */
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
    // prevent mobile keyboard autofocus
    setTimeout(() => {
      try {
        if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
      } catch {}
    }, 0);
  };

  const pickerUI = (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#111214] shadow-2xl overflow-hidden",
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
          onClick={() => setOpen(false)}
        >
          Close
        </button>
        <button
          type="button"
          className="flex-1 rounded-md bg-[#2B2D31] px-3 py-2 text-xs font-semibold hover:bg-[#313338] cursor-pointer"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          title="Remove emoji"
        >
          Clear Emoji
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={openPicker}
        className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-[#1e1f22] ring-1 ring-white/10 hover:bg-white/5 cursor-pointer"
        title="Pick emoji"
      >
        <span className="text-base">{value || "🙂"}</span>
      </button>

      {value ? (
        <button
          type="button"
          className="rounded-md bg-white/5 px-2 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer"
          onClick={() => onChange("")}
          title="Remove emoji"
        >
          Clear
        </button>
      ) : null}

      {open && portalRoot
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center p-3",
                isMobile ? "bg-black/60" : "bg-black/30"
              )}
              onMouseDown={() => setOpen(false)}
            >
              <div onMouseDown={(e) => e.stopPropagation()}>{pickerUI}</div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}

/** ========= DnD: Components ========= */
function SortableHandle() {
  return (
    <div className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[#B5BAC1] cursor-grab active:cursor-grabbing">
      ⋮⋮
    </div>
  );
}

function SortableComponentCard({ compId }) {
  const { modal, removeComponent, updateComponent } = useBuilderStore();
  const c = modal.components.find((x) => x.id === compId);
  if (!c) return null;

  const canDelete = modal.components.length > 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: compId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCollapsed = !!c.collapsed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden",
        isDragging ? "opacity-70" : ""
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners}>
            <SortableHandle />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 cursor-pointer"
            onClick={() => updateComponent(c.id, { collapsed: !c.collapsed })}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <span className="w-5 text-center text-[#B5BAC1]">{isCollapsed ? "▸" : "▾"}</span>
            <span className="text-sm font-semibold text-[#F2F3F5] truncate">{c.label || "Component"}</span>
            <span className="text-xs text-[#B5BAC1] truncate">{kindLabel(c.kind)}</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!canDelete}
          onClick={() => canDelete && removeComponent(c.id)}
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-md ring-1 ring-white/10 cursor-pointer",
            canDelete ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-40 cursor-not-allowed"
          )}
          title={canDelete ? "Delete component" : "At least 1 component required"}
        >
          🗑
        </button>
      </div>

      {/* Body */}
      {!isCollapsed ? (
        <div className="px-4 pb-4">
          <ComponentEditor comp={c} />
        </div>
      ) : null}
    </div>
  );
}

function kindLabel(kind) {
  if (kind === KINDS.TEXT_INPUT) return "Text Input";
  if (kind === KINDS.STRING_SELECT) return "Select Menu";
  if (kind === KINDS.TEXT_DISPLAY) return "Text Display";
  if (kind === KINDS.USER_SELECT) return "User Select";
  if (kind === KINDS.CHANNEL_SELECT) return "Channel Select";
  if (kind === KINDS.ROLE_SELECT) return "Role Select";
  if (kind === KINDS.MENTIONABLE_SELECT) return "User & Role Select";
  if (kind === KINDS.FILE_UPLOAD) return "File Upload";
  return "Component";
}

function ComponentsEditor() {
  const { modal, reorder } = useBuilderStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event) {
    const activeId = event.active?.id ? String(event.active.id) : null;
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!activeId || !overId) return;
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

/** ========= DnD: Select Options ========= */
function OptionHandle() {
  return (
    <div className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-[#B5BAC1] cursor-grab active:cursor-grabbing">
      ⋮⋮
    </div>
  );
}

function SortableOptionCard({ compId, optId }) {
  const { modal, removeOption, updateOption, setDefaultOption } = useBuilderStore();
  const comp = modal.components.find((x) => x.id === compId);
  const opt = comp?.options?.find((o) => o.id === optId);
  if (!comp || comp.kind !== KINDS.STRING_SELECT || !opt) return null;

  const opts = Array.isArray(comp.options) ? comp.options : [];
  const canDelete = opts.length > 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: optId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl bg-[#141518] ring-1 ring-white/10 overflow-hidden",
        isDragging ? "opacity-70" : ""
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div {...attributes} {...listeners}>
            <OptionHandle />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => updateOption(compId, optId, { collapsed: !opt.collapsed })}
            title={opt.collapsed ? "Expand option" : "Collapse option"}
          >
            <span className="w-5 text-center text-[#B5BAC1]">{opt.collapsed ? "▸" : "▾"}</span>
            <span className="text-sm font-semibold text-[#F2F3F5] truncate">
              {opt.label ? opt.label : "Option"}
            </span>
          </button>
        </div>

        <button
          type="button"
          disabled={!canDelete}
          onClick={() => canDelete && removeOption(compId, optId)}
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-md ring-1 ring-white/10 cursor-pointer",
            canDelete ? "bg-white/5 hover:bg-white/10" : "bg-white/5 opacity-40 cursor-not-allowed"
          )}
          title={canDelete ? "Delete option" : "At least 1 option required"}
        >
          🗑
        </button>
      </div>

      {!opt.collapsed ? (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-start">
            <div className="grid gap-1">
              <span className="text-xs text-[#B5BAC1]">Emoji</span>
              <EmojiPickerButton value={opt.emoji || ""} onChange={(v) => updateOption(compId, optId, { emoji: v })} />
            </div>

            <label className="grid gap-1 min-w-0">
              <span className="text-xs text-[#B5BAC1]">
                Label <span className="text-red-400">*</span> ({(opt.label || "").length}/100)
              </span>
              <input
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={opt.label || ""}
                onChange={(e) => updateOption(compId, optId, { label: e.target.value })}
                maxLength={100}
              />
            </label>
          </div>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-[#B5BAC1]">
              Description ({(opt.description || "").length}/100)
            </span>
            <input
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={opt.description || ""}
              onChange={(e) => updateOption(compId, optId, { description: e.target.value })}
              maxLength={100}
            />
          </label>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-[#B5BAC1]">
              Value <span className="text-red-400">*</span> ({(opt.value || "").length}/100)
            </span>
            <input
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={opt.value || ""}
              onChange={(e) => updateOption(compId, optId, { value: toSafeCustomId(e.target.value) })}
              maxLength={100}
            />
          </label>

          <Toggle
            label="Default selection"
            value={!!opt.isDefault}
            onChange={() => setDefaultOption(compId, optId)}
          />
          <div className="text-xs text-[#B5BAC1]">
            Hinweis: Es kann nur eine Option als Default markiert sein.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OptionsEditor({ compId }) {
  const { modal, addOption, reorderOption } = useBuilderStore();
  const comp = modal.components.find((x) => x.id === compId);
  const opts = Array.isArray(comp?.options) ? comp.options : [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event) {
    const activeId = event.active?.id ? String(event.active.id) : null;
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!activeId || !overId) return;
    reorderOption(compId, activeId, overId);
  }

  const canAdd = opts.length < MAX_SELECT_OPTIONS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-[#B5BAC1]">
          Options ({opts.length}/{MAX_SELECT_OPTIONS})
        </div>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => canAdd && addOption(compId)}
          className={cn(
            "rounded-md bg-[#5865F2] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#4f5ae6]",
            !canAdd ? "opacity-50 cursor-not-allowed hover:bg-[#5865F2]" : ""
          )}
        >
          Add Option
        </button>
      </div>

      {!canAdd ? <div className="text-xs text-amber-400">Maximal {MAX_SELECT_OPTIONS} Optionen.</div> : null}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={opts.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {opts.map((o) => (
              <SortableOptionCard key={o.id} compId={compId} optId={o.id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/** ========= Component Editor ========= */
function ComponentEditor({ comp }) {
  const { updateComponent } = useBuilderStore();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="grid gap-1 min-w-0">
          <span className="text-xs text-[#B5BAC1]">
            Label <span className="text-red-400">*</span> ({(comp.label || "").length}/45)
          </span>
          <input
            className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
            value={comp.label || ""}
            onChange={(e) => updateComponent(comp.id, { label: e.target.value })}
            maxLength={45}
          />
        </label>

        <label className="grid gap-1 min-w-0">
          <span className="text-xs text-[#B5BAC1]">custom_id</span>
          <input
            className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
            value={comp.custom_id || ""}
            onChange={(e) => updateComponent(comp.id, { custom_id: toSafeCustomId(e.target.value) })}
          />
        </label>
      </div>

      <label className="grid gap-1 min-w-0">
        <span className="text-xs text-[#B5BAC1]">
          Description ({(comp.description || "").length}/100)
        </span>
        <input
          className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
          value={comp.description || ""}
          onChange={(e) => updateComponent(comp.id, { description: e.target.value })}
          maxLength={100}
        />
      </label>

      {REQUIRED_KINDS.has(comp.kind) ? (
        <Toggle label="Required" value={!!comp.required} onChange={(v) => updateComponent(comp.id, { required: v })} />
      ) : null}

      {comp.kind === KINDS.TEXT_INPUT ? (
        <>
          <Toggle
            label="Multiline"
            value={comp.style === 2}
            onChange={(v) => updateComponent(comp.id, { style: v ? 2 : 1 })}
          />

          <label className="grid gap-1">
            <span className="text-xs text-[#B5BAC1]">Max Length (1–4000)</span>
            <input
              type="number"
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={Number.isFinite(comp.max_length) ? comp.max_length : 4000}
              onChange={(e) => updateComponent(comp.id, { max_length: clampInt(e.target.value, 1, 4000) })}
            />
          </label>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-[#B5BAC1]">Placeholder ({(comp.placeholder || "").length}/100)</span>
            <input
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={comp.placeholder || ""}
              onChange={(e) => updateComponent(comp.id, { placeholder: e.target.value })}
              maxLength={100}
            />
          </label>
        </>
      ) : null}

      {comp.kind === KINDS.STRING_SELECT ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-[#B5BAC1]">Min Values (0–1)</span>
              <input
                type="number"
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={comp.min_values ?? 1}
                onChange={(e) => updateComponent(comp.id, { min_values: clampInt(e.target.value, 0, 1) })}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[#B5BAC1]">Max Values (=1)</span>
              <input
                type="number"
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={comp.max_values ?? 1}
                onChange={() => updateComponent(comp.id, { max_values: 1 })}
              />
            </label>
          </div>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-[#B5BAC1]">Placeholder ({(comp.placeholder || "").length}/150)</span>
            <input
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={comp.placeholder || ""}
              onChange={(e) => updateComponent(comp.id, { placeholder: e.target.value })}
              maxLength={150}
            />
          </label>

          <OptionsEditor compId={comp.id} />
        </>
      ) : null}

      {(comp.kind === KINDS.USER_SELECT ||
        comp.kind === KINDS.CHANNEL_SELECT ||
        comp.kind === KINDS.ROLE_SELECT ||
        comp.kind === KINDS.MENTIONABLE_SELECT) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-[#B5BAC1]">Min Values (0–1)</span>
              <input
                type="number"
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={comp.min_values ?? 0}
                onChange={(e) => updateComponent(comp.id, { min_values: clampInt(e.target.value, 0, 1) })}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[#B5BAC1]">Max Values (=1)</span>
              <input
                type="number"
                className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                value={comp.max_values ?? 1}
                onChange={() => updateComponent(comp.id, { max_values: 1 })}
              />
            </label>
          </div>

          <label className="grid gap-1 min-w-0">
            <span className="text-xs text-[#B5BAC1]">Placeholder ({(comp.placeholder || "").length}/150)</span>
            <input
              className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
              value={comp.placeholder || ""}
              onChange={(e) => updateComponent(comp.id, { placeholder: e.target.value })}
              maxLength={150}
            />
          </label>
        </>
      )}

      {comp.kind === KINDS.TEXT_DISPLAY ? (
        <label className="grid gap-1 min-w-0">
          <span className="text-xs text-[#B5BAC1]">Text</span>
          <textarea
            className="w-full min-h-[96px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
            value={comp.content || ""}
            onChange={(e) => updateComponent(comp.id, { content: e.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}

/** ========= Guild icon resolver ========= */
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
      const match = imgs.find((img) => typeof img.src === "string" && img.src.includes(`cdn.discordapp.com/icons/${guildId}/`));
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

/** ========= Preview Select (Discord-like) ========= */
function PreviewSelect({ label, description, required, placeholder, options, value, onChange, showClear = false, onClear }) {
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

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
      className="rounded-[6px] border border-[#2B2D31] bg-[#111214] shadow-2xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Scroll list, not modal stretching */}
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
                {/* description only in list */}
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
    </div>
  ) : null;

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
        {label}
        {required ? <span className="text-[#ED4245]">*</span> : null}
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

        <div className="flex items-center gap-1">
          {/* IMPORTANT: show X only for Channel/Role/User/Mentionable (showClear=true) */}
          {showClear && value ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onClear === "function") onClear();
                else onChange("");
              }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-white/5 cursor-pointer"
              title="Clear"
              aria-label="Clear selection"
            >
              ×
            </button>
          ) : null}
          <span className="w-5 text-center text-[#B5BAC1] text-base leading-none">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && portalRoot ? createPortal(dropdown, portalRoot) : null}
    </div>
  );
}

/** Preview for auto-populated selects (User/Role/Channel/Mentionable) */
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
      showClear
      onClear={() => setVal("")}
    />
  );
}

/** ========= Preview modal ========= */
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
      <div className="w-full max-w-md rounded-xl bg-[#2B2D31] ring-1 ring-white/10 shadow-2xl">
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

        {modal.show_warning ? (
          <div className="px-5 pb-2">
            <div className="flex items-start gap-3 rounded-[6px] border border-[#F0B232]/50 bg-[#2B2D31] px-3 py-2">
              <div className="mt-0.5 text-[#F0B232]">⚠</div>
              <div className="text-xs text-[#DBDEE1]">
                This form will be submitted to <span className="font-semibold">This Bot</span>. Do not share passwords or other sensitive information.
              </div>
            </div>
          </div>
        ) : null}

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
                  showClear={false}
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
            className="flex-1 rounded-[6px] bg-[#313338] px-3 py-2 text-sm font-semibold hover:bg-[#3A3C43] text-[#F2F3F5] cursor-pointer"
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

/** ========= Page ========= */
export default function ModalBuilderPage({ params }) {
  const guildId = params?.guildId;

  const { modal, setTitle, setCustomId, setShowWarning, addComponent } = useBuilderStore();

  const json = useMemo(() => buildDiscordModalJSON(modal), [modal]);
  const jsCode = useMemo(() => buildDiscordJsCode(modal), [modal]);
  const botCode = useMemo(() => buildBotCode(modal), [modal]);

  const [codeMode, setCodeMode] = useState("bot");
  const [copied, setCopied] = useState(false);

  const codeText = codeMode === "json" ? JSON.stringify(json, null, 2) : codeMode === "discordjs" ? jsCode : botCode;

  const canAdd = modal.components.length < MAX_COMPONENTS;

  async function copy() {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 900); // < 1s
  }

  return (
    <div className="w-full text-zinc-100">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
            <div className="border-b border-white/10 p-4">
              <div className="text-sm font-semibold">Modal</div>

              <div className="mt-3 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-[#B5BAC1]">
                    Title <span className="text-red-400">*</span> ({(modal.title || "").length}/45)
                  </span>
                  <input
                    className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={modal.title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={45}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs text-[#B5BAC1]">custom_id</span>
                  <input
                    className="rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-[#DBDEE1] ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                    value={modal.custom_id}
                    onChange={(e) => setCustomId(e.target.value)}
                  />
                </label>

                <Toggle label="Show warning (debug)" value={!!modal.show_warning} onChange={(v) => setShowWarning(v)} />

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#B5BAC1]">
                    Components ({modal.components.length}/{MAX_COMPONENTS})
                  </div>
                  <AddComponentMenu onAdd={addComponent} disabled={!canAdd} />
                </div>

                {!canAdd ? <div className="text-xs text-amber-400">Maximal {MAX_COMPONENTS} Components pro Modal.</div> : null}
              </div>
            </div>

            <div className="p-4">
              <ComponentsEditor />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
              <div className="border-b border-white/10 p-4 text-sm font-semibold">Preview</div>
              <div className="p-4">
                <DiscordPreview guildId={guildId} />
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="text-sm font-semibold">Code</div>

                <div className="flex items-center gap-2">
                  <select
                    className="min-w-[140px] rounded-md bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 outline-none cursor-pointer"
                    value={codeMode}
                    onChange={(e) => setCodeMode(e.target.value)}
                  >
                    <option value="bot">BOT Code</option>
                    <option value="json">JSON</option>
                    <option value="discordjs">discord.js</option>
                  </select>

                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer relative"
                    type="button"
                  >
                    <span>Copy</span>
                    <span className="text-sm leading-none">⧉</span>
                    {copied ? (
                      <span className="absolute -top-7 right-0 rounded-md bg-[#111214] ring-1 ring-white/10 px-2 py-1 text-[11px] text-[#DBDEE1]">
                        Copied
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <pre className="max-h-[420px] overflow-auto p-4 text-xs text-[#DBDEE1]">
                <code>{codeText}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-[#B5BAC1]">
          Hinweis: In echten Discord-Modals sind maximal {MAX_COMPONENTS} Components erlaubt (mindestens 1).
        </div>
      </div>
    </div>
  );
}
