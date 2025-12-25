"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Settings2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- NEUE IMPORTS FÜR DIE BUILDER ---
// Stelle sicher, dass die Pfade exakt stimmen (Groß-/Kleinschreibung!)
import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

/** ---------- Small helpers ---------- */
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeStr(v) {
  return String(v ?? "");
}

function truncate(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

// Bot Code Generator (angepasst für den Export)
function buildTicketBotCode(modal) {
  const payload = {
    v: 1,
    t: truncate(modal?.title || "Ticket Form", 45),
    id: "ticket_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = {
        k: c.kind,
        cid: truncate(c.customId || c.custom_id || "", 100), // Support für beide Schreibweisen
        l: truncate(c.label || "Field", 45),
        d: truncate(c.description || "", 100),
        r: !!c.required,
      };

      if (c.kind === "text_input") {
        return {
          ...base,
          s: (c.style === "paragraph" || c.style === 2) ? 2 : 1,
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

/** ---------- Defaults ---------- */
function defaultTicketModal() {
  return {
    title: "Create Ticket",
    custom_id: "ticket_form",
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
      footer: { text: "", icon_url: "" }, // Objekt-Struktur für den Builder
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
        if (bd?.modal) setModal(bd.modal);
        
        // Kompatibilität sicherstellen
        if (bd?.response) {
            let r = bd.response;
            if(!r.embed.footer && r.embed.footerText) {
                r.embed.footer = { text: r.embed.footerText, icon_url: "" };
            }
            setResponse(r);
        }

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

  // --- Helpers für Variablen im Response Editor ---
  const [varCustomId, setVarCustomId] = useState("");
  function insertVarIntoResponseField(field, token) {
    setResponse((r) => {
      const next = { ...r };
      // Helper vor allem für die Description, da EmbedBuilder den Rest macht
      if (field === "embed.description") {
          const old = next.embed?.description || "";
          next.embed = { ...next.embed, description: old + token };
      }
      if (field === "text") next.text = safeStr(next.text) + token;
      return next;
    });
  }

  if (loading) return <div className="p-8 text-gray-300">Lade Ticketsystem…</div>;
  if (loadError) return <div className="p-8 text-red-300">❌ {loadError}</div>;
  if (!settings) return <div className="p-8 text-gray-300">Keine Einstellungen gefunden.</div>;

  return (
    <div className="px-4 lg:px-10 py-8">
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
                          <div className="text-sm text-gray-200 mt-2 whitespace-pre-wrap"><DiscordMarkdown text={m.content} /></div>
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

                {/* Modal Editor - HIER GEÄNDERT */}
                {editorTab === "modal" && (
                  /* Wir nutzen jetzt den ausgelagerten ModalBuilder */
                  <ModalBuilder data={modal} onChange={setModal} />
                )}

                {/* Response Editor - HIER GEÄNDERT */}
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
                            const tok = safeStr(varCustomId).trim().replace(/[^\w:\-]/g, "");
                            if (tok) insertVarIntoResponseField("embed.description", `{field:${tok}}`);
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

                        {/* Wir nutzen jetzt den EmbedBuilder anstatt der manuellen Inputs */}
                        <EmbedBuilder 
                            data={response.embed} 
                            onChange={(newEmbed) => setResponse({...response, embed: newEmbed})} 
                        />
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

            {/* RIGHT PREVIEW: fixed + centered (nur XL) - HIER GEÄNDERT */}
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

                  {editorTab === "modal" ? (
                      /* NEUER PREVIEW IMPORT */
                      <ModalPreview modal={modal} guildIconUrl={null} />
                  ) : (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                         <div className="text-white font-bold">Response Preview</div>
                         
                         {response.type === "text" && (
                            <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4 text-gray-200 text-sm whitespace-pre-wrap">
                                <DiscordMarkdown text={response.text || ""} />
                            </div>
                         )}

                         {response.type === "embed" && (
                             <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4">
                                {response.content && <div className="text-gray-200 text-sm mb-3 whitespace-pre-wrap"><DiscordMarkdown text={response.content} /></div>}
                                
                                {/* NEUER PREVIEW IMPORT FÜR EMBEDS */}
                                <EmbedPreview 
                                embed={response.embed} 
                                content={response.content || response.text} // Unterstützt Text-Mode und Embed-Content
                                botName="Ticket Bot" // Oder currentGuild?.name für Servername
                                botIconUrl={currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : null}
                            />
                             </div>
                         )}
                         
                         {response.type === "default" && (
                              <div className="rounded-xl border border-white/10 bg-[#0f1012] p-4 text-gray-400 text-sm">
                                Default bot response.
                              </div>
                        )}
                      </div>
                  )}

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