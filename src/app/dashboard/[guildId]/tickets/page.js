"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Settings2, RefreshCw, Save, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- BUILDER IMPORTS ---
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
    v: 1, t: truncate(modal?.title || "Ticket Form", 45), id: "ticket_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = { k: c.kind, cid: truncate(c.custom_id || "", 100), l: truncate(c.label || "Field", 45), d: truncate(c.description || "", 100), r: !!c.required };
      if (c.kind === "text_input") return { ...base, s: (c.style === "paragraph" || c.style === 2) ? 2 : 1, ph: truncate(c.placeholder || "", 100) || undefined, mx: 4000 };
      if (c.kind === "string_select") return { ...base, ph: truncate(c.placeholder || "", 100) || undefined, mn: 1, mxv: 1, o: (c.options || []).slice(0, 25).map((o) => ({ l: truncate(o.label || "Option", 100), v: truncate(o.value || "value", 100), d: truncate(o.description || "", 100) || undefined })) };
      if (c.kind === "file_upload") return { ...base };
      return { ...base, k: "text_input", s: 1 };
    }),
  };
  return JSON.stringify(payload);
}

const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);
  return (
    <div className="space-y-2"><Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"><option value="" className="bg-[#1a1b1e] text-gray-500">{placeholder || "Bitte wählen..."}</option>{filtered.map((c) => (<option key={c.id} value={c.id} className="bg-[#1a1b1e]">{c.name}</option>))}</select>
    </div>
  );
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  return (
    <div className="space-y-2"><Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"><option value="" className="bg-[#1a1b1e] text-gray-500">{placeholder || "Bitte wählen..."}</option>{filtered.map((r) => (<option key={r.id} value={r.id} className="bg-[#1a1b1e]">{r.name}</option>))}</select>
    </div>
  );
};

function defaultTicketModal() {
  return {
    title: "Create Ticket", custom_id: "ticket_form", show_warning: false,
    components: [
        { id: "c1", kind: "string_select", label: "Category", description: "Choose a category", custom_id: "ticket_cat", required: true, placeholder: "Select category…", options: [{ label: "Support", value: "support", description: "", id: "o1" }, { label: "Apply", value: "apply", description: "", id: "o2" }] }, 
        { id: "c2", kind: "text_input", label: "Description", description: "Describe your issue", custom_id: "ticket_desc", required: true, placeholder: "Explain your issue…", style: 2, maxLength: 1000 }
    ],
  };
}

// UPDATE: Standard ist jetzt "embed"
function defaultTicketResponse() {
  return {
    type: "embed", text: "", content: "",
    embed: { title: "Ticket Created", thumbnail_url: "{user_avatar}",description: "Hello {user}!\n\nThanks for your ticket.\n\n**Your message:**\n{field:ticket_desc}", color: "#5865F2", fields: [], footer: { text: "", icon_url: "" }, timestamp: false },
  };
}

export default function TicketsPage() {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("modal");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);

  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const [modal, setModal] = useState(defaultTicketModal());
  const [response, setResponse] = useState(defaultTicketResponse());

  const [selectedTicket, setSelectedTicket] = useState(null);
  const selectedTicketId = selectedTicket?._id;
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const chatScrollRef = useRef(null);

  const openTickets = useMemo(() => (tickets || []).filter((t) => t.status === "open"), [tickets]);
  const sortedMessages = useMemo(() => {
    const arr = Array.isArray(messages) ? [...messages] : [];
    return arr.sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
  }, [messages]);

  function flashFormMsg(msg) { setFormMsg(msg); setTimeout(() => setFormMsg(""), 1700); }

  useEffect(() => {
    if (!guildId || guildId === "undefined") return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [sRes, tRes, cRes, rRes, tfRes, gRes] = await Promise.all([
          fetch(`/api/settings/${guildId}`), fetch(`/api/guilds/${guildId}/tickets`), fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`), fetch(`/api/guilds/${guildId}/tickets/form`), fetch(`/api/user/guilds`),
        ]);
        if (!sRes.ok) throw new Error(`Fehler (${sRes.status})`);
        setSettings(await sRes.json());
        if (tRes.ok) setTickets(await tRes.json());
        if (cRes.ok) setChannels(await cRes.json());
        if (rRes.ok) setRoles(await rRes.json());
        if (gRes.ok) {
            const all = await gRes.json();
            const g = all.find(x => x.id === guildId);
            if(g) setCurrentGuild(g);
        }
        const tf = tfRes.ok ? await tfRes.json() : {};
        const bd = tf.builderData || null;
        if (bd?.modal) setModal(bd.modal);
        if (bd?.response) {
            let r = bd.response;
            if(!r.embed.footer && r.embed.footerText) r.embed.footer = { text: r.embed.footerText, icon_url: "" };
            // Fallback falls Datenbank alte Werte hat
            if(r.type === "default") r.type = "embed";
            setResponse(r);
        }
      } catch (e) { setLoadError(e?.message); } finally { setLoading(false); }
    };
    loadData();
  }, [guildId]);

  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [sortedMessages.length]);

  async function fetchMessages(ticketId) {
    try { setChatLoading(true); const res = await fetch(`/api/tickets/${ticketId}`); if (!res.ok) throw new Error(); setMessages(await res.json()); } catch {} finally { setChatLoading(false); }
  }
  async function onSelectTicket(t) { setSelectedTicket(t); setMessages([]); setReplyText(""); await fetchMessages(t._id); }
  async function sendReply() { if (!selectedTicketId || !replyText.trim()) return; try { await fetch(`/api/tickets/${selectedTicketId}`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ content: replyText }) }); setReplyText(""); fetchMessages(selectedTicketId); } catch {} }
  
  async function saveSettings(e) { e?.preventDefault(); setSavingSettings(true); try { const r = await fetch(`/api/settings/${guildId}`, { method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(settings) }); if(r.ok) { setSettings(await r.json()); flashFormMsg("Saved ✅"); } } finally { setSavingSettings(false); } }
  async function saveTicketForm() { setFormSaving(true); try { const pl = { mode: "custom", version: 1, botCode: buildTicketBotCode(modal), builderData: { modal, response } }; const r = await fetch(`/api/guilds/${guildId}/tickets/form`, { method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(pl) }); if(r.ok) flashFormMsg("Saved Form ✅"); } finally { setFormSaving(false); } }
  
  async function resetTicketFormToBotDefault() { 
      if (!window.confirm("Formular wirklich auf Standard zurücksetzen?")) return;
      try { const r = await fetch(`/api/guilds/${guildId}/tickets/form/reset`, { method: "POST" }); if(r.ok) { setModal(defaultTicketModal()); setResponse(defaultTicketResponse()); flashFormMsg("Reset ✅"); } } catch {} 
  }

  const [varCustomId, setVarCustomId] = useState("");
  function insertVarIntoResponseField(field, token) {
    setResponse((r) => {
      const next = { ...r };
      if (field === "embed.description") next.embed = { ...next.embed, description: (next.embed?.description || "") + token };
      if (field === "text") next.text = safeStr(next.text) + token;
      return next;
    });
  }

  if (loading) return <div className="p-8 text-gray-300">Lade...</div>;
  if (loadError) return <div className="p-8 text-red-300">❌ {loadError}</div>;
  if (!settings) return <div className="p-8 text-gray-300">Keine Einstellungen.</div>;

  const guildIconUrl = currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="px-4 lg:px-10 py-8 mx-auto w-full max-w-[1700px]">
      <style jsx global>{` .discord-md strong { font-weight: 700; color: #fff; } .discord-md .inlinecode { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; } `}</style>
      
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-white/5 pb-6 mb-6">
        <div><h1 className="text-3xl font-black text-white uppercase">Ticketsystem</h1><p className="text-gray-400 text-sm">Manage tickets & editors.</p></div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
          <button onClick={() => setActiveTab("overview")} className={cn("px-4 py-2 rounded-lg text-sm font-bold", activeTab === "overview" ? "bg-[#5865F2]" : "text-gray-400")}>Overview</button>
          <button onClick={() => setActiveTab("settings")} className={cn("px-4 py-2 rounded-lg text-sm font-bold", activeTab === "settings" ? "bg-[#5865F2]" : "text-gray-400")}>Settings</button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
           <div className="bg-[#1a1b1e] rounded-2xl p-4 space-y-2 border border-white/5 h-fit">
              <div className="font-bold text-white mb-2">Open Tickets ({openTickets.length})</div>
              {openTickets.map(t => (
                  <button key={t._id} onClick={() => onSelectTicket(t)} className={cn("w-full text-left p-3 rounded-xl border", selectedTicketId === t._id ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/10 bg-black/20")}>
                      <div className="text-white font-bold truncate">{t.issue}</div>
                      <div className="text-xs text-gray-400">{t.userTag}</div>
                  </button>
              ))}
           </div>
           <div className="bg-[#1a1b1e] rounded-2xl p-4 flex flex-col h-[600px] border border-white/5">
              {!selectedTicket ? <div className="m-auto text-gray-500">Select a ticket</div> : (
                  <>
                    <div className="border-b border-white/10 pb-3 mb-3 font-bold text-white">{selectedTicket.issue}</div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {messages.map((m, i) => (
                            <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/10">
                                <div className="flex justify-between text-xs text-gray-400 mb-1"><span className="font-bold text-gray-200">{m.authorTag}</span><span>{new Date(m.timestamp).toLocaleString()}</span></div>
                                <div className="text-sm text-gray-300 whitespace-pre-wrap"><DiscordMarkdown text={m.content}/></div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-3 flex gap-2"><Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." className="bg-black/20 border-white/10 text-white" /><Button onClick={sendReply} className="bg-[#5865F2]"><Send className="w-4 h-4"/></Button></div>
                  </>
              )}
           </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_500px] gap-8 items-start">
            <div className="space-y-6">
                <form onSubmit={saveSettings} className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between"><div className="font-bold text-white">Config</div><Button type="submit" disabled={savingSettings} className="bg-[#5865F2]">Save</Button></div>
                    <ChannelSelect label="Category" value={settings.ticketCategoryId} onChange={v => setSettings({...settings, ticketCategoryId: v})} channels={channels} typeFilter={4} />
                    <ChannelSelect label="Log Channel" value={settings.logChannelId} onChange={v => setSettings({...settings, logChannelId: v})} channels={channels} typeFilter={0} />
                    <ChannelSelect label="Panel Channel" value={settings.panelChannelId} onChange={v => setSettings({...settings, panelChannelId: v})} channels={channels} typeFilter={0} />
                    <RoleSelect label="Support Role" value={settings.supportRoleId} onChange={v => setSettings({...settings, supportRoleId: v})} roles={roles} />
                </form>

                <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="font-bold text-white">Editor</div>
                        <div className="flex gap-2">
                            <Button type="button" onClick={resetTicketFormToBotDefault} className="bg-white/5">Reset</Button>
                            <Button type="button" onClick={saveTicketForm} className="bg-[#5865F2]">Save Form</Button>
                        </div>
                    </div>
                    {formMsg && <div className="text-green-400 text-sm">{formMsg}</div>}
                    
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit">
                        <button onClick={() => setEditorTab("modal")} className={cn("px-4 py-2 rounded-lg text-sm font-bold", editorTab === "modal" ? "bg-[#5865F2]" : "text-gray-400")}>Modal</button>
                        <button onClick={() => setEditorTab("response")} className={cn("px-4 py-2 rounded-lg text-sm font-bold", editorTab === "response" ? "bg-[#5865F2]" : "text-gray-400")}>Response</button>
                    </div>

                    {editorTab === "modal" && <ModalBuilder data={modal} onChange={setModal} />}
                    {editorTab === "response" && (
                        <div className="space-y-4">
                            {/* UPDATE: Nur noch TEXT und EMBED Buttons */}
                            <div className="flex gap-2">
                                <button onClick={() => setResponse(r => ({...r, type: "text"}))} className={cn("px-3 py-1 rounded border font-bold text-xs", response.type === "text" ? "bg-[#5865F2] border-[#5865F2] text-white" : "border-white/10 text-gray-400 bg-black/20")}>TEXT</button>
                                <button onClick={() => setResponse(r => ({...r, type: "embed"}))} className={cn("px-3 py-1 rounded border font-bold text-xs", response.type === "embed" ? "bg-[#5865F2] border-[#5865F2] text-white" : "border-white/10 text-gray-400 bg-black/20")}>EMBED</button>
                            </div>

                            <div className="bg-black/20 p-3 rounded border border-white/10 space-y-2">
                                <div className="text-xs text-gray-400 font-bold">Variables</div>
                                <div className="flex flex-wrap gap-2">{["{user}", "{username}", "{server}", "{channel}"].map(v => <button key={v} onClick={() => insertVarIntoResponseField(response.type === "text" ? "text" : "embed.description", v)} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 hover:bg-white/10">{v}</button>)}</div>
                                <div className="flex gap-2"><Input value={varCustomId} onChange={e => setVarCustomId(e.target.value)} placeholder="Custom ID" className="h-8 text-xs bg-black/20 border-white/10" /><Button onClick={() => { if(varCustomId) insertVarIntoResponseField(response.type === "text" ? "text" : "embed.description", `{field:${varCustomId}}`) }} className="h-8 text-xs bg-white/10">Insert</Button></div>
                            </div>
                            
                            {/* UPDATE: Einfaches Textfeld bei TEXT, EmbedBuilder bei EMBED */}
                            {response.type === "text" && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-gray-400 uppercase font-bold">Message Content</Label>
                                    <textarea value={response.text || ""} onChange={e => setResponse(r => ({...r, text: e.target.value}))} className="w-full h-32 bg-black/20 border border-white/10 rounded p-2 text-white outline-none focus:border-[#5865F2]" placeholder="Your message here..." />
                                </div>
                            )}
                            {response.type === "embed" && (
                                <div className="space-y-3">
                                    <Input value={response.content || ""} onChange={e => setResponse(r => ({...r, content: e.target.value}))} placeholder="Message content (outside embed)..." className="bg-black/20 border-white/10" />
                                    <EmbedBuilder data={response.embed} onChange={e => setResponse({...response, embed: e})} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="hidden xl:block sticky top-6">
                <div className="bg-[#0f1012] border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="text-white font-bold border-b border-white/10 pb-3 mb-3">Live Preview</div>
                    {editorTab === "modal" ? <ModalPreview modal={modal} guildIconUrl={guildIconUrl} /> : (
                        <div className="bg-[#313338] rounded-xl p-4">
                            {/* UPDATE: Preview Logik für Text vs Embed */}
                            {response.type === "text" ? (
                                <div className="flex gap-4 group">
                                    <div className="shrink-0 cursor-pointer">
                                       <img src={guildIconUrl} alt="Bot Avatar" className="w-10 h-10 rounded-full hover:opacity-80 transition" />
                                    </div>
                                    <div className="flex flex-col text-left w-full">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-medium hover:underline cursor-pointer">Ticket Bot</span>
                                        <span className="bg-[#5865F2] text-[10px] text-white px-1 rounded flex items-center h-[15px]">BOT</span>
                                        <span className="text-gray-400 text-xs ml-1">Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <div className="text-gray-100 mt-1 whitespace-pre-wrap leading-relaxed">
                                        {response.text ? <DiscordMarkdown text={response.text} /> : <span className="text-gray-500 italic text-sm">Preview of your text message...</span>}
                                      </div>
                                    </div>
                                </div>
                            ) : (
                                <EmbedPreview 
                                embed={{
                                    ...response.embed,
                                    // HIER: Ersetzt die Variable mit dem Placeholder-Bild für die Vorschau
                                    thumbnail_url: response.embed.thumbnail_url === "{user_avatar}" 
                                        ? "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" 
                                        : response.embed.thumbnail_url
                                }} 
                                content={response.content} 
                                botName="Ticket Bot" 
                                botIconUrl={guildIconUrl} 
                            />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}