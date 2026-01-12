"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";

const KINDS = {
  TEXT_INPUT: "text_input",
  STRING_SELECT: "string_select",
  TEXT_DISPLAY: "text_display",
  USER_SELECT: "user_select",
  CHANNEL_SELECT: "channel_select",
  ROLE_SELECT: "role_select",
  MENTIONABLE_SELECT: "mentionable_select",
  FILE_UPLOAD: "file_upload",
};

function usePortalRoot() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? document.body : null;
}

/**
 * Discord-like submit warning banner (as in the modal screenshot)
 */
function DiscordSubmitWarning({ botName = "This Bot" }) {
  return (
    <div className="px-5 mb-4">
      <div className="flex items-start gap-3 rounded-[6px] border border-[#F0B232]/50 bg-[#1E1F22] px-3 py-2">
        <div className="mt-[1px] text-[#F0B232]">
          {/* Triangle warning icon (Discord-ish) */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3.2 1.9 20.8c-.4.7.1 1.6.9 1.6h18.4c.8 0 1.3-.9.9-1.6L12 3.2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17.8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <div className="text-[12px] leading-[16px] text-[#DBDEE1]">
          This form will be submitted to{" "}
          <span className="font-semibold text-[#F2F3F5]">{botName}</span>. Do not share
          passwords or other sensitive information.
        </div>
      </div>
    </div>
  );
}

function PreviewSelect({
  label,
  description,
  required,
  placeholder,
  options,
  value,
  onChange,
  showClear = false,
  onClear,
}) {
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
      if (anchorRef.current?.contains(e.target) || dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
      setHoveredValue(null);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
      className="rounded-[6px] border border-[#2B2D31] bg-[#111214] shadow-2xl overflow-hidden"
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
                "w-full px-3 py-2 text-left flex items-start gap-2 cursor-pointer border-b border-white/5 last:border-b-0",
                isActive ? "bg-[#3A3C43]" : isHovered ? "bg-[#2F3136]" : "bg-[#2B2D31]"
              )}
            >
              <div className="mt-[2px] w-5 flex justify-center">
                {o.emoji ? <span className="text-base">{o.emoji}</span> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[#F2F3F5] truncate font-semibold">{o.label}</div>
                {o.description ? (
                  <div className="text-[12px] text-[#B5BAC1] truncate">{o.description}</div>
                ) : null}
              </div>
              <div className="w-6 flex justify-end">
                {isActive && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#5865F2] text-white text-xs">
                    ✓
                  </span>
                )}
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
        {required && <span className="text-[#ED4245]">*</span>}
      </div>
      {description && <div className="text-xs text-[#B5BAC1]">{description}</div>}

      <div
        ref={anchorRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-10 flex items-center justify-between gap-2 px-3 rounded-[6px] bg-[#17181b] text-sm text-[#DBDEE1] ring-1 ring-[#3b3d44] outline-none cursor-pointer select-none",
          open ? "ring-2 ring-[#5865F2]" : ""
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.emoji && <span className="text-base">{selected.emoji}</span>}
          <div className={cn("truncate", selected ? "text-[#DBDEE1]" : "text-[#949BA4]")}>
            {selected ? selected.label : placeholder}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showClear && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear ? onClear() : onChange("");
              }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-white/5 cursor-pointer"
            >
              ×
            </button>
          )}
          <span className="w-5 text-center text-[#B5BAC1] text-base leading-none">
            {open ? "▴" : "▾"}
          </span>
        </div>
      </div>

      {open && portalRoot ? createPortal(dropdown, portalRoot) : null}
    </div>
  );
}

function PreviewAutoSelect({ kind, label, description, required, placeholder }) {
  const mock = useMemo(() => {
    const mk = (emoji, label, description) => ({ id: nanoid(), emoji, label, description, value: nanoid() });
    if (kind === KINDS.USER_SELECT)
      return [mk("👤", "User 1", "Test description"), mk("👤", "User 2", "Test description"), mk("👤", "User 3", "")];
    if (kind === KINDS.ROLE_SELECT) return [mk("🏷️", "Role A", "Test description"), mk("🏷️", "Role B", ""), mk("🏷️", "Role C", "")];
    if (kind === KINDS.CHANNEL_SELECT)
      return [mk("#️⃣", "#general", "Test description"), mk("#️⃣", "#support", ""), mk("#️⃣", "#off-topic", "")];
    return [mk("@", "Mentionable 1", "Test description"), mk("@", "Mentionable 2", ""), mk("@", "Mentionable 3", "")];
  }, [kind]);

  const [val, setVal] = useState(mock[0]?.value || "");
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

export default function ModalPreview({ modal, guildIconUrl, botIconUrl }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const c of modal?.components || []) {
        if (c.kind === KINDS.TEXT_INPUT && next[c.id] === undefined) next[c.id] = "";
        if (c.kind === KINDS.STRING_SELECT) {
          const opts = Array.isArray(c.options) ? c.options : [];
          const def = opts.find((o) => o.isDefault) || opts[0];
          if (next[c.id] === undefined) next[c.id] = def?.value || "";
        }
      }
      return next;
    });
  }, [modal]);

  // Selbe Logo-Logik wie im Embed
  const avatar =
    botIconUrl && botIconUrl.includes("http") && !botIconUrl.includes("embed/avatars/0.png")
      ? botIconUrl
      : "/logo.svg";

  // Bot-Name für den Warning-Text (passt zu deinem Screenshot-Usecase)
  const warningBotName =
    modal?.botName || modal?.bot_name || modal?.submitted_to || modal?.submit_to || "InzomniaBOT";

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl bg-[#2B2D31] ring-1 ring-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={avatar}
              alt=""
              className="h-6 w-6 rounded-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/logo.svg";
              }}
            />
            <div className="font-semibold text-[#F2F3F5] truncate">{modal.title || "Modal"}</div>
          </div>
          <button className="h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-white/5 cursor-pointer">
            ✕
          </button>
        </div>

        {/* WARNING (Discord-style) */}
        {!!modal?.show_warning && <DiscordSubmitWarning botName={warningBotName} />}

        <div className="space-y-4 px-5 pb-4 max-h-[500px] overflow-y-auto custom-scrollbar">
          {(modal.components || []).map((c) => {
            if (c.kind === KINDS.TEXT_DISPLAY)
              return (
                <div
                  key={c.id}
                  className="rounded-[6px] bg-[#17181b] p-3 ring-1 ring-[#3b3d44] text-sm text-[#DBDEE1] whitespace-pre-wrap"
                >
                  {c.content || ""}
                </div>
              );

            if (c.kind === KINDS.TEXT_INPUT) {
              const v = values[c.id] ?? "";
              return (
                <div key={c.id} className="space-y-1">
                  <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
                    {c.label}
                    {c.required && <span className="text-[#ED4245]">*</span>}
                  </div>
                  {c.description && <div className="text-xs text-[#B5BAC1]">{c.description}</div>}
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

            if (c.kind === KINDS.STRING_SELECT)
              return (
                <PreviewSelect
                  key={c.id}
                  label={c.label}
                  description={c.description}
                  required={!!c.required}
                  placeholder={c.placeholder || "Select…"}
                  options={(c.options || []).map((o) => ({ ...o, emoji: o.emoji || "" }))}
                  value={values[c.id] ?? ""}
                  onChange={(val) => setValues((s) => ({ ...s, [c.id]: val }))}
                />
              );

            if ([KINDS.USER_SELECT, KINDS.ROLE_SELECT, KINDS.CHANNEL_SELECT, KINDS.MENTIONABLE_SELECT].includes(c.kind))
              return (
                <PreviewAutoSelect
                  key={c.id}
                  kind={c.kind}
                  label={c.label}
                  description={c.description}
                  required={!!c.required}
                  placeholder={c.placeholder}
                />
              );

            if (c.kind === KINDS.FILE_UPLOAD)
              return (
                <div key={c.id} className="space-y-1">
                  <div className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1">
                    {c.label}
                    {c.required && <span className="text-[#ED4245]">*</span>}
                  </div>
                  {c.description && <div className="text-xs text-[#B5BAC1]">{c.description}</div>}
                  <div className="rounded-[6px] bg-[#17181b] ring-1 ring-[#3b3d44] p-6 text-center">
                    <div className="text-[#DBDEE1] text-sm">
                      Drop file here or <span className="text-[#5865F2]">browse</span>
                    </div>
                    <div className="mt-1 text-xs text-[#949BA4]">Upload a file under 10MB.</div>
                  </div>
                </div>
              );

            return null;
          })}
        </div>

        <div className="flex gap-3 border-t border-white/10 px-5 py-4">
          <button
            className="flex-1 rounded-[6px] bg-[#313338] px-3 py-2 text-sm font-semibold hover:bg-[#3A3C43] text-[#F2F3F5]"
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-[6px] bg-[#5865F2] px-3 py-2 text-sm font-semibold hover:bg-[#4f5ae6] text-white"
            type="button"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
