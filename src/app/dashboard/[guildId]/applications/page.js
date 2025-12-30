"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare, Settings2, RefreshCw, Save, History, LayoutTemplate,
  MousePointerClick, ChevronDown, ChevronUp, Hash, Users,
  FolderOpen, Check, Palette, BarChart3, Inbox, CheckCircle2,
  Minimize2, Maximize2, GripHorizontal, Eye, X, Code2,
  FileText, UserCheck, UserX, Clock
} from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

function cn(...xs) { return xs.filter(Boolean).join(" "); }
function truncate(s, max) { const str = String(s ?? ""); return str.length > max ? str.slice(0, max - 1) + "…" : str; }

// --- UI Components ---

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-md bg-[#16171a] transition-all duration-200">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-[#1e1f22] hover:bg-[#232428] transition-colors rounded-t-md">
        <div className="flex items-center gap-2.5 text-gray-200 font-medium text-sm">
          {Icon && <Icon className="w-4 h-4 text-[#5865F2]" />}<span>{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="p-5 space-y-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

function VariableDropdown({ modal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null); 
  const containerRef = useRef(null);
  const standardVars = [ { label: "User", value: "{user}" }, { label: "Server", value: "{server}" } ];

  useEffect(() => {
    function h(e) { if(containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const copy = async (v) => {
      try { await navigator.clipboard.writeText(v); setCopyFeedback(v); setTimeout(()=>setCopyFeedback(null),2000); setIsOpen(false); } catch {}
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button onClick={()=>setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider min-w-[140px] justify-between h-9 bg-[#111214] border-white/10 text-gray-300 hover:text-white">
        <div className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5" /><span>{copyFeedback?"Kopiert!":"Variablen"}</span></div>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-[200px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl p-1">
            {standardVars.map(v => <button key={v.value} onClick={()=>copy(v.value)} className="w-full text-left px-3 py-2 rounded hover:bg-[#5865F2] hover:text-white text-xs text-gray-300">{v.value}</button>)}
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, colorClass = "text-white" }) {
  return (
    <Card className="bg-[#111214] border-white/10 shadow-sm flex items-center p-4 gap-4 rounded-lg">
      <div className={cn("p-3 rounded-md bg-white/5", colorClass)}><Icon className="w-5 h-5" /></div>
      <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p><p className="text-2xl font-bold text-white tracking-tight">{value}</p></div>
    </Card>
  );
}

function DiscordButton({ label, emoji, style = "Primary" }) {
  const styles = { Primary: "bg-[#5865F2]", Secondary: "bg-[#4e5058]", Success: "bg-[#248046]", Danger: "bg-[#da373c]" };
  return (
    <div className={cn(styles[style]||styles.Primary, "h-[32px] px-[16px] rounded-[3px] text-white text-[14px] font-medium flex items-center justify-center gap-1.5 select-none")}>
      {emoji && <span>{emoji}</span>}<span>{label}</span>
    </div>
  );
}

function DiscordSelect({ label, value, onChange, options, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const containerRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) { if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div className="space-y-1.5 w-full" ref={containerRef}>
      <Label className="text-gray-400 text-[11px] uppercase font-bold tracking-wider pl-0.5">{label}</Label>
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className={cn("w-full bg-[#1e1f22] border border-black/20 text-gray-200 rounded-sm px-3 py-2 text-sm cursor-pointer flex items-center justify-between", isOpen ? "border-[#5865F2]" : "")}>
          <div className="flex items-center gap-2.5 truncate">
            {Icon && <Icon className="w-4 h-4 text-gray-500"/>}<span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
        {isOpen && (
          <div className="absolute z-[9999] w-full bg-[#2b2d31] border border-[#5865F2] shadow-xl max-h-60 overflow-y-auto">
            {options.map((opt) => (<div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className="px-3 py-2 text-sm text-gray-300 hover:bg-[#35373c] hover:text-white cursor-pointer flex gap-2">{opt.label}</div>))}
          </div>
        )}
      </div>
    </div>
  );
}

const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);
  const options = filtered.map((c) => ({ label: c.name, value: c.id }));
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} icon={Hash} />;
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  const options = filtered.map((r) => ({ label: r.name, value: r.id }));
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} icon={Users} />;
};

// --- DATA ---

function buildAppBotCode(modal) {
  return JSON.stringify(modal); 
}

function defaultAppModal() {
  return {
    title: "Bewerbung",
    components: [
      { custom_id: "ign", label: "Ingame Name", style: 1, required: true, kind: "text_input" },
      { custom_id: "motiv", label: "Motivation", style: 2, required: true, kind: "text_input" }
    ],
  };
}

function defaultPanelEmbed() {
  return {
    title: "Jetzt Bewerben",
    description: "Klicke auf den Button, um dich zu bewerben.",
    color: "#248046",
    footer: { text: "Bewerbungssystem" }
  };
}

function defaultAppResponse() {
    return {
        mode: "text",
        content: "Deine Bewerbung ist eingegangen!",
        embed: { title: "Erfolg", description: "Bewerbung gesendet.", color: "#57F287" }
    };
}

// --- MAIN PAGE ---

export default function ApplicationsPage() {
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("config"); 
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [applications, setApplications] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, declined: 0 });

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const [modal, setModal] = useState(defaultAppModal());
  const [panelEmbed, setPanelEmbed] = useState(defaultPanelEmbed());
  const [panelButtonText, setPanelButtonText] = useState("Bewerben");
  const [panelButtonStyle, setPanelButtonStyle] = useState("Success");
  const [responseSettings, setResponseSettings] = useState(defaultAppResponse());

  const [selectedApp, setSelectedApp] = useState(null);

  // Preview
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewY, setPreviewY] = useState(0); 
  const [isDragging, setIsDragging] = useState(false); 
  const dragStartRef = useRef(0);

  const handleDragStart = (e) => { setIsDragging(true); dragStartRef.current = e.clientY - previewY; document.body.style.userSelect = "none"; };
  const handleDragMove = useCallback((e) => { if (typeof window === 'undefined') return; let newY = e.clientY - dragStartRef.current; const h = window.innerHeight; const start = (h/2)+120; if(newY < 80-start) newY = 80-start; if(newY > h-50-start) newY = h-50-start; setPreviewY(newY); }, []);
  const handleDragEnd = useCallback(() => { setIsDragging(false); document.body.style.userSelect = ""; }, []);

  useEffect(() => {
    if (isDragging) { window.addEventListener("mousemove", handleDragMove); window.addEventListener("mouseup", handleDragEnd); }
    else { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); }
    return () => { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); };
  }, [isDragging, handleDragMove, handleDragEnd]);

  function flashFormMsg(msg) { setFormMsg(msg); setTimeout(() => setFormMsg(""), 2000); }

  useEffect(() => {
    if (!guildId || guildId === "undefined") return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [sRes, cRes, rRes, gRes, appRes, statRes] = await Promise.all([
          fetch(`/api/settings/${guildId}`),
          fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`),
          fetch(`/api/user/guilds`),
          fetch(`/api/guilds/${guildId}/applications`).catch(() => ({ ok: false })),
          fetch(`/api/guilds/${guildId}/applications/stats`).catch(() => ({ ok: false })),
        ]);

        if (!sRes.ok) throw new Error("Fehler beim Laden");
        const settingsData = await sRes.json();
        setSettings(settingsData);

        if(settingsData.appPanelEmbed) setPanelEmbed(settingsData.appPanelEmbed);
        if(settingsData.appPanelButtonText) setPanelButtonText(settingsData.appPanelButtonText);
        if(settingsData.appPanelButtonStyle) setPanelButtonStyle(settingsData.appPanelButtonStyle);
        if(settingsData.applicationForm?.builderData?.modal) setModal(settingsData.applicationForm.builderData.modal);
        if(settingsData.appResponse) setResponseSettings(settingsData.appResponse);

        if (cRes.ok) setChannels(await cRes.json());
        if (rRes.ok) setRoles(await rRes.json());
        if (gRes.ok) { const all = await gRes.json(); setCurrentGuild(all.find(x => x.id === guildId)); }
        if (appRes.ok) setApplications(await appRes.json());
        if (statRes.ok) setStats(await statRes.json());

      } catch (e) { setLoadError(e?.message); } finally { setLoading(false); }
    };
    loadData();
  }, [guildId]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
          ...settings,
          appPanelEmbed: panelEmbed,
          appPanelButtonText: panelButtonText,
          appPanelButtonStyle: panelButtonStyle,
          applicationForm: {
              mode: "custom",
              version: 1,
              botCode: buildAppBotCode(modal),
              builderData: { modal }
          },
          appResponse: responseSettings
      };
      const r = await fetch(`/api/settings/${guildId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (r.ok) { flashFormMsg("Gespeichert ✅"); setSettings(payload); }
      else throw new Error();
    } catch { flashFormMsg("Fehler ❌"); } finally { setSaving(false); }
  }

  async function handleReset() {
    if (!window.confirm("Zurücksetzen?")) return;
    if (editorTab === "panel") { setPanelEmbed(defaultPanelEmbed()); setPanelButtonText("Bewerben"); }
    else if (editorTab === "modal") { setModal(defaultAppModal()); }
    else if (editorTab === "response") { setResponseSettings(defaultAppResponse()); }
    flashFormMsg("Zurückgesetzt");
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 animate-pulse">Lade...</div>;
  if (loadError) return <div className="p-8 text-red-400">Fehler: {loadError}</div>;

  const guildIconUrl = currentGuild?.icon ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png` : "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="p-2 sm:p-6 xl:p-10 mx-auto w-full max-w-[1920px] space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3"><FileText className="w-8 h-8 text-[#5865F2]" /> Bewerbungssystem</h1>
          <p className="text-gray-400 text-sm mt-1">Verwalte Bewerbungen, erstelle das Formular und lege Regeln fest.</p>
        </div>
        <div className="bg-[#111214] p-1 rounded-lg border border-white/10 shadow-sm flex gap-1 w-full md:w-auto">
          <button onClick={() => setActiveTab("overview")} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2", activeTab === "overview" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5")}><BarChart3 className="w-4 h-4" /> Übersicht</button>
          <button onClick={() => setActiveTab("settings")} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2", activeTab === "settings" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5")}><Settings2 className="w-4 h-4" /> Konfiguration</button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <StatsCard title="Gesamt" value={stats.total} icon={Inbox} colorClass="text-blue-400" />
             <StatsCard title="Ausstehend" value={stats.pending} icon={Clock} colorClass="text-yellow-400" />
             <StatsCard title="Angenommen" value={stats.accepted} icon={UserCheck} colorClass="text-green-400" />
             <StatsCard title="Abgelehnt" value={stats.declined} icon={UserX} colorClass="text-red-400" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-[600px] xl:h-[calc(100vh-320px)]">
            <Card className="bg-[#111214] border-white/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-[#16171a] border-b border-white/10 py-3.5 px-4"><CardTitle className="text-white text-sm font-bold">Bewerbungen</CardTitle></CardHeader>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {applications.length === 0 && <div className="text-center text-gray-500 py-10">Keine Daten</div>}
                {applications.map(t => (
                  <button key={t._id} onClick={() => setSelectedApp(t)} className={cn("w-full text-left p-3 rounded-md border transition-all group", selectedApp?._id === t._id ? "border-[#5865F2] bg-[#5865F2]/10" : "border-transparent hover:bg-white/5")}>
                    <div className="text-white font-medium truncate text-sm group-hover:text-[#5865F2]">{t.ign || "Unbekannt"}</div>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between"><span>{truncate(t.userId, 12)}</span><span className="text-gray-600 font-mono text-[10px]">{new Date(t.createdAt).toLocaleDateString()}</span></div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="bg-[#111214] border-white/10 flex flex-col shadow-sm overflow-hidden">
              {!selectedApp ? (
                <div className="m-auto text-gray-500 flex flex-col items-center gap-3"><FileText className="w-12 h-12 opacity-20" /><p>Wähle eine Bewerbung aus.</p></div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="bg-[#16171a] border-b border-white/10 p-4 flex justify-between items-center">
                    <div className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> {selectedApp.ign}</div>
                    <div className="text-[10px] font-mono text-gray-600 bg-black/30 px-2 py-1 rounded">Status: {selectedApp.status}</div>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#1e1f22] p-3 rounded border border-white/5"><h3 className="text-xs text-gray-500 font-bold uppercase mb-1">User ID</h3><p className="text-white font-mono text-sm">{selectedApp.userId}</p></div>
                          <div className="bg-[#1e1f22] p-3 rounded border border-white/5"><h3 className="text-xs text-gray-500 font-bold uppercase mb-1">Datum</h3><p className="text-white font-mono text-sm">{new Date(selectedApp.createdAt).toLocaleString()}</p></div>
                      </div>
                      <div className="space-y-4">
                          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Formular Daten</h3>
                          {selectedApp.rawFormData && selectedApp.rawFormData.map((f, i) => (
                              <div key={i} className="bg-[#1e1f22] p-4 rounded border border-white/5">
                                  <h4 className="text-xs text-[#5865F2] font-bold uppercase mb-2">{f.name}</h4>
                                  <div className="text-gray-300 text-sm whitespace-pre-wrap">{f.value}</div>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col xl:flex-row w-full items-start gap-8 relative">
            <div className="w-full xl:flex-1 min-w-0 transition-all duration-500 ease-in-out">
                <Card className={cn("bg-[#111214] border-white/10 shadow-sm rounded-lg flex flex-col z-10 relative", editorTab === "config" ? "w-full xl:w-[85%]" : "w-full")}>
                  <div className="bg-[#16171a] border-b border-white/10 px-6 pt-4 pb-0 flex flex-col gap-4 rounded-t-lg">
                    <div className="flex justify-between items-center">
                      <h2 className="text-white text-lg font-bold">Konfiguration & Design</h2>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleReset} className="text-gray-400 hover:text-white"><History className="w-3.5 h-3.5 mr-1.5" /> Reset</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#5865F2] hover:bg-[#4752C4] text-white"><Save className="w-3.5 h-3.5 mr-1.5" /> Speichern</Button>
                      </div>
                    </div>
                    <div className="flex gap-6 overflow-x-auto mt-2 no-scrollbar pb-1">
                      {[{id:"config",label:"Einstellungen",icon:Settings2}, {id:"panel",label:"Panel Design",icon:LayoutTemplate}, {id:"modal",label:"Formular",icon:MousePointerClick}, {id:"response",label:"Antwort",icon:MessageSquare}].map(tab => (
                        <button key={tab.id} onClick={()=>setEditorTab(tab.id)} className={cn("pb-3 text-sm font-medium border-b-[2px] flex items-center gap-2", editorTab===tab.id ? "border-[#5865F2] text-white" : "border-transparent text-gray-500 hover:text-white")}>
                          <tab.icon className="w-4 h-4"/> {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <CardContent className="p-0 bg-[#111214] rounded-b-lg">
                    {formMsg && <div className="mx-6 mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {formMsg}</div>}
                    <div className="p-6 min-h-[500px]">
                      
                      {editorTab === "config" && (
                        <div className="space-y-6">
                          <CollapsibleSection title="Kanäle & Rollen" icon={Settings2}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <ChannelSelect label="Bewerbungs-Panel Kanal" value={settings.appPanelChannelId} onChange={(v)=>setSettings({...settings, appPanelChannelId:v})} channels={channels} typeFilter={0} />
                                <ChannelSelect label="Review Kanal (Team)" value={settings.appReviewChannelId} onChange={(v)=>setSettings({...settings, appReviewChannelId:v})} channels={channels} typeFilter={0} />
                                <RoleSelect label="Staff Rolle" value={settings.appStaffRoleId} onChange={(v)=>setSettings({...settings, appStaffRoleId:v})} roles={roles} />
                                <RoleSelect label="Bewerber Rolle" value={settings.applicantRoleId} onChange={(v)=>setSettings({...settings, applicantRoleId:v})} roles={roles} />
                            </div>
                          </CollapsibleSection>
                          <CollapsibleSection title="Limits" icon={Clock}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2"><Label className="text-[11px] text-gray-400 uppercase font-bold">Cooldown (Tage)</Label><Input type="number" min={0} value={settings.appDeclineCooldownDays||7} onChange={(e)=>setSettings({...settings, appDeclineCooldownDays: parseInt(e.target.value)})} className="bg-[#1e1f22] border-white/10 text-white"/></div>
                             </div>
                          </CollapsibleSection>
                        </div>
                      )}

                      {editorTab === "panel" && (
                        <div className="space-y-6">
                          <CollapsibleSection title="Button" icon={Palette}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2"><Label className="text-[11px] text-gray-400 uppercase font-bold">Button Text</Label><Input value={panelButtonText} onChange={(e)=>setPanelButtonText(e.target.value)} className="bg-[#111214] border-white/10 text-white"/></div>
                                <div className="space-y-2"><DiscordSelect label="Farbe" value={panelButtonStyle} onChange={setPanelButtonStyle} options={[{label:"Primary",value:"Primary"},{label:"Secondary",value:"Secondary"},{label:"Success",value:"Success"},{label:"Danger",value:"Danger"}]} icon={Palette}/></div>
                              </div>
                          </CollapsibleSection>
                          <EmbedBuilder data={panelEmbed} onChange={setPanelEmbed} hiddenSections={["author","fields"]} />
                        </div>
                      )}

                      {editorTab === "modal" && <ModalBuilder data={modal} onChange={setModal} />}

                      {editorTab === "response" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div className="flex gap-2">
                                    <button onClick={()=>setResponseSettings(r=>({...r, mode:'text'}))} className={cn("px-4 py-1.5 rounded text-xs font-bold border", responseSettings.mode==='text'?"bg-[#5865F2] border-[#5865F2] text-white":"border-white/10 text-gray-400")}>Text</button>
                                    <button onClick={()=>setResponseSettings(r=>({...r, mode:'embed'}))} className={cn("px-4 py-1.5 rounded text-xs font-bold border", responseSettings.mode==='embed'?"bg-[#5865F2] border-[#5865F2] text-white":"border-white/10 text-gray-400")}>Embed</button>
                                </div>
                                <VariableDropdown modal={modal} />
                            </div>
                            {responseSettings.mode === 'text' ? (
                                <textarea value={responseSettings.content||""} onChange={(e)=>setResponseSettings({...responseSettings, content:e.target.value})} className="w-full h-40 bg-[#111214] border border-white/10 rounded p-4 text-white" placeholder="Deine Nachricht..."/>
                            ) : (
                                <div className="space-y-4">
                                    <Input value={responseSettings.content||""} onChange={(e)=>setResponseSettings({...responseSettings, content:e.target.value})} placeholder="Text über Embed (Optional)" className="bg-[#111214] border-white/10 text-white"/>
                                    <EmbedBuilder data={responseSettings.embed} onChange={(e)=>setResponseSettings({...responseSettings, embed:e})} />
                                </div>
                            )}
                        </div>
                      )}

                    </div>
                  </CardContent>
                </Card>
            </div>

            <div className={cn("shrink-0 transition-all duration-500 hidden xl:block", (editorTab==="config"||isPreviewMinimized) ? "w-0" : "w-[600px]")} />

            <div style={{ top: isPreviewMinimized ? '-9999px' : `calc(50% + ${120 + previewY}px)` }} className={cn("hidden xl:block fixed -translate-y-1/2 right-10 w-[600px] z-50 origin-top-right scale-[0.85]", isDragging ? "transition-none" : "transition-all duration-300", (editorTab==="config"&&!isPreviewMinimized) ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100")}>
              <div className="bg-[#111214] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
                <div onMouseDown={handleDragStart} className="bg-[#1e1f22] border-b border-white/5 p-3 flex justify-between cursor-grab active:cursor-grabbing select-none">
                  <div className="flex gap-2 text-xs font-bold text-gray-400 uppercase"><GripHorizontal className="w-4 h-4"/> Preview</div>
                  <div className="flex gap-2"><button onClick={()=>setIsPreviewMinimized(true)} className="text-gray-500 hover:text-white"><Minimize2 className="w-4 h-4"/></button></div>
                </div>
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                    {editorTab === "panel" && <div className="bg-[#313338] p-4 rounded"><EmbedPreview embed={{...panelEmbed}} botName="Bewerbung" botIconUrl={guildIconUrl}><div className="mt-2"><DiscordButton label={panelButtonText} style={panelButtonStyle} emoji="📝"/></div></EmbedPreview></div>}
                    {editorTab === "response" && (
                        <div className="bg-[#313338] p-4 rounded">
                            {responseSettings.mode==='text' ? (
                                <div className="flex gap-3"><img src={guildIconUrl} className="w-8 h-8 rounded-full bg-gray-800"/><div className="text-white text-sm"><span className="font-bold mr-2">Bot</span><span className="bg-[#5865F2] text-[10px] px-1 rounded">BOT</span><div className="mt-1 text-gray-300"><DiscordMarkdown text={responseSettings.content||"..."}/></div></div></div>
                            ) : <EmbedPreview embed={responseSettings.embed} content={responseSettings.content} botName="Bot" botIconUrl={guildIconUrl} />}
                        </div>
                    )}
                </div>
              </div>
            </div>

            {isPreviewMinimized && <button onClick={()=>setIsPreviewMinimized(false)} className="hidden xl:flex fixed right-6 bottom-6 z-50 bg-[#5865F2] text-white w-14 h-14 rounded-full shadow-2xl items-center justify-center hover:scale-110"><Maximize2 className="w-6 h-6"/></button>}
            
            {editorTab!=="config" && <button onClick={()=>setShowMobilePreview(true)} className="xl:hidden fixed right-4 bottom-4 z-40 bg-[#5865F2] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center"><Eye className="w-6 h-6"/></button>}
            {showMobilePreview && (
                <div className="xl:hidden fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="bg-[#111214] w-full max-w-md max-h-[80vh] rounded-lg flex flex-col overflow-hidden">
                        <div className="flex justify-between p-4 border-b border-white/10 bg-[#1e1f22]"><h3 className="text-white font-bold">Vorschau</h3><button onClick={()=>setShowMobilePreview(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
                        <div className="p-4 overflow-y-auto bg-[#313338]">
                             {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                             {editorTab === "panel" && <EmbedPreview embed={panelEmbed} botName="App"><div className="mt-2"><DiscordButton label={panelButtonText} style={panelButtonStyle}/></div></EmbedPreview>}
                             {editorTab === "response" && (responseSettings.mode==='text'?<div className="text-white">{responseSettings.content}</div>:<EmbedPreview embed={responseSettings.embed} content={responseSettings.content}/>)}
                        </div>
                     </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}