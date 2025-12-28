"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Settings2,
  RefreshCw,
  Save,
  Send,
  History,
  LayoutTemplate,
  Type,
  MousePointerClick,
  Code2,
  ChevronDown,
  ChevronUp,
  Hash,
  Users,
  FolderOpen,
  Check,
  Palette,
  BarChart3,
  CalendarDays,
  Inbox,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Copy,
  ClipboardCheck
} from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}
function safeStr(v) {
  return String(v ?? "");
}
function truncate(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// --- UI HELPERS ---

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAnimationDone, setIsAnimationDone] = useState(defaultOpen);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimationDone(true), 300); // Warte auf Transition
      return () => clearTimeout(timer);
    } else {
      setIsAnimationDone(false);
    }
  }, [isOpen]);

  return (
    <div className="border border-white/10 rounded-md bg-[#16171a] transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1e1f22] hover:bg-[#232428] transition-colors rounded-t-md"
      >
        <div className="flex items-center gap-2.5 text-gray-200 font-medium text-sm">
          {Icon && <Icon className="w-4 h-4 text-[#5865F2]" />}
          <span>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      <div
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
        style={{ overflow: isAnimationDone && isOpen ? "visible" : "hidden" }} 
      >
        <div className="p-5 space-y-4 border-t border-white/5">{children}</div>
      </div>
    </div>
  );
}

// --- Variable Dropdown Helper ---
function VariableDropdown({ modal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null); // null or string (the copied value)
  const containerRef = useRef(null);

  // Standard Variables
  const standardVars = [
    { label: "User Mention", value: "{user}", desc: "Erwähnt den User (@User)" },
    { label: "Username", value: "{username}", desc: "Name des Users" },
    { label: "Server Name", value: "{server}", desc: "Name des Servers" },
    { label: "Channel Name", value: "{channel}", desc: "Aktueller Channel" },
    { label: "Ticket ID", value: "{ticket_id}", desc: "Nummer des Tickets (z.B. 004)" },
  ];

  // Dynamic Variables from Modal Components
  const formVars = (modal?.components || []).map(c => ({
    label: c.label || "Unbenanntes Feld",
    value: `{field:${c.custom_id || "unknown"}}`,
    desc: `Inhalt von '${truncate(c.label, 20)}'`
  }));

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    setCopyFeedback(val);
    setIsOpen(false);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="relative w-full md:w-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-bold uppercase tracking-wider transition-all min-w-[200px] justify-between",
            copyFeedback 
                ? "bg-green-500/10 border-green-500/50 text-green-400" 
                : "bg-[#1e1f22] border-white/10 text-gray-300 hover:border-[#5865F2] hover:text-white"
        )}
      >
        <div className="flex items-center gap-2">
            {copyFeedback ? <ClipboardCheck className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            <span>{copyFeedback ? "Kopiert!" : "Variable kopieren"}</span>
        </div>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[280px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100 max-h-[400px] overflow-y-auto custom-scrollbar">
            
            {/* Standard Vars Group */}
            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-[#111214] border-b border-white/5 sticky top-0">
                Standard
            </div>
            <div className="p-1">
                {standardVars.map((v) => (
                    <button
                        key={v.value}
                        onClick={() => handleCopy(v.value)}
                        className="w-full text-left px-3 py-2 rounded-[4px] hover:bg-[#5865F2] hover:text-white group transition-colors flex flex-col gap-0.5"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-gray-200 group-hover:text-white">{v.value}</span>
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[10px] text-gray-500 group-hover:text-white/80">{v.desc}</span>
                    </button>
                ))}
            </div>

            {/* Form Vars Group */}
            {formVars.length > 0 && (
                <>
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-[#111214] border-y border-white/5 sticky top-0">
                        Formular Felder
                    </div>
                    <div className="p-1">
                        {formVars.map((v) => (
                            <button
                                key={v.value}
                                onClick={() => handleCopy(v.value)}
                                className="w-full text-left px-3 py-2 rounded-[4px] hover:bg-[#5865F2] hover:text-white group transition-colors flex flex-col gap-0.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-gray-200 group-hover:text-white truncate max-w-[180px]">{v.value}</span>
                                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-[10px] text-gray-500 group-hover:text-white/80 truncate">{v.desc}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
      )}
    </div>
  );
}


// --- STATS CARD COMPONENT ---
function StatsCard({ title, value, icon: Icon, colorClass = "text-white" }) {
  return (
    <Card className="bg-[#111214] border-white/10 shadow-sm flex items-center p-4 gap-4 rounded-lg hover:border-white/20 transition-colors">
      <div className={cn("p-3 rounded-md bg-white/5", colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

// --- COMPONENTS ---

function DiscordButton({ label, emoji, style = "Primary" }) {
  const styles = {
    Primary: "bg-[#5865F2] hover:bg-[#4752c4] active:bg-[#3c45a5]",
    Secondary: "bg-[#4e5058] hover:bg-[#6d6f78] active:bg-[#474950]",
    Success: "bg-[#248046] hover:bg-[#1a6334] active:bg-[#15562b]",
    Danger: "bg-[#da373c] hover:bg-[#a1282c] active:bg-[#8f2023]",
  };
  const key = style.charAt(0).toUpperCase() + style.slice(1).toLowerCase();
  const bg = styles[key] || styles.Primary;

  return (
    <div
      className={cn(
        bg,
        "h-[32px] px-[16px] min-w-[60px] rounded-[3px] text-white text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none shadow-sm"
      )}
    >
      {emoji && <span className="text-[1.1rem] leading-none">{emoji}</span>}
      <span className="leading-none mt-[1px]">{label}</span>
    </div>
  );
}

function DiscordSelect({ label, value, onChange, options, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 w-full" ref={containerRef}>
      <Label className="text-gray-400 text-[11px] uppercase font-bold tracking-wider pl-0.5">
        {label}
      </Label>

      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-[#1e1f22] border border-black/20 text-gray-200 rounded-sm px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-all hover:bg-[#232428] hover:border-black/40",
            isOpen
              ? "border-[#5865F2] ring-1 ring-[#5865F2] rounded-b-none border-b-0"
              : ""
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {Icon && (
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isOpen || selectedOption ? "text-gray-300" : "text-gray-500"
                )}
              />
            )}
            <span className={cn("truncate font-medium", !selectedOption && "text-gray-500")}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform duration-200",
              isOpen && "rotate-180 text-white"
            )}
          />
        </div>

        {isOpen && (
          <div className="absolute z-[9999] w-full bg-[#2b2d31] border border-[#5865F2] border-t-0 rounded-b-sm shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="p-1 space-y-0.5">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center italic">
                  Keine Optionen verfügbar
                </div>
              ) : (
                options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "px-3 py-2 text-sm rounded-[3px] cursor-pointer flex items-center gap-2 transition-colors group",
                        isSelected
                          ? "bg-[#404249] text-white"
                          : "text-gray-300 hover:bg-[#35373c] hover:text-white"
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isSelected ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                          )}
                        />
                      )}
                      <span className={cn("truncate flex-1", isSelected && "font-medium")}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5865F2] shrink-0">
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
  const filtered = channels.filter((c) => typeFilter === undefined || c.type === typeFilter);
  const options = filtered.map((c) => ({ label: c.name, value: c.id }));
  const Icon = typeFilter === 4 ? FolderOpen : Hash;

  return (
    <DiscordSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder || "Kanal wählen..."}
      icon={Icon}
    />
  );
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  const options = filtered.map((r) => ({ label: r.name, value: r.id }));

  return (
    <DiscordSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder || "Rolle wählen..."}
      icon={Users}
    />
  );
};

// --- BUILDER HELPERS ---

function buildTicketBotCode(modal) {
  const payload = {
    v: 1,
    t: truncate(modal?.title || "Ticket Form", 45),
    id: "ticket_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = {
        k: c.kind,
        cid: truncate(c.custom_id || "", 100),
        l: truncate(c.label || "Field", 45),
        d: truncate(c.description || "", 100),
        r: !!c.required,
      };

      if (c.kind === "text_input")
        return {
          ...base,
          s: c.style === "paragraph" || c.style === 2 ? 2 : 1,
          ph: truncate(c.placeholder || "", 100) || undefined,
          mx: 4000,
        };

      if (c.kind === "string_select")
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

      if (c.kind === "file_upload") return { ...base };

      return { ...base, k: "text_input", s: 1 };
    }),
  };

  return JSON.stringify(payload);
}

function defaultTicketModal() {
  return {
    title: "Create Ticket",
    custom_id: "ticket_form",
    show_warning: false,
    components: [
      {
        id: "c1",
        kind: "string_select",
        label: "Category",
        description: "Choose a category",
        custom_id: "ticket_cat",
        required: true,
        placeholder: "Select category…",
        options: [
          { label: "Support", value: "support", description: "", id: "o1" },
          { label: "Apply", value: "apply", description: "", id: "o2" },
        ],
      },
      {
        id: "c2",
        kind: "text_input",
        label: "Description",
        description: "Describe your issue",
        custom_id: "ticket_desc",
        required: true,
        placeholder: "Explain your issue…",
        style: 2,
        maxLength: 1000,
      },
    ],
  };
}

function defaultTicketResponse() {
  return {
    type: "embed",
    text: "",
    content: "",
    embed: {
      title: "✅ Ticket Created",
      description: "**Category:** {ticket_cat}\n**Your message:** ```{field:ticket_desc}```",
      color: "#ffde4b",
      fields: [],
      footer: { text: "", icon_url: "" },
      thumbnail_url: "{user_avatar}",
      timestamp: false,
    },
  };
}

function defaultPanelEmbed() {
  return {
    title: "Support Ticket",
    description: "Klicke auf den Button, um ein Ticket zu öffnen.",
    color: "#5865F2",
    fields: [],
    footer: { text: "Support System" },
    image_url: "https://dummyimage.com/600x200/2b2b2b/ffffff&text=Support",
    timestamp: false,
  };
}

export default function TicketsPage() {
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("config"); // config, panel, modal, response
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);
  
  const [stats, setStats] = useState({ total: 0, open: 0, thisWeek: 0, closed: 0 });

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
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
    return arr.sort(
      (a, b) =>
        new Date(a.timestamp || a.createdAt || 0).getTime() -
        new Date(b.timestamp || b.createdAt || 0).getTime()
    );
  }, [messages]);

  function flashFormMsg(msg) {
    setFormMsg(msg);
    setTimeout(() => setFormMsg(""), 2000);
  }

  useEffect(() => {
    if (!guildId || guildId === "undefined") return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sRes, tRes, cRes, rRes, tfRes, gRes, stRes] = await Promise.all([
          fetch(`/api/settings/${guildId}`),
          fetch(`/api/guilds/${guildId}/tickets`),
          fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`),
          fetch(`/api/guilds/${guildId}/tickets/form`),
          fetch(`/api/user/guilds`),
          fetch(`/api/guilds/${guildId}/tickets/stats`),
        ]);

        if (!sRes.ok) throw new Error(`Fehler (${sRes.status})`);

        const settingsData = await sRes.json();
        if (!settingsData.panelEmbed) settingsData.panelEmbed = defaultPanelEmbed();
        setSettings(settingsData);

        if (tRes.ok) setTickets(await tRes.json());
        if (cRes.ok) setChannels(await cRes.json());
        if (rRes.ok) setRoles(await rRes.json());
        if (stRes.ok) setStats(await stRes.json());

        if (gRes.ok) {
          const all = await gRes.json();
          const g = all.find((x) => x.id === guildId);
          if (g) setCurrentGuild(g);
        }

        const tf = tfRes.ok ? await tfRes.json() : {};
        const bd = tf.builderData || null;
        if (bd?.modal) setModal(bd.modal);

        if (bd?.response) {
          let r = bd.response;
          if (!r.embed.footer && r.embed.footerText) r.embed.footer = { text: r.embed.footerText, icon_url: "" };
          if (r.type === "default") r.type = "embed";
          setResponse(r);
        }
      } catch (e) {
        setLoadError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [guildId]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [sortedMessages.length]);

  async function fetchMessages(ticketId) {
    try {
      setChatLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error();
      setMessages(await res.json());
    } catch {
    } finally {
      setChatLoading(false);
    }
  }

  async function onSelectTicket(t) {
    setSelectedTicket(t);
    setMessages([]);
    setReplyText("");
    await fetchMessages(t._id);
  }

  async function sendReply() {
    if (!selectedTicketId || !replyText.trim()) return;
    try {
      await fetch(`/api/tickets/${selectedTicketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      setReplyText("");
      fetchMessages(selectedTicketId);
    } catch {}
  }

  // --- SAVE LOGIC (CONTEXT AWARE) ---
  async function handleSave() {
    setSaving(true);
    try {
      if (editorTab === "config") {
        // Speichere NUR Einstellungen
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (r.ok) flashFormMsg("Konfiguration gespeichert ✅");
        else throw new Error();
      } 
      else if (editorTab === "panel") {
         // Speichere NUR Panel Settings
         const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (r.ok) flashFormMsg("Panel Design gespeichert ✅");
        else throw new Error();
      }
      else if (editorTab === "modal" || editorTab === "response") {
        // Speichere Formular & Bot
        const pl = {
          mode: "custom",
          version: 1,
          botCode: buildTicketBotCode(modal),
          builderData: { modal, response },
        };

        const r = await fetch(`/api/guilds/${guildId}/tickets/form`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pl),
        });

        if (r.ok) flashFormMsg("Ticket System Update gespeichert ✅");
        else throw new Error();
      }
    } catch {
      flashFormMsg("Fehler beim Speichern ❌");
    } finally {
      setSaving(false);
    }
  }

  // --- RESET LOGIC (CONTEXT AWARE) ---
  async function handleReset() {
    if (!window.confirm("Bist du sicher? Dies setzt den aktuellen Bereich zurück.")) return;
    setSaving(true);

    try {
      if (editorTab === "config") {
         const newSettings = {
             ...settings,
             ticketCategoryId: null,
             logChannelId: null,
             panelChannelId: null,
             supportRoleId: null
         };
         setSettings(newSettings);
         flashFormMsg("Konfiguration zurückgesetzt (Nicht gespeichert)");
      } 
      else if (editorTab === "panel") {
          setSettings({
              ...settings,
              panelEmbed: defaultPanelEmbed(),
              panelButtonText: "",
              panelButtonStyle: "Primary"
          });
          flashFormMsg("Panel zurückgesetzt (Nicht gespeichert)");
      }
      else if (editorTab === "modal") {
          setModal(defaultTicketModal());
          flashFormMsg("Modal zurückgesetzt (Nicht gespeichert)");
      }
      else if (editorTab === "response") {
          setResponse(defaultTicketResponse());
          flashFormMsg("Antwort zurückgesetzt (Nicht gespeichert)");
      }
    } catch {
       flashFormMsg("Fehler beim Reset ❌");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 animate-pulse">
        Lade Ticketsystem...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="p-8 text-red-400 bg-red-900/10 border border-red-500/20 rounded-lg m-4">
        ❌ Fehler: {loadError}
      </div>
    );
  }
  if (!settings) {
    return <div className="p-8 text-gray-400">Keine Einstellungen gefunden.</div>;
  }

  const guildIconUrl = currentGuild?.icon
    ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="p-6 xl:p-10 mx-auto w-full max-w-[1920px] space-y-8 font-sans">
      <style jsx global>{`
        .discord-md strong { font-weight: 700; color: #fff; }
        .discord-md .inlinecode {
          background: rgba(255,255,255,0.1);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Inbox className="w-8 h-8 text-[#5865F2]" />
            Ticket System
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Verwalte Support-Tickets, konfiguriere das Design und den Ablauf.
          </p>
        </div>
        <div className="bg-[#111214] p-1 rounded-lg border border-white/10 shadow-sm flex gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "overview"
                ? "bg-[#5865F2] text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Übersicht
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "settings"
                ? "bg-[#5865F2] text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings2 className="w-4 h-4" /> Konfiguration
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* STATS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <StatsCard title="Tickets Gesamt" value={stats.total} icon={Inbox} colorClass="text-blue-400" />
             <StatsCard title="Aktuell Offen" value={stats.open} icon={MessageSquare} colorClass="text-green-400" />
             <StatsCard title="Neu (7 Tage)" value={stats.thisWeek} icon={CalendarDays} colorClass="text-orange-400" />
             <StatsCard title="Geschlossen" value={stats.closed} icon={CheckCircle2} colorClass="text-purple-400" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-320px)] min-h-[600px]">
            {/* Ticket List */}
            <Card className="bg-[#111214] border-white/10 flex flex-col overflow-hidden shadow-sm rounded-lg">
              <CardHeader className="bg-[#16171a] border-b border-white/10 py-3.5 px-4">
                <CardTitle className="text-white text-sm font-bold flex justify-between items-center">
                  <span>Offene Tickets</span>
                  <span className="bg-[#5865F2] text-white text-[10px] px-2 py-0.5 rounded-full">
                    {openTickets.length}
                  </span>
                </CardTitle>
              </CardHeader>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {openTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                    <CheckCircle2 className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Alles erledigt!</p>
                  </div>
                )}

                {openTickets.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => onSelectTicket(t)}
                    className={cn(
                      "w-full text-left p-3 rounded-md border transition-all group",
                      selectedTicketId === t._id
                        ? "border-[#5865F2] bg-[#5865F2]/10"
                        : "border-transparent bg-transparent hover:bg-white/5 hover:border-white/5"
                    )}
                  >
                    <div className="text-white font-medium truncate text-sm group-hover:text-[#5865F2] transition-colors">
                      {t.issue || "No Subject"}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between">
                      <span>{t.userTag}</span>
                      <span className="text-gray-600 font-mono text-[10px]">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Chat View */}
            <Card className="bg-[#111214] border-white/10 flex flex-col shadow-sm rounded-lg">
              {!selectedTicket ? (
                <div className="m-auto text-gray-500 flex flex-col items-center gap-3">
                  <div className="p-4 bg-white/5 rounded-full">
                    <MessageSquare className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-sm">Wähle ein Ticket aus, um den Chat zu laden.</p>
                </div>
              ) : (
                <>
                  <div className="bg-[#16171a] border-b border-white/10 p-4 flex justify-between items-center">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" /> {selectedTicket.issue}
                    </div>
                    <div className="text-[10px] font-mono text-gray-600 bg-black/30 px-2 py-1 rounded">ID: {selectedTicket.channelId}</div>
                  </div>

                  <div className="flex-1 overflow-hidden relative bg-[#1e1f22]/50">
                    <div ref={chatScrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                      {messages.map((m, i) => (
                        <div key={i} className="group flex gap-3 hover:bg-white/[0.02] p-2 rounded-lg -mx-2 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                            {m.authorTag?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-gray-100 text-sm">{m.authorTag}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{new Date(m.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="text-[14px] text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed">
                              <DiscordMarkdown text={m.content} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#16171a] border-t border-white/10">
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) sendReply();
                        }}
                        placeholder={`Antworte an ${selectedTicket.userTag}...`}
                        className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2] h-10"
                      />
                      <Button onClick={sendReply} className="bg-[#5865F2] hover:bg-[#4752C4] h-10 w-10 p-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* CONFIGURATION & EDITOR TAB (UNIFIED) */}
      {activeTab === "settings" && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_500px] gap-8 items-start">
            
            {/* Main Configuration Card */}
            <Card className="bg-[#111214] border-white/10 shadow-sm rounded-lg overflow-hidden flex flex-col w-full">
              
              {/* Card Header with Tabs & Actions */}
              <div className="bg-[#16171a] border-b border-white/10 px-6 pt-4 pb-0 flex flex-col gap-4">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                      Konfiguration & Design
                    </h2>
                  </div>
                  <div className="flex gap-2">
                     <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleReset}
                      className="text-gray-400 hover:text-white hover:bg-white/5 h-8 text-xs font-medium"
                    >
                      <History className="w-3.5 h-3.5 mr-1.5" /> Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white h-8 text-xs font-bold px-4 rounded-md shadow-sm"
                    >
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Speichern
                    </Button>
                  </div>
                </div>

                {/* Tabs Row */}
                <div className="flex gap-6 overflow-x-auto mt-2 no-scrollbar">
                  {[
                    { id: "config", label: "Konfiguration", icon: Settings2 },
                    { id: "panel", label: "Panel Design", icon: LayoutTemplate },
                    { id: "modal", label: "Formular", icon: MousePointerClick },
                    { id: "response", label: "Antwort", icon: MessageSquare }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setEditorTab(tab.id)}
                      className={cn(
                        "pb-3 text-sm font-medium border-b-[2px] transition-all flex items-center gap-2 whitespace-nowrap",
                        editorTab === tab.id
                          ? "border-[#5865F2] text-white"
                          : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
                      )}
                    >
                      <tab.icon className={cn("w-4 h-4", editorTab === tab.id ? "text-[#5865F2]" : "text-gray-500")} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <CardContent className="p-0 bg-[#111214]">
                {formMsg && (
                  <div className="mx-6 mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {formMsg}
                  </div>
                )}

                <div className="p-6 min-h-[500px]">
                  
                  {/* TAB: GENERAL CONFIG */}
                  {editorTab === "config" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-md p-4 mb-6 flex gap-3">
                         <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                         <div className="text-sm text-gray-300 leading-relaxed">
                            Definiere hier die grundlegenden Kanäle und Rollen für das Ticket-System.
                         </div>
                      </div>

                      <CollapsibleSection title="Allgemeine Einstellungen" icon={Settings2}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ChannelSelect
                              label="Ticket Kategorie (Offen)"
                              value={settings.ticketCategoryId}
                              onChange={(v) => setSettings({ ...settings, ticketCategoryId: v })}
                              channels={channels}
                              typeFilter={4}
                              placeholder="Kategorie wählen..."
                            />
                            <ChannelSelect
                              label="Log Channel (Transcripts)"
                              value={settings.logChannelId}
                              onChange={(v) => setSettings({ ...settings, logChannelId: v })}
                              channels={channels}
                              typeFilter={0}
                              placeholder="#logs wählen..."
                            />
                            <ChannelSelect
                              label="Panel Channel (Ticket Erstellung)"
                              value={settings.panelChannelId}
                              onChange={(v) => setSettings({ ...settings, panelChannelId: v })}
                              channels={channels}
                              typeFilter={0}
                              placeholder="#tickets wählen..."
                            />
                            <RoleSelect
                              label="Support Team Rolle"
                              value={settings.supportRoleId}
                              onChange={(v) => setSettings({ ...settings, supportRoleId: v })}
                              roles={roles}
                              placeholder="@Support wählen..."
                            />
                         </div>
                      </CollapsibleSection>
                    </div>
                  )}

                  {/* TAB: PANEL DESIGN */}
                  {editorTab === "panel" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      
                      <CollapsibleSection title="Button Konfiguration" icon={Palette}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label className="text-[11px] text-gray-400 uppercase font-bold">
                                Button Text
                              </Label>
                              <Input
                                value={settings.panelButtonText || ""}
                                onChange={(e) =>
                                  setSettings({ ...settings, panelButtonText: e.target.value })
                                }
                                placeholder="Standard"
                                className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2]"
                              />
                              <p className="text-[10px] text-gray-600">
                                Leer lassen für Standard (Sprachauswahl).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <DiscordSelect
                                label="Button Farbe"
                                value={settings.panelButtonStyle || "Primary"}
                                onChange={(v) =>
                                  setSettings({ ...settings, panelButtonStyle: v })
                                }
                                options={[
                                  { label: "Primary (Blurple)", value: "Primary" },
                                  { label: "Secondary (Grey)", value: "Secondary" },
                                  { label: "Success (Green)", value: "Success" },
                                  { label: "Danger (Red)", value: "Danger" },
                                ]}
                                placeholder="Style wählen..."
                                icon={Palette}
                              />
                            </div>
                          </div>
                      </CollapsibleSection>

                      <EmbedBuilder
                          data={settings.panelEmbed}
                          onChange={(e) => setSettings({ ...settings, panelEmbed: e })}
                          hiddenSections={["author", "fields"]}
                        />
                    </div>
                  )}

                  {/* TAB: MODAL EDITOR */}
                  {editorTab === "modal" && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                       <ModalBuilder data={modal} onChange={setModal} />
                    </div>
                  )}

                  {/* TAB: BOT RESPONSE - REDESIGNED */}
                  {editorTab === "response" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      
                      {/* TYPE SELECTION */}
                      <CollapsibleSection title="Nachrichtentyp" icon={Sparkles} defaultOpen={true}>
                          <div className="flex gap-4">
                             <button 
                                onClick={() => setResponse(r => ({...r, type: 'text'}))}
                                className={cn(
                                   "flex-1 p-4 rounded-lg border text-left transition-all hover:bg-white/5 flex gap-3 items-center",
                                   response.type === 'text' ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/10 bg-[#1e1f22]"
                                )}
                             >
                                <div className="p-2 bg-black/40 rounded-md text-gray-400">
                                   <Type className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-white font-bold text-sm">Nur Text</div>
                                   <div className="text-gray-400 text-xs">Klassische Nachricht ohne Formatierung.</div>
                                </div>
                                {response.type === 'text' && <CheckCircle2 className="w-5 h-5 text-[#5865F2] ml-auto" />}
                             </button>

                             <button 
                                onClick={() => setResponse(r => ({...r, type: 'embed'}))}
                                className={cn(
                                   "flex-1 p-4 rounded-lg border text-left transition-all hover:bg-white/5 flex gap-3 items-center",
                                   response.type === 'embed' ? "border-[#5865F2] bg-[#5865F2]/10" : "border-white/10 bg-[#1e1f22]"
                                )}
                             >
                                <div className="p-2 bg-black/40 rounded-md text-gray-400">
                                   <LayoutTemplate className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-white font-bold text-sm">Embed Nachricht</div>
                                   <div className="text-gray-400 text-xs">Professionelles Layout mit Farben & Feldern.</div>
                                </div>
                                {response.type === 'embed' && <CheckCircle2 className="w-5 h-5 text-[#5865F2] ml-auto" />}
                             </button>
                          </div>
                      </CollapsibleSection>

                      {/* VARIABLES DROPDOWN (NEW) */}
                      <div className="bg-[#1e1f22] p-3 rounded-md border border-white/10 flex flex-wrap md:flex-nowrap items-center gap-4 justify-between">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Code2 className="w-3 h-3" /> Variablen
                             </span>
                             <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                             <p className="text-[10px] text-gray-500">
                                Wähle eine Variable, um sie zu kopieren und in deine Nachricht einzufügen.
                             </p>
                          </div>
                          
                          <VariableDropdown modal={modal} />
                      </div>

                      {/* EDITOR AREA */}
                      <CollapsibleSection title="Nachricht bearbeiten" icon={FileText} defaultOpen={true}>
                          {response.type === "text" && (
                            <div className="space-y-2">
                              <textarea
                                value={response.text || ""}
                                onChange={(e) => setResponse((r) => ({ ...r, text: e.target.value }))}
                                className="w-full h-64 bg-[#111214] border border-white/10 rounded-md p-4 text-white outline-none focus:border-[#5865F2] transition-colors resize-none leading-relaxed text-sm font-mono custom-scrollbar"
                                placeholder="Schreibe hier deine Nachricht..."
                              />
                            </div>
                          )}

                          {response.type === "embed" && (
                            <div className="space-y-6">
                              <div>
                                <Label className="text-[11px] text-gray-400 uppercase font-bold mb-2 block">
                                  Text über dem Embed (Optional)
                                </Label>
                                <Input
                                  value={response.content || ""}
                                  onChange={(e) => setResponse((r) => ({ ...r, content: e.target.value }))}
                                  placeholder="Z.B.: Hallo {user}, danke für dein Ticket!"
                                  className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2]"
                                />
                              </div>

                              <div className="pt-4 border-t border-white/5">
                                <EmbedBuilder
                                  data={response.embed}
                                  onChange={(e) => setResponse({ ...response, embed: e })}
                                />
                              </div>
                            </div>
                          )}
                      </CollapsibleSection>

                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Platzhalter rechts, damit Grid-Spalte reserviert bleibt */}
            <div className="hidden xl:block" />
          </div>

          {/* LIVE PREVIEW: FIXED SIDEBAR */}
          <div className="hidden xl:block fixed top-[calc(50%+40px)] -translate-y-1/2 right-10 w-[480px] z-50">

            <div className="bg-[#111214] border border-white/10 rounded-lg p-5 shadow-2xl ring-1 ring-white/5 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              <div className="text-gray-400 font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
                <span>Live Preview</span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">
                    {editorTab === "config" ? "Allgemein" : editorTab === "modal" ? "Formular" : editorTab === "response" ? "Bot Antwort" : "Panel"}
                </span>
              </div>

              {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
              {editorTab === "config" && (
                 <div className="text-center py-20 text-gray-500 italic text-sm">
                    Wähle einen Design-Tab für Vorschau.
                 </div>
              )}

              {editorTab === "response" && (
                <div className="bg-[#313338] rounded-md p-4 transition-all duration-300">
                  {response.type === "text" ? (
                    <div className="flex gap-4 group items-start">
                      <div className="shrink-0 cursor-pointer mt-0.5">
                        <img
                          src={guildIconUrl}
                          alt="Bot Avatar"
                          className="w-10 h-10 rounded-full hover:opacity-80 transition shadow-sm bg-[#1e1f22]"
                        />
                      </div>
                      <div className="flex flex-col text-left w-full min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-medium hover:underline cursor-pointer">
                            Ticket Bot
                          </span>
                          <span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px] flex items-center h-[15px] leading-none mt-[1px]">
                            BOT
                          </span>
                          <span className="text-gray-400 text-xs ml-1">
                            Today at{" "}
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                          {response.text ? (
                            <DiscordMarkdown text={response.text} />
                          ) : (
                            <span className="text-gray-500 italic text-sm">Schreibe etwas...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmbedPreview
                      embed={{
                        ...response.embed,
                        thumbnail_url:
                          response.embed.thumbnail_url === "{user_avatar}"
                            ? "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                            : response.embed.thumbnail_url,
                      }}
                      content={response.content}
                      botName="Ticket Bot"
                      botIconUrl={guildIconUrl}
                    />
                  )}
                </div>
              )}

              {editorTab === "panel" && (
                <div className="bg-[#313338] rounded-md p-4 transition-all duration-300">
                  <EmbedPreview
                    embed={{
                      ...settings?.panelEmbed,
                      image: settings?.panelEmbed?.image_url
                        ? { url: settings.panelEmbed.image_url }
                        : undefined,
                    }}
                    content=""
                    botName="Ticket System"
                    botIconUrl={guildIconUrl}
                  >
                    <div className="flex gap-2 flex-wrap mt-2">
                      {settings?.panelButtonText ? (
                        <DiscordButton
                          label={settings.panelButtonText}
                          emoji="📩"
                          style={settings.panelButtonStyle}
                        />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}