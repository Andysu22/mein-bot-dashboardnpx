"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Settings2, RefreshCw, Save, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// IMPORTE
import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

function cn(...xs) { return xs.filter(Boolean).join(" "); }
function safeStr(v) { return String(v ?? ""); }
function truncate(s, max) { return String(s ?? "").length > max ? String(s ?? "").slice(0, max - 1) + "…" : String(s ?? ""); }

// Bot Code Generator
function buildTicketBotCode(modal) {
  const payload = {
    v: 1,
    t: truncate(modal?.title || "Ticket Form", 45),
    id: "ticket_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = {
        k: c.kind,
        cid: truncate(c.customId || c.custom_id || "", 100),
        l: truncate(c.label || "Field", 45),
        d: truncate(c.description || "", 100),
        r: !!c.required,
      };
      if (c.kind === "text_input") {
        return { ...base, s: (c.style === "paragraph" || c.style === 2) ? 2 : 1, ph: truncate(c.placeholder || "", 100) || undefined, mx: 4000 };
      }
      if (c.kind === "string_select") {
        return { ...base, ph: truncate(c.placeholder || "", 100) || undefined, mn: 1, mxv: 1, o: (c.options || []).slice(0, 25).map((o) => ({ l: truncate(o.label || "Option", 100), v: truncate(o.value || "value", 100), d: truncate(o.description || "", 100) || undefined })) };
      }
      if (c.kind === "file_upload") return { ...base };
      return { ...base, k: "text_input", s: 1 };
    }),
  };
  return JSON.stringify(payload);
}

const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);
  return (
    <div className="space-y-2">
      <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none">
        <option value="" className="bg-[#1a1b1e] text-gray-500">{placeholder || "Bitte wählen..."}</option>
        {filtered.map((c) => (<option key={c.id} value={c.id} className="bg-[#1a1b1e]">{c.name}</option>))}
      </select>
    </div>
  );
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  return (
    <div className="space-y-2">
      <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none">
        <option value="" className="bg-[#1a1b1e] text-gray-500">{placeholder || "Bitte wählen..."}</option>
        {filtered.map((r) => (<option key={r.id} value={r.id} className="bg-[#1a1b1e]">{r.name}</option>))}
      </select>
    </div>
  );
};

function defaultTicketModal() {
  return {
    title: "Create Ticket", custom_id: "ticket_form", show_warning: false,
    components: [
      { id: "c1", kind: "string_select", label: "Category", description: "Choose a category", customId: "ticket_cat", required: true, placeholder: "Select category…", options: [{ label: "Support", value: "support", description: "", id: "o1" }, { label: "Apply", value: "apply", description: "", id: "o2" }] },
      { id: "c2", kind: "text_input", label: "Description", description: "Describe your issue", customId: "ticket_desc", required: true, placeholder: "Explain your issue…", style: 2, maxLength: 1000 },
    ],
  };
}

function defaultTicketResponse() {
  return {
    type: "default", text: "", content: "",
    embed: {
      title: "Ticket Created", description: "Hello {user}!\n\nThanks for your ticket.\n\n**Your message:**\n{field:ticket_desc}", color: "#5865F2", fields: [], footer: { text: "", icon_url: "" }, timestamp: false,
    },
  };
}

export default function TicketsPage() {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("modal");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Data
  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);

  // Settings
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [ticketForm, setTicketForm] = useState({ mode: "default", version: 1, botCode: "", builderData: null });
  const [formSaving, setFormSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  // Builder States
  const [modal, setModal] = useState(defaultTicketModal());
  const [response, setResponse] = useState(defaultTicketResponse());

  // Chat
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
    return arr.sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
  }, [messages]);

  function flashFormMsg(msg) { setFormMsg(msg); setTimeout(() => setFormMsg(""), 1700); }

  useEffect(() => {
    if (!guildId || guildId === "undefined") return;
    const loadData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [sRes, tRes, cRes, rRes, tfRes, gRes] = await Promise.all([
          fetch(`/api/settings/${guildId}`),
          fetch(`/api/guilds/${guildId}/tickets`),
          fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`),
          fetch(`/api/guilds/${guildId}/tickets/form`),
          fetch(`/api/user/guilds`),
        ]);

        if (!sRes.ok) throw new Error(`Fehler beim Laden (${sRes.status})`);
        setSettings(await sRes.json());
        if (tRes.ok) setTickets(await tRes.json());
        if (cRes.ok) setChannels(await cRes.json());
        if (rRes.ok) setRoles(await rRes.json());

        if (gRes.ok) {
            const allGuilds = await gRes.json();
            const active = allGuilds.find(g => g.id === guildId);
            if (active) setCurrentGuild(active);
        }

        const tf = tfRes.ok ? await tfRes.json() : {};
        const bd = tf.builderData || null;
        if (bd?.modal) setModal(bd.modal);
        if (bd?.response) {
            let r = bd.response;
            if (!r.embed.footer && r.embed.footerText) r.embed.footer = { text: r.embed.footerText, icon_url: "" };
            setResponse(r);
        }
      } catch (e) { setLoadError(e?.message || "Fehler beim Laden"); } finally { setLoading(false); }
    };
    loadData();
  }, [guildId]);

  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [sortedMessages.length]);

  async function fetchMessages(ticketId, { silent = false } = {}) {
    try {
      if (!silent) setChatLoading(true); setChatError(null);
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) { setChatError("Ladefehler"); return; }
      setMessages(await res.json());
    } catch { setChatError("Fehler"); } finally { if (!silent) setChatLoading(false); }
  }

  async function onSelectTicket(t) { setSelectedTicket(t); setMessages([]); setReplyText(""); await fetchMessages(t._id); }

  async function sendReply() {
    if (!selectedTicketId) return;
    const content = safeStr(replyText).trim(); if (!content) return;
    try { await fetch(`/api/tickets/${selectedTicketId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); setReplyText(""); await fetchMessages(selectedTicketId, { silent: true }); } catch { setChatError("Fehler beim Senden"); }
  }

  async function saveSettings(e) { e?.preventDefault?.(); setSavingSettings(true); try { const res = await fetch(`/api/settings/${guildId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); if (res.ok) { setSettings(await res.json()); flashFormMsg("Einstellungen gespeichert ✅"); } else flashFormMsg("Fehler"); } catch { flashFormMsg("Fehler"); } finally { setSavingSettings(false); } }

  async function saveTicketForm() { setFormSaving(true); try { const botCode = buildTicketBotCode(modal); const payload = { mode: "custom", version: 1, botCode, builderData: { modal, response } }; const res = await fetch(`/api/guilds/${guildId}/tickets/form`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (res.ok) flashFormMsg("Formular gespeichert ✅"); else flashFormMsg("Fehler"); } catch { flashFormMsg("Fehler"); } finally { setFormSaving(false); } }

  async function resetTicketFormToBotDefault() { setFormSaving(true); try { const res = await fetch(`/api/guilds/${guildId}/tickets/form/reset`, { method: "POST" }); if (res.ok) { setModal(defaultTicketModal()); setResponse(defaultTicketResponse()); flashFormMsg("Reset ok ✅"); } } catch { flashFormMsg("Fehler"); } finally { setFormSaving(false); } }

  const [varCustomId, setVarCustomId] = useState("");
  function insertVarIntoResponseField(field, token) {
    setResponse((r) => {
      const next = { ...r };
      if (field === "embed.description") next.embed = { ...next.embed, description: (next.embed?.description || "") + token };
      if (field === "text") next.text = safeStr(next.text) + token;
      return next;
    });
  }

  if (loading) return <div className="p-8 text-gray-300">Lade Ticketsystem...</div>;
  if (loadError) return <div className="p-8 text-red-300">❌ {loadError}</div>;
  if (!settings) return <div className="p-8 text-gray-300">Keine Einstellungen.</div>;

  // Icon
  const guildIconUrl = currentGuild?.icon 
    ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` 
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="px-4 lg:px-10 py-8 mx-auto w-full max-w-[1700px]">
      <style jsx global>{`
        .discord-md strong { font-weight: 700; color: #fff; }
        .discord-md em { font-style: italic; }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div><h1 className="text-3xl font-black text-white uppercase">Ticketsystem</h1><p className="text-gray-400 text-sm mt-1">Overview + Settings.</p></div>
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
          <button onClick={() => setActiveTab("overview")} className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2", activeTab === "overview" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white")}><MessageSquare className="w-4 h-4" /> Overview</button>
          <button onClick={() => setActiveTab("settings")} className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2", activeTab === "settings" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white")}><Settings2 className="w-4 h-4" /> Settings</button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
          <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between"><div className="text-white font-bold">Tickets</div><div className="text-xs text-gray-400">{tickets.length} total</div></div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {openTickets.map((t) => (
                    <button key={t._id} onClick={() => onSelectTicket(t)} className={cn("w-full text-left rounded-xl border p-3 transition", selectedTicketId === t._id ? "border-[#5865F2]/60 bg-[#5865F2]/10" : "border-white/10 bg-black/20 hover:bg-white/5")}>
                        <div className="text-white font-bold text-sm truncate">{t.issue || "Ticket"}</div>
                        <div className="text-xs text-gray-400">{t.userTag} • {new Date(t.createdAt).toLocaleDateString()}</div>
                    </button>
                ))}
                {openTickets.length === 0 && <div className="text-sm text-gray-500 p-2">Keine offenen Tickets.</div>}
            </div>
          </div>
          <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[520px]">
             {!selectedTicket ? <div className="flex-1 flex items-center justify-center text-gray-500">Wähle ein Ticket aus.</div> : (
                 <>
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <div><div className="font-bold text-white">{selectedTicket.issue}</div><div className="text-xs text-gray-400">{selectedTicket.userTag}</div></div>
                        <button onClick={() => fetchMessages(selectedTicket._id)} className="p-2 bg-white/5 rounded hover:bg-white/10"><RefreshCw className="w-4 h-4 text-white"/></button>
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
                        {chatLoading ? <div className="text-gray-500">Lade...</div> : messages.map((m, i) => (
                            <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/10">
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span className="font-bold text-gray-300">{m.authorTag}</span><span>{new Date(m.timestamp).toLocaleString()}</span></div>
                                <div className="text-sm text-gray-200 whitespace-pre-wrap"><DiscordMarkdown text={m.content} /></div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-3 border-t border-white/10 flex gap-2"><Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="..." className="bg-black/20 border-white/10 text-white" /><Button onClick={sendReply} className="bg-[#5865F2]"><Send className="w-4 h-4"/></Button></div>
                 </>
             )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && (
        <div className="mt-6 relative">
          <div className="xl:pr-[min(620px,44vw)] space-y-6">
            <form onSubmit={saveSettings} className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex justify-between"><div className="text-white font-bold">Ticket Settings</div><Button type="submit" disabled={savingSettings} className="bg-[#5865F2] font-bold"><Save className="w-4 h-4 mr-2"/> Save</Button></div>
              <ChannelSelect label="Kategorie" value={settings.ticketCategoryId} onChange={v => setSettings({...settings, ticketCategoryId: v})} channels={channels} typeFilter={4} />
              <ChannelSelect label="Log Channel" value={settings.logChannelId} onChange={v => setSettings({...settings, logChannelId: v})} channels={channels} typeFilter={0} />
              <ChannelSelect label="Panel Channel" value={settings.panelChannelId} onChange={v => setSettings({...settings, panelChannelId: v})} channels={channels} typeFilter={0} />
              <RoleSelect label="Support Rolle" value={settings.supportRoleId} onChange={v => setSettings({...settings, supportRoleId: v})} roles={roles} />
            </form>

            <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                  <div className="text-white font-bold">Design Builder</div>
                  <div className="flex gap-2">
                      <Button type="button" onClick={resetTicketFormToBotDefault} disabled={formSaving} className="bg-white/5 hover:bg-white/10"><RefreshCw className="w-4 h-4 mr-2"/> Reset</Button>
                      <Button type="button" onClick={saveTicketForm} disabled={formSaving} className="bg-[#5865F2] font-bold"><Save className="w-4 h-4 mr-2"/> Save</Button>
                  </div>
              </div>
              {formMsg && <div className="text-sm text-green-400 bg-green-500/10 p-2 rounded border border-green-500/20">{formMsg}</div>}
              
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 w-fit">
                  <button onClick={() => setEditorTab("modal")} className={cn("px-4 py-2 rounded-lg font-bold text-sm transition", editorTab === "modal" ? "bg-[#5865F2] text-white" : "text-gray-300 hover:text-white")}>Modal</button>
                  <button onClick={() => setEditorTab("response")} className={cn("px-4 py-2 rounded-lg font-bold text-sm transition", editorTab === "response" ? "bg-[#5865F2] text-white" : "text-gray-300 hover:text-white")}>Response</button>
              </div>

              {editorTab === "modal" && <ModalBuilder data={modal} onChange={setModal} />}
              
              {editorTab === "response" && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                  <div className="text-white font-bold">Response Type</div>
                  <div className="flex gap-2">{["default", "text", "embed"].map(t => <button key={t} onClick={() => setResponse(r => ({...r, type: t}))} className={cn("px-3 py-2 rounded-lg text-sm font-bold", response.type === t ? "bg-[#5865F2] text-white" : "bg-white/5 text-gray-200")}>{t.toUpperCase()}</button>)}</div>
                  
                  <div className="bg-black/20 p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="text-xs text-gray-300 font-bold uppercase">Variables</div>
                      <div className="flex flex-wrap gap-2">
                          {["{user}", "{username}", "{server}", "{channel}"].map(v => <button key={v} type="button" className="px-2 py-1 bg-white/5 rounded text-xs text-gray-200" onClick={() => insertVarIntoResponseField("embed.description", v)}>Insert {v}</button>)}
                      </div>
                      <div className="flex gap-2">
                          <Input value={varCustomId} onChange={e => setVarCustomId(e.target.value)} className="bg-black/20 border-white/10 text-white h-8 text-xs" placeholder="Custom ID" />
                          <Button type="button" className="h-8 text-xs bg-white/10" onClick={() => { if(varCustomId) insertVarIntoResponseField("embed.description", `{field:${varCustomId}}`); }}>Insert Field</Button>
                      </div>
                  </div>

                  {response.type === "text" && <div className="space-y-2"><Label className="text-gray-300 text-xs font-bold uppercase">Content</Label><textarea value={response.text || ""} onChange={e => setResponse(r => ({...r, text: e.target.value}))} className="w-full min-h-[100px] bg-black/20 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#5865F2]" /></div>}
                  {response.type === "embed" && (
                      <div className="space-y-3">
                          <div className="space-y-1"><Label className="text-gray-300 text-xs font-bold uppercase">Message Content (Optional)</Label><Input value={response.content || ""} onChange={e => setResponse(r => ({...r, content: e.target.value}))} className="bg-black/20 border-white/10 text-white" placeholder="Message above embed" /></div>
                          <EmbedBuilder data={response.embed} onChange={newEmbed => setResponse({...response, embed: newEmbed})} />
                      </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <div className="hidden xl:block">
            <div className={cn("fixed right-8 top-1/2 -translate-y-1/2", "w-[min(580px,42vw)]")}>
              <div className="max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#313338] p-4 space-y-4 shadow-2xl">
                <div className="flex justify-between border-b border-white/5 pb-2"><div className="text-white font-bold text-sm">LIVE PREVIEW</div></div>

                {editorTab === "modal" ? <ModalPreview modal={modal} guildIconUrl={guildIconUrl} /> : (
                    <div className="rounded-xl p-4 bg-[#313338]">
                        {response.type !== "default" ? (
                            /* HIER IST DER NEUE PREVIEW-AUFRUF */
                            <EmbedPreview 
                                embed={response.embed} 
                                content={response.content || response.text} 
                                botName="Ticket Bot" 
                                botIconUrl={guildIconUrl} 
                            />
                        ) : (
                            <div className="text-gray-500 italic text-sm">Standard Bot Antwort aktiv.</div>
                        )}
                    </div>
                )}

                <div className="pt-4 border-t border-white/5"><div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Debug Code</div><textarea readOnly value={buildTicketBotCode(modal)} className="w-full h-20 bg-black/30 border border-white/10 rounded text-[10px] text-gray-500 font-mono p-2 resize-none outline-none" /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}