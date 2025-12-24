"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Settings2,
  RefreshCw,
  Save,
  Send,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** ---------- Small helpers ---------- */
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeStr(v) {
  return String(v ?? "");
}

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#5865F2";
  return v.toUpperCase();
}

function truncate(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function buildTicketBotCode(modal) {
  const payload = {
    v: 1,
    t: truncate(modal?.title || "Ticket Form", 45),
    id: "ticket_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = {
        k: c.kind,
        cid: truncate(c.customId || "", 100),
        l: truncate(c.label || "Field", 45),
        d: truncate(c.description || "", 100),
        r: !!c.required,
      };

      if (c.kind === "text_input") {
        return {
          ...base,
          s: c.style === "paragraph" ? 2 : 1,
          ph: truncate(c.placeholder || "", 100) || undefined,
          mx: Number.isFinite(Number(c.maxLength))
            ? Math.max(1, Math.min(4000, Number(c.maxLength)))
            : 4000,
        };
      }

      if (c.kind === "string_select") {
        return {
          ...base,
          ph: truncate(c.placeholder || "", 100) || undefined,
          mn: 1,
          mxv: 1,
          o: (c.options || []).slice(0, 25).map((o) => ({
            l: truncate(o.label || "Option", 100),
            v: truncate(o.value || "value", 100),
            d: truncate(o.description || "", 100) || undefined,
          })),
        };
      }

      if (c.kind === "file_upload") {
        return { ...base };
      }

      return { ...base, k: "text_input", s: 1 };
    }),
  };

  return JSON.stringify(payload);
}

/** ---------- Discord-ish markdown preview (minimal) ---------- */
function escapeHtml(raw) {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineMarkdownToHtml(escaped) {
  let s = escaped;
  s = s.replace(/`([^`]+?)`/g, (_m, inner) => `<code class="inlinecode">${inner}</code>`);
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, (_m, inner) => `<strong>${inner}</strong>`);
  s = s.replace(/__([\s\S]+?)__/g, (_m, inner) => `<u>${inner}</u>`);
  s = s.replace(/~~([\s\S]+?)~~/g, (_m, inner) => `<s>${inner}</s>`);
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, (_m, pre, inner) => `${pre}<em>${inner}</em>`);
  return s;
}

function discordMarkdownToSafeHtml(rawText) {
  const raw = String(rawText ?? "");
  const parts = raw.split(/```/g);
  const out = [];

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? "";

    if (i % 2 === 1) {
      const esc = escapeHtml(chunk);
      out.push(`<pre class="codeblock"><code>${esc}</code></pre>`);
      continue;
    }

    const lines = chunk.split(/\r?\n/);
    const renderedLines = lines.map((line) => {
      const isQuote = line.startsWith("> ");
      const content = isQuote ? line.slice(2) : line;

      const esc = escapeHtml(content);
      const inline = renderInlineMarkdownToHtml(esc);

      if (isQuote) return `<div class="quote">${inline}</div>`;
      return inline;
    });

    out.push(renderedLines.join("<br/>"));
  }

  return out.join("");
}

function DiscordMarkdown({ text }) {
  const html = useMemo(() => discordMarkdownToSafeHtml(text), [text]);
  return <div className="discord-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** ---------- Select helpers ---------- */
const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);

  return (
    <div className="space-y-2">
      <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"
      >
        <option value="" className="bg-[#1a1b1e] text-gray-500">
          {placeholder || "Bitte wählen..."}
        </option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id} className="bg-[#1a1b1e]">
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  return (
    <div className="space-y-2">
      <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"
      >
        <option value="" className="bg-[#1a1b1e] text-gray-500">
          {placeholder || "Bitte wählen..."}
        </option>
        {filtered.map((r) => (
          <option key={r.id} value={r.id} className="bg-[#1a1b1e]">
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
};

/** ---------- Defaults for Ticket Form ---------- */
function defaultTicketModal() {
  return {
    title: "Create Ticket",
    components: [
      {
        id: "c1",
        kind: "string_select",
        label: "Category",
        description: "Choose a category",
        customId: "ticket_cat",
        required: true,
        placeholder: "Select category…",
        options: [
          { label: "Support", value: "support", description: "", id: "o1" },
          { label: "Apply", value: "apply", description: "", id: "o2" },
          { label: "Report", value: "report", description: "", id: "o3" },
          { label: "Other", value: "other", description: "", id: "o4" },
        ],
      },
      {
        id: "c2",
        kind: "text_input",
        label: "Description",
        description: "Describe your issue",
        customId: "ticket_desc",
        required: true,
        placeholder: "Explain your issue…",
        style: "paragraph",
        maxLength: 1000,
      },
    ],
  };
}

function defaultTicketResponse() {
  return {
    type: "default", // default | text | embed
    text: "",
    content: "",
    embed: {
      title: "Ticket Created",
      description:
        "Hello {user}!\n\nThanks for your ticket. A supporter will reply soon.\n\n**Your message:**\n{field:ticket_desc}",
      color: "#5865F2",
      fields: [],
      footerText: "",
      timestamp: false,
    },
  };
}

/** ---------- Main Page ---------- */
export default function TicketsPage() {
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState("overview"); // overview | settings
  const [editorTab, setEditorTab] = useState("modal"); // modal | response

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // data
  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  // settings
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ticket form
  const [ticketForm, setTicketForm] = useState({
    mode: "default",
    version: 1,
    botCode: "",
    builderData: null,
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  // local builder states
  const [modal, setModal] = useState(defaultTicketModal());
  const [response, setResponse] = useState(defaultTicketResponse());

  // overview: selected ticket + chat
  const [selectedTicket, setSelectedTicket] = useState(null);
  const selectedTicketId = selectedTicket?._id;

  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const chatScrollRef = useRef(null);

  const openTickets = useMemo(() => (tickets || []).filter((t) => t.status === "open"), [tickets]);
  const closedTickets = useMemo(() => (tickets || []).filter((t) => t.status !== "open"), [tickets]);

  const sortedMessages = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    arr.sort((a, b) => {
      const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
      const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
      return ta - tb;
    });
    return arr;
  }, [messages]);

  function flashFormMsg(msg) {
    setFormMsg(msg);
    setTimeout(() => setFormMsg(""), 1700);
  }

  // Load initial data
  useEffect(() => {
    if (!guildId || guildId === "undefined") return;

    const loadData = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const [sRes, tRes, cRes, rRes, tfRes] = await Promise.all([
          fetch(`/api/settings/${guildId}`),
          fetch(`/api/guilds/${guildId}/tickets`),
          fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`),
          fetch(`/api/guilds/${guildId}/tickets/form`),
        ]);

        if (!sRes.ok) {
          const err = await sRes.json().catch(() => ({}));
          throw new Error(err?.error || `Fehler beim Laden der Einstellungen (${sRes.status})`);
        }

        const s = await sRes.json();
        setSettings(s);

        if (!tRes.ok) throw new Error(`Fehler beim Laden der Tickets (${tRes.status})`);
        setTickets(await tRes.json());

        setChannels(cRes.ok ? await cRes.json() : []);
        setRoles(rRes.ok ? await rRes.json() : []);

        // ticket form
        const tf = tfRes.ok ? await tfRes.json() : { mode: "default", version: 1 };
        setTicketForm({
          mode: tf.mode || "default",
          version: tf.version || 1,
          botCode: tf.botCode || "",
          builderData: tf.builderData || null,
        });

        const bd = tf.builderData || null;
        setModal(bd?.modal || defaultTicketModal());
        setResponse(bd?.response || defaultTicketResponse());
      } catch (e) {
        setLoadError(e?.message || "Unbekannter Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [guildId]);

  // auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [sortedMessages.length]);

  async function fetchMessages(ticketId, { silent = false } = {}) {
    try {
      if (!silent) setChatLoading(true);
      setChatError(null);

      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setChatError(err?.error || `Fehler beim Laden (${res.status})`);
        return;
      }

      const msgs = await res.json();
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      setChatError("Unbekannter Fehler beim Laden der Nachrichten");
    } finally {
      if (!silent) setChatLoading(false);
    }
  }

  async function onSelectTicket(t) {
    setSelectedTicket(t);
    setMessages([]);
    setReplyText("");
    await fetchMessages(t._id);
  }

  async function sendReply() {
    if (!selectedTicketId) return;
    const content = safeStr(replyText).trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setChatError(err?.error || `Fehler beim Senden (${res.status})`);
        return;
      }

      setReplyText("");
      await fetchMessages(selectedTicketId, { silent: true });
    } catch {
      setChatError("Unbekannter Fehler beim Senden");
    }
  }

  async function saveSettings(e) {
    e?.preventDefault?.();
    if (!settings) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flashFormMsg(err?.error || `Speichern fehlgeschlagen (${res.status})`);
        return;
      }

      const updated = await res.json();
      setSettings(updated);
      flashFormMsg("Einstellungen gespeichert ✅");
    } catch {
      flashFormMsg("Einstellungen speichern fehlgeschlagen ❌");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveTicketForm() {
    setFormSaving(true);
    try {
      const botCode = buildTicketBotCode(modal);

      const payload = {
        mode: "custom",
        version: 1,
        botCode,
        builderData: {
          modal,
          response,
        },
      };

      const res = await fetch(`/api/guilds/${guildId}/tickets/form`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flashFormMsg(err?.error || `Ticket-Form speichern fehlgeschlagen (${res.status})`);
        return;
      }

      const updated = await res.json();
      setTicketForm({
        mode: updated.mode || "custom",
        version: updated.version || 1,
        botCode: updated.botCode || "",
        builderData: updated.builderData || null,
      });

      flashFormMsg("Ticket-Form gespeichert ✅");
    } catch {
      flashFormMsg("Ticket-Form speichern fehlgeschlagen ❌");
    } finally {
      setFormSaving(false);
    }
  }

  async function resetTicketFormToBotDefault() {
    setFormSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/form/reset`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flashFormMsg(err?.error || `Reset fehlgeschlagen (${res.status})`);
        return;
      }

      const updated = await res.json();
      setTicketForm({
        mode: updated.mode || "default",
        version: updated.version || 1,
        botCode: updated.botCode || "",
        builderData: updated.builderData || null,
      });

      setModal(defaultTicketModal());
      setResponse(defaultTicketResponse());

      flashFormMsg("Auf Bot-Standard zurückgesetzt ✅");
    } catch {
      flashFormMsg("Reset fehlgeschlagen ❌");
    } finally {
      setFormSaving(false);
    }
  }

  /** ---------- Ticket form editor helpers ---------- */
  function addComponent(kind) {
    const list = modal.components || [];
    if (list.length >= 5) return flashFormMsg("Max 5 Elemente pro Modal");
    const id = `c_${Date.now()}`;

    if (kind === "text_input") {
      setModal((m) => ({
        ...m,
        components: [
          ...list,
          {
            id,
            kind: "text_input",
            label: "Text Input",
            description: "",
            customId: `field_${list.length + 1}`,
            required: true,
            placeholder: "",
            style: "paragraph",
            maxLength: 1000,
          },
        ],
      }));
      return;
    }

    if (kind === "string_select") {
      setModal((m) => ({
        ...m,
        components: [
          ...list,
          {
            id,
            kind: "string_select",
            label: "Select",
            description: "",
            customId: `select_${list.length + 1}`,
            required: true,
            placeholder: "Choose…",
            options: [
              { id: "o1", label: "Option 1", value: "option_1", description: "" },
              { id: "o2", label: "Option 2", value: "option_2", description: "" },
            ],
          },
        ],
      }));
      return;
    }

    if (kind === "file_upload") {
      setModal((m) => ({
        ...m,
        components: [
          ...list,
          {
            id,
            kind: "file_upload",
            label: "File Upload",
            description: "",
            customId: `files_${list.length + 1}`,
            required: false,
          },
        ],
      }));
    }
  }

  function updateComponent(id, patch) {
    setModal((m) => ({
      ...m,
      components: (m.components || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function deleteComponent(id) {
    setModal((m) => ({ ...m, components: (m.components || []).filter((c) => c.id !== id) }));
  }

  function moveComponent(id, dir) {
    setModal((m) => {
      const arr = [...(m.components || [])];
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return m;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return m;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
      return { ...m, components: arr };
    });
  }

  /** ---------- Variable insert (for response) ---------- */
  const [varCustomId, setVarCustomId] = useState("");

  function insertVarIntoResponseField(field, token) {
    setResponse((r) => {
      const next = { ...r };
      if (field === "embed.title") next.embed = { ...next.embed, title: safeStr(next.embed?.title) + token };
      if (field === "embed.description") next.embed = { ...next.embed, description: safeStr(next.embed?.description) + token };
      if (field === "text") next.text = safeStr(next.text) + token;
      if (field === "content") next.content = safeStr(next.content) + token;
      return next;
    });
  }

  function tokenField() {
    const cid = safeStr(varCustomId).trim().replace(/[^\w:\-]/g, "");
    if (!cid) return null;
    return `{field:${cid}}`;
  }

  if (loading) return <div className="p-8 text-gray-300">Lade Ticketsystem…</div>;
  if (loadError) return <div className="p-8 text-red-300">❌ {loadError}</div>;
  if (!settings) return <div className="p-8 text-gray-300">Keine Einstellungen gefunden.</div>;

  return (
    <div className="px-4 lg:px-10 py-8">
      {/* more width */}
      <div className="mx-auto w-full max-w-[1700px]">
        <style jsx global>{`
          .discord-md strong { font-weight: 700; color: #fff; }
          .discord-md em { font-style: italic; }
          .discord-md u { text-decoration: underline; }
          .discord-md s { text-decoration: line-through; opacity: 0.95; }
          .discord-md .inlinecode {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            padding: 0.1rem 0.35rem;
            border-radius: 0.35rem;
            font-size: 0.85em;
            color: #e6e6e6;
          }
          .discord-md .codeblock {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            background: rgba(0,0,0,0.35);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 0.75rem;
            padding: 0.75rem;
            overflow-x: auto;
          }
          .discord-md .codeblock code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.85rem;
            color: #e6e6e6;
            white-space: pre;
          }
          .discord-md .quote {
            border-left: 4px solid rgba(88,101,242,0.6);
            padding-left: 0.75rem;
            margin: 0.25rem 0;
            color: rgba(229,231,235,0.9);
          }
        `}</style>

        {/* Header + Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Ticketsystem</h1>
            <p className="text-gray-400 text-sm mt-1">Overview + Settings. Preview rechts bleibt sichtbar.</p>
          </div>

          <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "overview" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"
              )}
            >
              <MessageSquare className="w-4 h-4" /> Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === "settings" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"
              )}
            >
              <Settings2 className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            {/* Lists */}
            <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-white font-bold">Tickets</div>
                <div className="text-xs text-gray-400">{tickets.length} total</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Open ({openTickets.length})
                </div>
                <div className="space-y-2">
                  {openTickets.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-black/20 border border-white/10 rounded-xl p-3">
                      No open tickets.
                    </div>
                  ) : (
                    openTickets.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => onSelectTicket(t)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition",
                          selectedTicketId === t._id
                            ? "border-[#5865F2]/60 bg-[#5865F2]/10"
                            : "border-white/10 bg-black/20 hover:bg-white/5"
                        )}
                      >
                        <div className="text-white font-bold text-sm">{truncate(t.issue || "Ticket", 40)}</div>
                        <div className="text-xs text-gray-400">
                          {t.userTag || t.userId} • {new Date(t.createdAt || Date.now()).toLocaleString("de-DE")}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Closed ({closedTickets.length})
                </div>
                <div className="space-y-2">
                  {closedTickets.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-black/20 border border-white/10 rounded-xl p-3">
                      No closed tickets.
                    </div>
                  ) : (
                    closedTickets.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => onSelectTicket(t)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition",
                          selectedTicketId === t._id
                            ? "border-[#5865F2]/60 bg-[#5865F2]/10"
                            : "border-white/10 bg-black/20 hover:bg-white/5"
                        )}
                      >
                        <div className="text-white font-bold text-sm">{truncate(t.issue || "Ticket", 40)}</div>
                        <div className="text-xs text-gray-400">
                          {t.userTag || t.userId} • {new Date(t.createdAt || Date.now()).toLocaleString("de-DE")}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[520px]">
              {!selectedTicket ? (
                <div className="text-gray-400 text-sm">Select a ticket to view messages.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <div className="text-white font-bold">{truncate(selectedTicket.issue || "Ticket", 60)}</div>
                      <div className="text-xs text-gray-400">
                        {selectedTicket.userTag || selectedTicket.userId} • {selectedTicket.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white"
                      onClick={() => fetchMessages(selectedTicketId)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
                    {chatLoading ? (
                      <div className="text-gray-400 text-sm">Loading messages…</div>
                    ) : chatError ? (
                      <div className="text-red-300 text-sm">❌ {chatError}</div>
                    ) : sortedMessages.length === 0 ? (
                      <div className="text-gray-500 text-sm">No messages.</div>
                    ) : (
                      sortedMessages.map((m, idx) => (
                        <div key={m._id || idx} className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xs text-gray-400 flex justify-between">
                            <span>{m.authorTag || m.authorId}</span>
                            <span>{new Date(m.timestamp || m.createdAt || Date.now()).toLocaleString("de-DE")}</span>
                          </div>
                          <div className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">{m.content}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Reply</Label>
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="bg-black/20 border border-white/10 text-white"
                        placeholder="Type a message…"
                      />
                      <Button type="button" onClick={sendReply} className="bg-[#5865F2] font-bold">
                        <Send className="w-4 h-4 mr-2" /> Send
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="mt-6 relative">
            {/**
             * Layout-Idee:
             * - Links: Settings + darunter Editor (Modal/Response)
             * - Rechts: Preview fixed, vertikal mittig (nicht oben sticky)
             *
             * Damit links nicht unter die fixed Preview läuft:
             * - auf XL geben wir rechts Padding, so breit wie Preview
             */}
            <div className="xl:pr-[min(620px,44vw)] space-y-6">
              {/* Ticket Settings */}
              <form onSubmit={saveSettings} className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">Ticket Settings</div>
                    <div className="text-xs text-gray-400">Kategorie, Log, Panel, Support role</div>
                  </div>
                  <Button type="submit" disabled={savingSettings} className="bg-[#5865F2] font-bold">
                    <Save className="w-4 h-4 mr-2" /> {savingSettings ? "Speichere…" : "Speichern"}
                  </Button>
                </div>

                <ChannelSelect
                  label="Ticket Kategorie"
                  value={settings.ticketCategoryId}
                  onChange={(v) => setSettings({ ...settings, ticketCategoryId: v })}
                  channels={channels}
                  typeFilter={4}
                  placeholder="Kategorie auswählen..."
                />

                <ChannelSelect
                  label="Log Channel"
                  value={settings.logChannelId}
                  onChange={(v) => setSettings({ ...settings, logChannelId: v })}
                  channels={channels}
                  typeFilter={0}
                  placeholder="Log-Channel auswählen..."
                />

                <ChannelSelect
                  label="Panel Channel"
                  value={settings.panelChannelId}
                  onChange={(v) => setSettings({ ...settings, panelChannelId: v })}
                  channels={channels}
                  typeFilter={0}
                  placeholder="Panel-Channel auswählen..."
                />

                <RoleSelect
                  label="Support Rolle"
                  value={settings.supportRoleId}
                  onChange={(v) => setSettings({ ...settings, supportRoleId: v })}
                  roles={roles}
                  placeholder="Support-Rolle auswählen..."
                />
              </form>

              {/* Editor Card (Modal/Response) */}
              <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-bold">Ticket Form & Response</div>
                    <div className="text-xs text-gray-400">
                      Links bearbeiten. Rechts siehst du Preview immer mittig im Bildschirm.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={resetTicketFormToBotDefault}
                      disabled={formSaving}
                      className="bg-white/5 hover:bg-white/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>

                    <Button
                      type="button"
                      onClick={saveTicketForm}
                      disabled={formSaving}
                      className="bg-[#5865F2] font-bold"
                    >
                      <Save className="w-4 h-4 mr-2" /> {formSaving ? "Speichere…" : "Save"}
                    </Button>
                  </div>
                </div>

                {formMsg ? <div className="text-sm text-gray-200">{formMsg}</div> : null}

                {/* Editor Tabs (Modal / Response) */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
                  <button
                    type="button"
                    onClick={() => setEditorTab("modal")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      editorTab === "modal" ? "bg-[#5865F2] text-white" : "text-gray-300 hover:text-white"
                    )}
                  >
                    Modal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("response")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      editorTab === "response" ? "bg-[#5865F2] text-white" : "text-gray-300 hover:text-white"
                    )}
                  >
                    Response
                  </button>
                </div>

                {/* Modal Editor */}
                {editorTab === "modal" && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-bold">Modal (Ticket Form)</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addComponent("text_input")}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Text
                        </button>
                        <button
                          type="button"
                          onClick={() => addComponent("string_select")}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Select
                        </button>
                        <button
                          type="button"
                          onClick={() => addComponent("file_upload")}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> File
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Title</Label>
                      <Input
                        value={modal.title}
                        onChange={(e) => setModal((m) => ({ ...m, title: e.target.value }))}
                        className="bg-black/20 border border-white/10 text-white"
                        maxLength={45}
                      />
                    </div>

                    <div className="space-y-3">
                      {(modal.components || []).map((c, idx) => (
                        <div key={c.id} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-white font-bold text-sm">
                              {idx + 1}. {c.kind}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveComponent(c.id, "up")}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                                title="Up"
                              >
                                <ChevronUp className="w-4 h-4 text-gray-200" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveComponent(c.id, "down")}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                                title="Down"
                              >
                                <ChevronDown className="w-4 h-4 text-gray-200" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteComponent(c.id)}
                                className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-200" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Label</Label>
                              <Input
                                value={c.label}
                                onChange={(e) => updateComponent(c.id, { label: e.target.value })}
                                className="bg-black/20 border border-white/10 text-white"
                                maxLength={45}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Custom ID</Label>
                              <Input
                                value={c.customId}
                                onChange={(e) => updateComponent(c.id, { customId: e.target.value })}
                                className="bg-black/20 border border-white/10 text-white"
                                maxLength={100}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">
                              Description (optional)
                            </Label>
                            <Input
                              value={c.description || ""}
                              onChange={(e) => updateComponent(c.id, { description: e.target.value })}
                              className="bg-black/20 border border-white/10 text-white"
                              maxLength={100}
                            />
                          </div>

                          <label className="flex items-center gap-2 text-sm text-gray-200">
                            <input
                              type="checkbox"
                              checked={!!c.required}
                              onChange={(e) => updateComponent(c.id, { required: e.target.checked })}
                              className="accent-[#5865F2]"
                            />
                            Required
                          </label>

                          {c.kind === "text_input" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Style</Label>
                                <select
                                  value={c.style || "paragraph"}
                                  onChange={(e) => updateComponent(c.id, { style: e.target.value })}
                                  className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"
                                >
                                  <option value="short" className="bg-[#1a1b1e]">
                                    Short
                                  </option>
                                  <option value="paragraph" className="bg-[#1a1b1e]">
                                    Paragraph
                                  </option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Max Length</Label>
                                <Input
                                  value={c.maxLength ?? 1000}
                                  onChange={(e) =>
                                    updateComponent(c.id, { maxLength: Number(e.target.value || 1000) })
                                  }
                                  className="bg-black/20 border border-white/10 text-white"
                                  type="number"
                                  min={1}
                                  max={4000}
                                />
                              </div>
                              <div className="space-y-1 sm:col-span-2">
                                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Placeholder</Label>
                                <Input
                                  value={c.placeholder || ""}
                                  onChange={(e) => updateComponent(c.id, { placeholder: e.target.value })}
                                  className="bg-black/20 border border-white/10 text-white"
                                  maxLength={100}
                                />
                              </div>
                            </div>
                          )}

                          {c.kind === "string_select" && (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Placeholder</Label>
                                <Input
                                  value={c.placeholder || ""}
                                  onChange={(e) => updateComponent(c.id, { placeholder: e.target.value })}
                                  className="bg-black/20 border border-white/10 text-white"
                                  maxLength={100}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-white font-bold text-sm">Options</div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...(c.options || [])];
                                      if (next.length >= 25) return flashFormMsg("Max 25 Optionen");
                                      next.push({
                                        id: `o_${Date.now()}`,
                                        label: `Option ${next.length + 1}`,
                                        value: `option_${next.length + 1}`,
                                        description: "",
                                      });
                                      updateComponent(c.id, { options: next });
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
                                  >
                                    <Plus className="w-4 h-4" /> Add
                                  </button>
                                </div>

                                {(c.options || []).map((o) => (
                                  <div key={o.id} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <Input
                                        value={o.label}
                                        onChange={(e) => {
                                          const next = (c.options || []).map((x) =>
                                            x.id === o.id ? { ...x, label: e.target.value } : x
                                          );
                                          updateComponent(c.id, { options: next });
                                        }}
                                        className="bg-black/20 border border-white/10 text-white"
                                        placeholder="Label"
                                        maxLength={100}
                                      />
                                      <Input
                                        value={o.value}
                                        onChange={(e) => {
                                          const next = (c.options || []).map((x) =>
                                            x.id === o.id ? { ...x, value: e.target.value } : x
                                          );
                                          updateComponent(c.id, { options: next });
                                        }}
                                        className="bg-black/20 border border-white/10 text-white"
                                        placeholder="Value"
                                        maxLength={100}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        value={o.description || ""}
                                        onChange={(e) => {
                                          const next = (c.options || []).map((x) =>
                                            x.id === o.id ? { ...x, description: e.target.value } : x
                                          );
                                          updateComponent(c.id, { options: next });
                                        }}
                                        className="bg-black/20 border border-white/10 text-white"
                                        placeholder="Description (optional)"
                                        maxLength={100}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = (c.options || []).filter((x) => x.id !== o.id);
                                          updateComponent(c.id, { options: next });
                                        }}
                                        className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25"
                                        title="Delete option"
                                      >
                                        <X className="w-4 h-4 text-red-200" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Speichern erzeugt automatisch den richtigen BOT-JSON Code (ohne Copy/Paste).
                    </div>
                  </div>
                )}

                {/* Response Editor */}
                {editorTab === "response" && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                    <div className="text-white font-bold">Response</div>

                    <div className="flex flex-wrap gap-2">
                      {["default", "text", "embed"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setResponse((r) => ({ ...r, type: t }))}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-bold",
                            response.type === t
                              ? "bg-[#5865F2] text-white"
                              : "bg-white/5 hover:bg-white/10 text-gray-200"
                          )}
                        >
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl bg-black/20 border border-white/10 p-3 space-y-2">
                      <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">Variables</div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10"
                          onClick={() => insertVarIntoResponseField("embed.description", "{user}")}
                        >
                          Insert {`{user}`}
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10"
                          onClick={() => insertVarIntoResponseField("embed.description", "{username}")}
                        >
                          Insert {`{username}`}
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10"
                          onClick={() => insertVarIntoResponseField("embed.description", "{server}")}
                        >
                          Insert {`{server}`}
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 ring-1 ring-white/10"
                          onClick={() => insertVarIntoResponseField("embed.description", "{channel}")}
                        >
                          Insert {`{channel}`}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={varCustomId}
                          onChange={(e) => setVarCustomId(e.target.value)}
                          className="bg-black/20 border border-white/10 text-white"
                          placeholder="Custom ID (z.B. ticket_desc)"
                        />
                        <Button
                          type="button"
                          className="bg-white/5 hover:bg-white/10"
                          onClick={() => {
                            const tok = tokenField();
                            if (!tok) return flashFormMsg("Custom ID fehlt");
                            insertVarIntoResponseField("embed.description", tok);
                          }}
                        >
                          Insert Field
                        </Button>
                      </div>

                      <div className="text-[11px] text-gray-500">
                        {`{field:customId}`} ersetzt den Modal-Input.
                      </div>
                    </div>

                    {response.type === "text" && (
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Text response</Label>
                        <textarea
                          value={response.text || ""}
                          onChange={(e) => setResponse((r) => ({ ...r, text: e.target.value }))}
                          className="w-full min-h-[110px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                          placeholder="Send this as plain text to the ticket channel…"
                        />
                        <div className="text-[11px] text-gray-500">Max 2000 chars (Discord content).</div>
                      </div>
                    )}

                    {response.type === "embed" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">
                            Content (optional)
                          </Label>
                          <Input
                            value={response.content || ""}
                            onChange={(e) => setResponse((r) => ({ ...r, content: e.target.value }))}
                            className="bg-black/20 border border-white/10 text-white"
                            placeholder="Optional message content (above the embed)…"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Embed title</Label>
                          <Input
                            value={response.embed?.title || ""}
                            onChange={(e) =>
                              setResponse((r) => ({ ...r, embed: { ...(r.embed || {}), title: e.target.value } }))
                            }
                            className="bg-black/20 border border-white/10 text-white"
                            maxLength={256}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Embed description</Label>
                          <textarea
                            value={response.embed?.description || ""}
                            onChange={(e) =>
                              setResponse((r) => ({
                                ...r,
                                embed: { ...(r.embed || {}), description: e.target.value },
                              }))
                            }
                            className="w-full min-h-[110px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#5865F2]"
                            maxLength={4096}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={toHexColor(response.embed?.color)}
                              onChange={(e) =>
                                setResponse((r) => ({ ...r, embed: { ...(r.embed || {}), color: e.target.value } }))
                              }
                              className="h-10 w-12 rounded-md bg-transparent border border-white/10"
                            />
                            <Input
                              value={toHexColor(response.embed?.color)}
                              onChange={(e) =>
                                setResponse((r) => ({ ...r, embed: { ...(r.embed || {}), color: e.target.value } }))
                              }
                              className="bg-black/20 border border-white/10 text-white"
                              placeholder="#5865F2"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-200">
                          <input
                            type="checkbox"
                            checked={!!response.embed?.timestamp}
                            onChange={(e) =>
                              setResponse((r) => ({ ...r, embed: { ...(r.embed || {}), timestamp: e.target.checked } }))
                            }
                            className="accent-[#5865F2]"
                          />
                          Timestamp
                        </label>

                        <div className="space-y-2">
                          <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Footer (optional)</Label>
                          <Input
                            value={response.embed?.footerText || ""}
                            onChange={(e) =>
                              setResponse((r) => ({ ...r, embed: { ...(r.embed || {}), footerText: e.target.value } }))
                            }
                            className="bg-black/20 border border-white/10 text-white"
                            placeholder="Footer text…"
                          />
                        </div>
                      </div>
                    )}

                    {response.type === "default" && (
                      <div className="text-sm text-gray-400">
                        Bot uses its built-in default welcome message + embed.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PREVIEW: fixed + centered (nur XL) */}
            <div className="hidden xl:block">
              <div
                className={cn(
                  "fixed right-8 top-1/2 -translate-y-1/2",
                  "w-[min(580px,42vw)]"
                )}
              >
                {/* Scrollbox damit es im Viewport bleibt */}
                <div className="max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1012] p-4 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold">Preview</div>
                    <div className="text-xs text-gray-500">rechts immer sichtbar</div>
                  </div>

                  {/* Modal Preview */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                    <div className="text-white font-bold">Modal Preview</div>
                    <div className="text-white font-black text-lg">{truncate(modal.title, 45)}</div>

                    {(modal.components || []).slice(0, 5).map((c) => (
                      <div key={c.id} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-300">
                          {truncate(c.label, 45)}
                        </div>
                        {c.description ? <div className="text-xs text-gray-500">{truncate(c.description, 100)}</div> : null}

                        {c.kind === "text_input" && (
                          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-gray-500 text-sm">
                            {c.placeholder ? truncate(c.placeholder, 70) : "Text input…"}{" "}
                            {c.required ? <span className="text-red-300">*</span> : null}
                          </div>
                        )}

                        {c.kind === "string_select" && (
                          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-gray-500 text-sm">
                            {c.placeholder ? truncate(c.placeholder, 70) : "Select…"}{" "}
                            {c.required ? <span className="text-red-300">*</span> : null}
                          </div>
                        )}

                        {c.kind === "file_upload" && (
                          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-gray-500 text-sm">
                            File upload {c.required ? <span className="text-red-300">*</span> : null}
                          </div>
                        )}

                        <div className="text-[11px] text-gray-600 font-mono">customId: {c.customId || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {/* Response Preview */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                    <div className="text-white font-bold">Response Preview</div>

                    {response.type === "text" && (
                      <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4 text-gray-200 text-sm whitespace-pre-wrap">
                        <DiscordMarkdown text={response.text || ""} />
                      </div>
                    )}

                    {response.type === "embed" && (
                      <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4">
                        {response.content ? (
                          <div className="text-gray-200 text-sm mb-3 whitespace-pre-wrap">
                            <DiscordMarkdown text={response.content} />
                          </div>
                        ) : null}

                        <div className="flex gap-3">
                          <div className="w-1 rounded-full" style={{ background: toHexColor(response.embed?.color) }} />
                          <div className="flex-1 space-y-2">
                            {response.embed?.title ? (
                              <div className="text-white font-bold">
                                <DiscordMarkdown text={response.embed.title} />
                              </div>
                            ) : null}

                            {response.embed?.description ? (
                              <div className="text-gray-300 text-sm whitespace-pre-wrap">
                                <DiscordMarkdown text={response.embed.description} />
                              </div>
                            ) : null}

                            {response.embed?.footerText || response.embed?.timestamp ? (
                              <div className="text-xs text-gray-400 pt-2">
                                {response.embed?.footerText ? <DiscordMarkdown text={response.embed.footerText} /> : null}
                                {response.embed?.timestamp ? <span> • {new Date().toLocaleString("de-DE")}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    {response.type === "default" && (
                      <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4 text-gray-400 text-sm">
                        Default bot response.
                      </div>
                    )}
                  </div>

                  {/* Debug Code */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                    <div className="text-white font-bold">Generated Ticket BOT Code</div>
                    <div className="text-[11px] text-gray-500">(nur Debug – nicht kopieren nötig)</div>
                    <textarea
                      readOnly
                      value={buildTicketBotCode(modal)}
                      className="w-full min-h-[140px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile hint */}
            <div className="xl:hidden mt-4 text-xs text-gray-500">
              Hinweis: Preview ist auf kleinen Screens nicht fixed (sonst wäre alles zu eng). Auf XL ist sie rechts mittig fixiert.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
