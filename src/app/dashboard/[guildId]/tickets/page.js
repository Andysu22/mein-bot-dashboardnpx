"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { 
  MessageSquare, Settings2, RefreshCw, Save, Send, PenTool, History, 
  LayoutTemplate, Type, MousePointerClick, Code2, ChevronDown, 
  Hash, Users, FolderOpen, Check, Palette
} from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

function cn(...xs) { return xs.filter(Boolean).join(" "); }
function safeStr(v) { return String(v ?? ""); }
function truncate(s, max) { return String(s ?? "").length > max ? String(s ?? "").slice(0, max - 1) + "…" : String(s ?? ""); }

function DiscordButton({ label, emoji, style = "Primary" }) {
    const styles = {
        Primary: "bg-[#5865F2] hover:bg-[#4752c4] active:bg-[#3c45a5]",
        Secondary: "bg-[#4e5058] hover:bg-[#6d6f78] active:bg-[#474950]",
        Success: "bg-[#248046] hover:bg-[#1a6334] active:bg-[#15562b]",
        Danger: "bg-[#da373c] hover:bg-[#a1282c] active:bg-[#8f2023]"
    };
    const key = style.charAt(0).toUpperCase() + style.slice(1).toLowerCase();
    const bg = styles[key] || styles.Primary;
    return (
        <div className={cn(bg, "h-[32px] px-[16px] min-w-[60px] rounded-[3px] text-white text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none shadow-sm")}>
            {emoji && <span className="text-[1.1rem] leading-none">{emoji}</span>}
            <span className="leading-none mt-[1px]">{label}</span>
        </div>
    );
}

function DiscordSelect({ label, value, onChange, options, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  const containerRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) { setIsOpen(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider pl-1">{label}</Label>
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className={cn("w-full bg-[#1e1f22] border border-black/20 text-gray-200 rounded-md px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-all hover:bg-[#232428] hover:border-black/40", isOpen ? "border-[#5865F2] ring-1 ring-[#5865F2] rounded-b-none border-b-0" : "")}>
          <div className="flex items-center gap-2.5 truncate">
            {Icon && <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isOpen || selectedOption ? "text-gray-300" : "text-gray-500")} />}
            <span className={cn("truncate font-medium", !selectedOption && "text-gray-500")}>{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform duration-200", isOpen && "rotate-180 text-white")} />
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full bg-[#2b2d31] border border-[#5865F2] border-t-0 rounded-b-md shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="p-1 space-y-0.5">
              {options.length === 0 ? <div className="px-3 py-2 text-sm text-gray-500 text-center italic">Keine Optionen verfügbar</div> : options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={cn("px-3 py-2 text-sm rounded cursor-pointer flex items-center gap-2 transition-colors group", isSelected ? "bg-[#404249] text-white" : "text-gray-300 hover:bg-[#35373c] hover:text-white")}>
                      {Icon && <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-gray-500 group-hover:text-gray-300")} />}
                      <span className={cn("truncate flex-1", isSelected && "font-medium")}>{opt.label}</span>
                      {isSelected && <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5865F2] shrink-0"><Check className="w-3 h-3 text-white stroke-[3]" /></div>}
                    </div>
                  );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);
  const options = filtered.map(c => ({ label: c.name, value: c.id }));
  const Icon = typeFilter === 4 ? FolderOpen : Hash;
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder || "Kanal wählen..."} icon={Icon} />;
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  const options = filtered.map(r => ({ label: r.name, value: r.id }));
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder || "Rolle wählen..."} icon={Users} />;
};

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

function defaultTicketModal() {
  return {
    title: "Create Ticket", custom_id: "ticket_form", show_warning: false,
    components: [
        { id: "c1", kind: "string_select", label: "Category", description: "Choose a category", custom_id: "ticket_cat", required: true, placeholder: "Select category…", options: [{ label: "Support", value: "support", description: "", id: "o1" }, { label: "Apply", value: "apply", description: "", id: "o2" }] }, 
        { id: "c2", kind: "text_input", label: "Description", description: "Describe your issue", custom_id: "ticket_desc", required: true, placeholder: "Explain your issue…", style: 2, maxLength: 1000 }
    ],
  };
}

function defaultTicketResponse() {
  return {
    type: "embed", text: "", content: "",
    embed: { 
        title: "Ticket Created", 
        description: "Hello {user}!\n\nThanks for your ticket.\n\n**Your message:**\n{field:ticket_desc}", 
        color: "#5865F2", 
        fields: [], 
        footer: { text: "", icon_url: "" }, 
        thumbnail_url: "{user_avatar}", 
        timestamp: false 
    },
  };
}

function defaultPanelEmbed() {
    return {
        title: "Support Ticket",
        description: "Click below.",
        color: "#5865F2",
        fields: [],
        footer: { text: "Ticket System" },
        timestamp: false
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

  function flashFormMsg(msg) { setFormMsg(msg); setTimeout(() => setFormMsg(""), 2000); }

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
        
        const settingsData = await sRes.json();
        // WICHTIG: Fallback, damit die Seite nicht crasht, wenn Daten leer sind
        if(!settingsData.panelEmbed) settingsData.panelEmbed = defaultPanelEmbed();
        setSettings(settingsData);

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
  
  async function saveSettings(e) { 
    e?.preventDefault(); 
    setSavingSettings(true); 
    try { 
        // Debugging: Sehen was gesendet wird
        console.log("Sending Settings:", settings);

        const r = await fetch(`/api/settings/${guildId}`, { 
            method: "POST", 
            headers: {"Content-Type": "application/json"}, 
            body: JSON.stringify(settings) 
        }); 
        
        if(r.ok) { 
            const newData = await r.json();
            console.log("Received Saved Data:", newData);
            
            // Wichtig: Wenn DB panelEmbed leer zurückgibt, behalte das lokale (Fallback)
            if(!newData.panelEmbed || Object.keys(newData.panelEmbed).length === 0) {
                newData.panelEmbed = settings.panelEmbed;
            }
            
            setSettings(newData); 
            flashFormMsg("Settings Saved ✅"); 
        } else {
            console.error("API Error:", r.status, r.statusText);
            flashFormMsg(`Fehler: ${r.status} ❌`);
        }
    } catch(e) {
        console.error("Save failed:", e);
        flashFormMsg("Netzwerk Fehler ❌");
    } finally { 
        setSavingSettings(false); 
    } 
}
  
  async function saveTicketForm() { setFormSaving(true); try { const pl = { mode: "custom", version: 1, botCode: buildTicketBotCode(modal), builderData: { modal, response } }; const r = await fetch(`/api/guilds/${guildId}/tickets/form`, { method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(pl) }); if(r.ok) flashFormMsg("Form Saved ✅"); } finally { setFormSaving(false); } }
  
  async function resetTicketFormToBotDefault() { 
      if (!window.confirm("Formular und Panel auf Standard zurücksetzen?")) return;
      try { 
          const r = await fetch(`/api/guilds/${guildId}/tickets/form/reset`, { method: "POST" }); 
          if(r.ok) { 
              setModal(defaultTicketModal()); 
              setResponse(defaultTicketResponse()); 
              setSettings(s => ({ 
                  ...s, 
                  panelEmbed: defaultPanelEmbed(), 
                  panelButtonText: "", 
                  panelButtonStyle: "Primary" 
              }));
              flashFormMsg("Reset ✅"); 
          } 
      } catch {} 
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

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 animate-pulse">Lade Ticketsystem...</div>;
  if (loadError) return <div className="p-8 text-red-400 bg-red-900/10 border border-red-500/20 rounded-xl m-4">❌ Fehler: {loadError}</div>;
  if (!settings) return <div className="p-8 text-gray-400">Keine Einstellungen gefunden.</div>;

  const guildIconUrl = currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="p-6 xl:p-10 mx-auto w-full max-w-[1800px] space-y-8">
      <style jsx global>{` .discord-md strong { font-weight: 700; color: #fff; } .discord-md .inlinecode { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; } `}</style>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">TICKET SYSTEM</h1>
            <p className="text-gray-400 text-sm mt-1">Verwalte Support-Tickets und konfiguriere das Design.</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-sm">
          <button onClick={() => setActiveTab("overview")} className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === "overview" ? "bg-[#5865F2] text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5")}>
            <MessageSquare className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => setActiveTab("settings")} className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === "settings" ? "bg-[#5865F2] text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5")}>
            <Settings2 className="w-4 h-4" /> Config & Editor
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-200px)] min-h-[600px]">
           {/* Ticket List */}
           <Card className="bg-[#111214] border-white/5 flex flex-col overflow-hidden shadow-xl">
              <CardHeader className="bg-[#1a1b1e] border-b border-white/5 py-4">
                  <CardTitle className="text-white text-base flex justify-between items-center">
                      <span>Offene Tickets</span>
                      <span className="bg-[#5865F2] text-xs px-2 py-0.5 rounded-full">{openTickets.length}</span>
                  </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {openTickets.length === 0 && <div className="text-center text-gray-500 py-10 text-sm">Keine offenen Tickets.</div>}
                  {openTickets.map(t => (
                      <button key={t._id} onClick={() => onSelectTicket(t)} className={cn("w-full text-left p-3 rounded-xl border transition-all group", selectedTicketId === t._id ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/5")}>
                          <div className="text-white font-bold truncate text-sm group-hover:text-[#5865F2] transition-colors">{t.issue || "No Subject"}</div>
                          <div className="text-xs text-gray-400 mt-1 flex justify-between">
                              <span>{t.userTag}</span>
                              <span className="text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                      </button>
                  ))}
              </div>
           </Card>

           {/* Chat View */}
           <Card className="bg-[#111214] border-white/5 flex flex-col shadow-xl">
              {!selectedTicket ? (
                  <div className="m-auto text-gray-500 flex flex-col items-center gap-3">
                      <MessageSquare className="w-12 h-12 opacity-20" />
                      <p>Wähle ein Ticket aus, um den Chat zu sehen.</p>
                  </div>
              ) : (
                  <>
                    <div className="bg-[#1a1b1e] border-b border-white/5 p-4 flex justify-between items-center">
                        <div className="font-bold text-white flex items-center gap-2">
                            <span className="text-[#5865F2]">#</span> {selectedTicket.issue}
                        </div>
                        <div className="text-xs text-gray-500">ID: {selectedTicket.channelId}</div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                        <div ref={chatScrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                            {messages.map((m, i) => (
                                <div key={i} className="group flex gap-3 hover:bg-white/[0.02] p-2 rounded-lg -mx-2 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                        {m.authorTag?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-gray-200 text-sm">{m.authorTag}</span>
                                            <span className="text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                            <DiscordMarkdown text={m.content}/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-[#1a1b1e] border-t border-white/5">
                        <div className="flex gap-2">
                            <Input 
                                value={replyText} 
                                onChange={e => setReplyText(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                                placeholder={`Antworte an ${selectedTicket.userTag}...`} 
                                className="bg-black/40 border-white/10 text-white focus-visible:ring-[#5865F2]" 
                            />
                            <Button onClick={sendReply} className="bg-[#5865F2] hover:bg-[#4752C4]">
                                <Send className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                  </>
              )}
           </Card>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-8 items-start">
            <div className="space-y-8">
                {/* General Config */}
                <Card className="bg-[#111214] border-white/5 shadow-lg">
                    <CardHeader className="pb-4 border-b border-white/5">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-[#5865F2]" /> System Configuration
                        </CardTitle>
                        <CardDescription className="text-gray-400">Lege fest, wo Tickets erstellt und archiviert werden.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <form onSubmit={saveSettings} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ChannelSelect label="Ticket Kategorie (Open)" value={settings.ticketCategoryId} onChange={v => setSettings({...settings, ticketCategoryId: v})} channels={channels} typeFilter={4} placeholder="Kategorie wählen..." />
                                <ChannelSelect label="Log Channel (Transcripts)" value={settings.logChannelId} onChange={v => setSettings({...settings, logChannelId: v})} channels={channels} typeFilter={0} placeholder="#logs wählen..." />
                                <ChannelSelect label="Panel Channel (Wo User klicken)" value={settings.panelChannelId} onChange={v => setSettings({...settings, panelChannelId: v})} channels={channels} typeFilter={0} placeholder="#tickets wählen..." />
                                <RoleSelect label="Support Team Rolle" value={settings.supportRoleId} onChange={v => setSettings({...settings, supportRoleId: v})} roles={roles} placeholder="@Support wählen..." />
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button type="submit" disabled={savingSettings} className="bg-[#2b2d31] text-white hover:bg-[#5865F2] hover:text-white transition-all border border-white/10">
                                    {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} Einstellungen Speichern
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Form & Panel Editor */}
                <Card className="bg-[#111214] border-white/5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5865F2] to-purple-500 opacity-80" />
                    <CardHeader className="pb-4 border-b border-white/5 flex flex-row items-center justify-between bg-[#151619]">
                        <div>
                            <CardTitle className="text-white text-lg flex items-center gap-2"><PenTool className="w-5 h-5 text-purple-400"/> Ticket Editor</CardTitle>
                            <CardDescription className="text-gray-400">Setup des Panels, Modals und der Antwort.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={resetTicketFormToBotDefault} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><History className="w-4 h-4 mr-1"/> Reset</Button>
                            <Button size="sm" onClick={saveTicketForm} disabled={formSaving} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                                {formSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} Save
                            </Button>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        {formMsg && <div className="m-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">✓ {formMsg}</div>}
                        
                        <div className="bg-[#1a1b1e] border-b border-white/5 px-6 pt-4">
                            <div className="flex gap-6 overflow-x-auto">
                                <button onClick={() => setEditorTab("modal")} className={cn("pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap", editorTab === "modal" ? "border-[#5865F2] text-white" : "border-transparent text-gray-400 hover:text-gray-200")}>
                                    <MousePointerClick className="w-4 h-4" /> Modal Setup
                                </button>
                                <button onClick={() => setEditorTab("response")} className={cn("pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap", editorTab === "response" ? "border-[#5865F2] text-white" : "border-transparent text-gray-400 hover:text-gray-200")}>
                                    <MessageSquare className="w-4 h-4" /> Bot Antwort
                                </button>
                                <button onClick={() => setEditorTab("panel")} className={cn("pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap", editorTab === "panel" ? "border-[#5865F2] text-white" : "border-transparent text-gray-400 hover:text-gray-200")}>
                                    <LayoutTemplate className="w-4 h-4" /> Panel Nachricht
                                </button>
                            </div>
                        </div>

                        <div className="p-6 min-h-[400px]">
                            {editorTab === "modal" && <ModalBuilder data={modal} onChange={setModal} />}
                            
                            {editorTab === "response" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div onClick={() => setResponse(r => ({...r, type: "text"}))} className={cn("cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:bg-white/5", response.type === "text" ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/10 bg-[#1e1f22]")}>
                                            <div className={cn("p-2 rounded-full", response.type === "text" ? "bg-[#5865F2] text-white" : "bg-black/40 text-gray-400")}><Type className="w-5 h-5" /></div>
                                            <span className={cn("text-xs font-bold uppercase tracking-wider", response.type === "text" ? "text-white" : "text-gray-400")}>Nur Text</span>
                                        </div>
                                        <div onClick={() => setResponse(r => ({...r, type: "embed"}))} className={cn("cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:bg-white/5", response.type === "embed" ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/10 bg-[#1e1f22]")}>
                                            <div className={cn("p-2 rounded-full", response.type === "embed" ? "bg-[#5865F2] text-white" : "bg-black/40 text-gray-400")}><LayoutTemplate className="w-5 h-5" /></div>
                                            <span className={cn("text-xs font-bold uppercase tracking-wider", response.type === "embed" ? "text-white" : "text-gray-400")}>Embed</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-[#1e1f22] p-1.5 rounded-lg border border-white/5 overflow-x-auto">
                                        <Code2 className="w-4 h-4 text-gray-500 ml-2" /><div className="h-4 w-[1px] bg-white/10 mx-1"></div>
                                        {["{user}", "{username}", "{server}", "{channel}"].map(v => (<button key={v} onClick={() => insertVarIntoResponseField(response.type === "text" ? "text" : "embed.description", v)} className="px-2 py-1 bg-black/40 rounded text-[10px] font-mono text-gray-300 hover:text-white hover:bg-[#5865F2] transition-colors whitespace-nowrap">{v}</button>))}
                                        <div className="flex-1"></div>
                                        <div className="flex items-center gap-1"><Input value={varCustomId} onChange={e => setVarCustomId(e.target.value)} placeholder="Field ID" className="h-6 w-20 text-[10px] bg-black/20 border-white/10 px-1" /><Button size="sm" variant="ghost" onClick={() => { if(varCustomId) insertVarIntoResponseField(response.type === "text" ? "text" : "embed.description", `{field:${varCustomId}}`) }} className="h-6 px-2 text-[10px]">Add</Button></div>
                                    </div>
                                    {response.type === "text" && <div className="space-y-2"><textarea value={response.text || ""} onChange={e => setResponse(r => ({...r, text: e.target.value}))} className="w-full h-40 bg-[#1e1f22] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#5865F2] transition-colors resize-none leading-relaxed text-sm font-mono" placeholder="Deine Nachricht hier..." /></div>}
                                    {response.type === "embed" && <div className="space-y-4"><div><Label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block ml-1">Zusätzliche Nachricht</Label><Input value={response.content || ""} onChange={e => setResponse(r => ({...r, content: e.target.value}))} placeholder="Optionaler Text über dem Embed..." className="bg-[#1e1f22] border-white/10 text-white focus-visible:ring-[#5865F2]" /></div><div className="pt-2 border-t border-white/5"><EmbedBuilder data={response.embed} onChange={e => setResponse({...response, embed: e})} /></div></div>}
                                </div>
                            )}

                            {editorTab === "panel" && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="bg-[#1e1f22] p-4 rounded-xl border border-white/5 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 block ml-1">Button Text</Label>
                                                <Input value={settings.panelButtonText || ""} onChange={e => setSettings({...settings, panelButtonText: e.target.value})} placeholder="Standard (2 Buttons für Sprache)" className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2]" />
                                                <p className="text-[10px] text-gray-500 mt-1 ml-1">Lasse leer für Standard (Sprachauswahl).</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <DiscordSelect 
                                                    label="Button Style" 
                                                    value={settings.panelButtonStyle || "Primary"} 
                                                    onChange={v => setSettings({...settings, panelButtonStyle: v})}
                                                    options={[
                                                        { label: "Primary (Blurple)", value: "Primary" },
                                                        { label: "Secondary (Grey)", value: "Secondary" },
                                                        { label: "Success (Green)", value: "Success" },
                                                        { label: "Danger (Red)", value: "Danger" }
                                                    ]}
                                                    placeholder="Style wählen..."
                                                    icon={Palette}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/5">
                                        <EmbedBuilder data={settings.panelEmbed} onChange={e => setSettings({...settings, panelEmbed: e})} />
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <Button onClick={saveSettings} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                                            {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                                            Panel & Settings Speichern
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* LIVE PREVIEW - STICKY RIGHT */}
            <div className="hidden xl:block sticky top-8">
                <div className="bg-[#0f1012] border border-white/10 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5">
                    <div className="text-gray-400 font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/> Live Preview
                    </div>
                    
                    {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                    
                    {editorTab === "response" && (
                        <div className="bg-[#313338] rounded-xl p-4 transition-all duration-300">
                            {response.type === "text" ? (
                                <div className="flex gap-4 group items-start">
                                    <div className="shrink-0 cursor-pointer mt-0.5">
                                       <img src={guildIconUrl} alt="Bot Avatar" className="w-10 h-10 rounded-full hover:opacity-80 transition shadow-sm bg-[#1e1f22]" />
                                    </div>
                                    <div className="flex flex-col text-left w-full min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-white font-medium hover:underline cursor-pointer">Ticket Bot</span>
                                        <span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px] flex items-center h-[15px] leading-none mt-[1px]">BOT</span>
                                        <span className="text-gray-400 text-xs ml-1">Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      <div className="text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                                        {response.text ? <DiscordMarkdown text={response.text} /> : <span className="text-gray-500 italic text-sm">Schreibe etwas...</span>}
                                      </div>
                                    </div>
                                </div>
                            ) : (
                                <EmbedPreview 
                                  embed={{ ...response.embed, thumbnail_url: response.embed.thumbnail_url === "{user_avatar}" ? "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" : response.embed.thumbnail_url }} 
                                  content={response.content} 
                                  botName="Ticket Bot" 
                                  botIconUrl={guildIconUrl} 
                                />
                            )}
                        </div>
                    )}

                    {editorTab === "panel" && (
                        <div className="bg-[#313338] rounded-xl p-4 transition-all duration-300">
                             <EmbedPreview 
                                embed={settings?.panelEmbed} 
                                content="" 
                                botName="Ticket System" 
                                botIconUrl={guildIconUrl} 
                             >
                                 <div className="flex gap-2 flex-wrap mt-2">
                                    {settings?.panelButtonText ? (
                                        <DiscordButton label={settings.panelButtonText} emoji="📩" style={settings.panelButtonStyle} />
                                    ) : (
                                        <>
                                            <DiscordButton label="Deutsch" emoji="🇩🇪" style={settings.panelButtonStyle} />
                                            <DiscordButton label="English" emoji="🇺🇸" style={settings.panelButtonStyle} />
                                        </>
                                    )}
                                 </div>
                             </EmbedPreview>
                        </div>
                    )}

                    <div className="mt-4 text-center text-[10px] text-gray-600 font-mono">
                        PREVIEW MODE • {activeTab === "overview" ? "CHAT" : (editorTab === "panel" ? "PANEL CONFIG" : "EDITOR")}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}