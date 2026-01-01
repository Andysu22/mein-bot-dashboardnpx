"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Settings2,
  RefreshCw,
  Save,
  History,
  LayoutTemplate,
  Type,
  ChevronDown,
  ChevronUp,
  Hash,
  Users,
  FolderOpen,
  Check,
  Palette,
  BarChart3,
  Inbox,
  CheckCircle2,
  Minimize2,
  Maximize2,
  GripHorizontal,
  MessageSquare,
  ShieldCheck,
  Code2,
  XCircle,
  CalendarDays,
  Copy,
  X,
  Eye,
  ArrowLeft
} from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

// --- Helper Functions ---

const formatCompactNumber = (number) => {
  if (typeof number !== "number") return number; // Falls es keine Zahl ist
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1, // Eine Nachkommastelle (9.9k)
  }).format(number).toLowerCase(); // .toLowerCase() macht aus "1.5K" -> "1.5k"
};

function safeJsonParse(maybeJson) {
  if (typeof maybeJson !== "string") return null;
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

function ensureModalObject(value) {
  const parsed = safeJsonParse(value);
  const v = parsed ?? value;
  if (!v || typeof v !== "object") return null;
  const title = typeof v.title === "string" ? v.title : "Bewerbung";
  const components = Array.isArray(v.components) ? v.components : [];
  return { ...v, title, components };
}

function normalizeUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function sanitizeEmbedForSave(embed) {
  const e = embed ? { ...embed } : {};
  if (typeof e.timestamp !== "boolean") {
    if (e.timestamp === "true") e.timestamp = true;
    else if (e.timestamp === "false") e.timestamp = false;
    else e.timestamp = false;
  }
  if ("image_url" in e) e.image_url = normalizeUrl(e.image_url);
  if ("thumbnail_url" in e) e.thumbnail_url = normalizeUrl(e.thumbnail_url);
  if (e.author?.icon_url) e.author = { ...e.author, icon_url: normalizeUrl(e.author.icon_url) };
  return e;
}

function truncate(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ---------------- UI COMPONENTS (Themed) ----------------

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAnimationDone, setIsAnimationDone] = useState(defaultOpen);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimationDone(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsAnimationDone(false);
    }
  }, [isOpen]);

  return (
    <div className="border border-border rounded-md bg-card transition-all duration-200 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-t-md"
      >
        <div className="flex items-center gap-2.5 text-foreground font-medium text-sm">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <div
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
        style={{ overflow: isAnimationDone && isOpen ? "visible" : "hidden" }}
      >
        <div className="p-5 space-y-4 border-t border-border">{children}</div>
      </div>
    </div>
  );
}

function DiscordButton({ label, style = "Primary" }) {
  const styles = {
    Primary: "bg-[#5865F2] hover:bg-[#4752c4]",
    Secondary: "bg-[#4e5058] hover:bg-[#6d6f78]",
    Success: "bg-[#248046] hover:bg-[#1a6334]",
    Danger: "bg-[#da373c] hover:bg-[#a1282c]",
  };
  return (
    <div className={cn(styles[style] || styles.Primary, "h-[32px] px-[16px] rounded-[3px] text-white text-[14px] font-medium flex items-center justify-center select-none shadow-sm transition-colors")}>
      <span>{label}</span>
    </div>
  );
}

function DiscordSelect({ label, value, onChange, options, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 w-full" ref={containerRef}>
      <Label className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider pl-0.5">{label}</Label>
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-muted/30 border border-input text-foreground rounded-sm px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-all hover:bg-muted/50 hover:border-primary/50",
            isOpen ? "border-primary ring-1 ring-primary rounded-b-none border-b-0" : ""
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {Icon && <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isOpen || selectedOption ? "text-foreground" : "text-muted-foreground")} />}
            <span className={cn("truncate font-medium", !selectedOption && "text-muted-foreground")}>{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-foreground")} />
        </div>

        {isOpen && (
          <div className="absolute z-[9999] w-full bg-card border border-primary border-t-0 rounded-b-sm shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-100">
            {options.map((opt) => {
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
                    isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    {Icon && <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />}
                    <span className={cn("truncate flex-1", isSelected && "font-medium")}>{opt.label}</span>
                    {isSelected && <div className="flex items-center justify-center w-5 h-5 rounded-full bg-background/20 shrink-0"><Check className="w-3 h-3 text-white stroke-[3]" /></div>}
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ChannelSelect = ({ label, value, onChange, channels, placeholder }) => {
  const options = channels.map((c) => ({ label: c.name, value: c.id }));
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} icon={Hash} />;
};

const RoleSelect = ({ label, value, onChange, roles, placeholder }) => {
  const filtered = Array.isArray(roles) ? roles.filter((r) => r.name !== "@everyone") : [];
  const options = filtered.map((r) => ({ label: r.name, value: r.id }));
  return <DiscordSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} icon={Users} />;
};

function VariableDropdown({ modal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const containerRef = useRef(null);

  const standardVars = [
    { label: "User Mention", value: "{user}", desc: "Erwähnt den User (@User)" },
    { label: "Username", value: "{username}", desc: "Name des Users" },
    { label: "Server Name", value: "{server}", desc: "Name des Servers" },
  ];

  const formVars = (modal?.components || []).map((c) => ({
    label: c.label || "Feld",
    value: `{field:${c.custom_id || "unknown"}}`,
    desc: `Inhalt von '${truncate(c.label, 20)}'`,
  }));

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async (val) => {
    const ok = await copyToClipboard(val);
    if (ok) {
      setCopyFeedback(val);
      setIsOpen(false);
      setTimeout(() => setCopyFeedback(null), 1500);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider transition-all min-w-[140px] md:min-w-[180px] justify-between h-9 w-full md:w-auto",
          copyFeedback
            ? "bg-green-500/10 border-green-500/50 text-green-500"
            : "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {copyFeedback ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
          <span className="truncate">{copyFeedback ? "Kopiert!" : "Variablen"}</span>
        </div>
        <ChevronDown className={cn("w-3 h-3 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-[280px] md:w-[300px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100 max-h-[400px] overflow-y-auto custom-scrollbar ring-1 ring-black/10">
          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0 flex justify-between items-center">
            <span>Standard</span>
          </div>
          <div className="p-1 space-y-0.5">
            {standardVars.map((v) => (
              <button
                key={v.value}
                onClick={() => handleCopy(v.value)}
                className="w-full text-left px-3 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground group transition-colors flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary-foreground">{v.value}</span>
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/80">{v.desc}</span>
              </button>
            ))}
          </div>

          {formVars.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 border-y border-border sticky top-0 mt-1">
                Formular Felder
              </div>
              <div className="p-1 space-y-0.5">
                {formVars.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => handleCopy(v.value)}
                    className="w-full text-left px-3 py-2 rounded-[4px] hover:bg-primary hover:text-primary-foreground group transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary-foreground truncate max-w-[200px]">{v.value}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/80 truncate">{v.desc}</span>
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

// ---------------- STATS CARD ----------------
function StatsCard({ title, value, icon: Icon, colorClass = "text-foreground", loading }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatCompactNumber = (num) => {
     if (typeof num !== "number") return num;
     if (num >= 1000000) return (Math.floor(num / 100000) / 10) + "m";
     if (num >= 1000) return (Math.floor(num / 100) / 10) + "k";
     return num;
  };

  const formatFullNumber = (num) => {
      if (typeof num !== "number") return num;
      return new Intl.NumberFormat('de-DE').format(num);
  };

  return (
    <Card className="flex flex-row items-center gap-3 p-3 md:gap-4 md:p-4 border-border shadow-sm hover:border-primary/20 transition-all duration-300 overflow-visible">
      
      {/* ICON: Kleiner auf Handy (w-10), Groß auf PC (md:w-12) */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-muted/50 shrink-0 transition-all", 
        colorClass
      )}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      
      {/* TEXT & WERT */}
      <div className="flex flex-col space-y-0.5 md:space-y-1 min-w-0">
        {/* TITEL: Kleiner auf Handy text-[10px] */}
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
            {title}
        </p>

        {loading ? (
            <Skeleton className="h-6 w-12 md:h-7 md:w-16 rounded-md bg-muted" />
        ) : (
            <div 
                className="relative w-fit"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
            >
                {/* ZAHL: Kleiner auf Handy (text-lg), Groß auf PC (md:text-2xl) */}
                <p className="text-lg md:text-2xl font-black text-foreground tracking-tight leading-none cursor-pointer select-none transition-all">
                    {formatCompactNumber(value)}
                </p>

                <div 
                    className={cn(
                        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex-col items-center z-50 whitespace-nowrap transition-opacity duration-200",
                        showTooltip ? "flex opacity-100" : "hidden opacity-0"
                    )}
                >
                    <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-neutral-900 shadow-lg rounded-md font-bold">
                        {formatFullNumber(value)}
                    </span>
                    <div className="w-3 h-3 -mt-2 rotate-45 bg-neutral-900 z-0"></div>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
}
// ---------------- DEFAULTS & BOT CODE ----------------

function buildAppBotCode(modal) {
  const payload = {
    v: 1,
    t: truncate(modal?.title || "Bewerbung", 45),
    id: "app_form",
    c: (modal?.components || []).slice(0, 5).map((c) => {
      const base = {
        k: c.kind,
        cid: truncate(c.custom_id || "", 100),
        l: truncate(c.label || "Feld", 45),
        d: truncate(c.description || "", 100),
        r: !!c.required,
      };
      if (c.kind === "text_input") {
        return { ...base, s: c.style === "paragraph" || c.style === 2 ? 2 : 1, ph: truncate(c.placeholder || "", 100) || undefined, mx: 4000 };
      }
      if (c.kind === "string_select") {
        return { ...base, ph: truncate(c.placeholder || "", 100) || undefined, mn: c.min_values ?? 1, mxv: c.max_values ?? 1, o: (c.options || []).slice(0, 25).map((o) => ({ l: truncate(o.label || "Option", 100), v: truncate(o.value || "value", 100), d: truncate(o.description || "", 100) || undefined, e: o.emoji || undefined })) };
      }
      return { ...base, mn: c.min_values ?? 1, mx: c.max_values ?? 1, ph: truncate(c.placeholder || "", 100) || undefined };
    }),
  };
  return JSON.stringify(payload);
}

function defaultAppModal() {
  return { title: "Bewerbung", components: [{ id: "c1", custom_id: "app_ign", label: "Ingame Name", style: 1, required: true, kind: "text_input" }, { id: "c2", custom_id: "app_motivation", label: "Motivation", style: 2, required: true, kind: "text_input" }] };
}

function defaultPanelEmbed() {
  return { title: "Jetzt Bewerben", description: "Klicke auf den Button, um dich zu bewerben.", color: "#248046", fields: [], footer: { text: "Bewerbungssystem" }, image_url: "", thumbnail_url: "", timestamp: false, author: { name: "", icon_url: "" } };
}

function defaultReviewEmbed() {
  return { title: "Neue Bewerbung", description: "Von: {user}\nUser: {username}\n\n**Ingame Name:** {field:app_ign}\n**Motivation:** {field:app_motivation}", color: "#5865F2", fields: [], footer: { text: "Review" }, image_url: "", thumbnail_url: "", timestamp: true, author: { name: "", icon_url: "" } };
}

function defaultAppResponseState() {
  return { type: "text", text: "Deine Bewerbung ist eingegangen!", embed: { title: "Erfolg", description: "Bewerbung gesendet.", color: "#57F287", fields: [], footer: { text: "" }, image_url: "", thumbnail_url: "", timestamp: false, author: { name: "", icon_url: "" } } };
}

// ---------------- MAIN ----------------
export default function ApplicationsPage() {
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("panel"); 

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
  const [panelButtonStyle, setPanelButtonStyle] = useState("Primary");
  const [response, setResponse] = useState(defaultAppResponseState());
  const [reviewEmbed, setReviewEmbed] = useState(defaultReviewEmbed());

  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [clientTime, setClientTime] = useState("");
  const [previewY, setPreviewY] = useState(0); 
  const [isDragging, setIsDragging] = useState(false); 
  const dragStartRef = useRef(0);

  useEffect(() => {
    setClientTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  const handleDragStart = (e) => {
    setIsDragging(true); 
    dragStartRef.current = e.clientY - previewY;
    document.body.style.userSelect = "none"; 
  };

  const handleDragMove = useCallback((e) => {
    if (typeof window === 'undefined') return;
    let newY = e.clientY - dragStartRef.current;
    const windowHeight = window.innerHeight;
    const startPos = (windowHeight / 2) + 120;
    const maxUp = 80 - startPos; 
    const maxDown = windowHeight - 50 - startPos;
    if (newY < maxUp) newY = maxUp;
    if (newY > maxDown) newY = maxDown;
    setPreviewY(newY);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false); 
    document.body.style.userSelect = ""; 
  }, []);

  useEffect(() => {
    if (isDragging) {
        window.addEventListener("mousemove", handleDragMove);
        window.addEventListener("mouseup", handleDragEnd);
    } else {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
    }
    return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const flashFormMsg = useCallback((msg) => {
    setFormMsg(msg);
    setTimeout(() => setFormMsg(""), 2500);
  }, []);

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
        const s = await sRes.json();
        setSettings(s);

        if (cRes.ok) setChannels(await cRes.json());
        if (rRes.ok) setRoles(await rRes.json());

        if (gRes.ok) {
          const all = await gRes.json();
          setCurrentGuild(all.find((x) => x.id === guildId));
        }
        if (appRes.ok) setApplications(await appRes.json());
        if (statRes.ok) setStats(await statRes.json());

        setPanelEmbed(s.appPanelEmbed || defaultPanelEmbed());
        setPanelButtonText(s.appPanelButtonText || "Bewerben");
        setPanelButtonStyle(s.appPanelButtonStyle || "Primary");

        const loadedModalRaw = s.applicationForm?.builderData?.modal;
        const loadedModal = ensureModalObject(loadedModalRaw);
        if (loadedModal) setModal(loadedModal);

        if (s.appResponse) {
          if (s.appResponse.mode === "text") {
            setResponse((r) => ({ ...r, type: "text", text: s.appResponse.content || "" }));
          } else if (s.appResponse.mode === "embed") {
            setResponse((r) => ({
              ...r,
              type: "embed",
              text: s.appResponse.content || "",
              embed: s.appResponse.embed || r.embed,
            }));
          }
        }

        setReviewEmbed(s.appReviewEmbed || defaultReviewEmbed());
      } catch (e) {
        setLoadError(e?.message || "Fehler");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [guildId]);

  const guildIconUrl = useMemo(() => {
    if (!currentGuild?.icon) return "https://cdn.discordapp.com/embed/avatars/0.png";
    return `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`;
  }, [currentGuild]);

  async function handleSave() {
    if (!settings) return;

    setSaving(true);
    try {
      if (editorTab === "config") {
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (r.ok) flashFormMsg("Konfiguration gespeichert ✅");
        else throw new Error();
      }

      if (editorTab === "panel") {
        const pl = {
          ...settings,
          appPanelEmbed: sanitizeEmbedForSave(panelEmbed),
          appPanelButtonText: panelButtonText,
          appPanelButtonStyle: panelButtonStyle,
        };
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pl),
        });
        if (r.ok) {
          setSettings(pl);
          flashFormMsg("Panel gespeichert ✅");
        } else throw new Error();
      }

      if (editorTab === "modal") {
        const botCode = buildAppBotCode(modal);
        const pl = {
          ...settings,
          applicationForm: {
            mode: "custom",
            version: 1,
            botCode,
            builderData: { modal },
          },
        };
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pl),
        });
        if (r.ok) {
          setSettings(pl);
          flashFormMsg("Formular gespeichert ✅");
        } else throw new Error();
      }

      if (editorTab === "response") {
        const appResponse =
          response.type === "embed"
            ? { mode: "embed", content: response.text || "", embed: sanitizeEmbedForSave(response.embed || {}) }
            : { mode: "text", content: response.text || "" };

        const pl = { ...settings, appResponse };
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pl),
        });
        if (r.ok) {
          setSettings(pl);
          flashFormMsg("Antwort gespeichert ✅");
        } else throw new Error();
      }

      if (editorTab === "review") {
        const pl = { ...settings, appReviewEmbed: sanitizeEmbedForSave(reviewEmbed) };
        const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pl),
        });
        if (r.ok) {
          setSettings(pl);
          flashFormMsg("Review Embed gespeichert ✅");
        } else throw new Error();
      }
    } catch {
      flashFormMsg("Fehler beim Speichern ❌");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Bist du sicher? Dies setzt den aktuellen Bereich zurück.")) return;

    if (editorTab === "panel") {
      setPanelEmbed(defaultPanelEmbed());
      setPanelButtonText("Bewerben");
      setPanelButtonStyle("Primary");
      flashFormMsg("Panel zurückgesetzt (nicht gespeichert) ✅");
    } else if (editorTab === "modal") {
      setModal(defaultAppModal());
      flashFormMsg("Formular zurückgesetzt (nicht gespeichert) ✅");
    } else if (editorTab === "response") {
      setResponse(defaultAppResponseState());
      flashFormMsg("Antwort zurückgesetzt (nicht gespeichert) ✅");
    } else if (editorTab === "review") {
      setReviewEmbed(defaultReviewEmbed());
      flashFormMsg("Review Embed zurückgesetzt (nicht gespeichert) ✅");
    } else {
      flashFormMsg("Nichts zurückzusetzen (Konfiguration) ⚠️");
    }
  }
  
  if (loadError) return <div className="p-8 text-red-400">Fehler: {loadError}</div>;

  return (
    <div className="p-2 sm:p-6 xl:p-10 mx-auto w-full max-w-[1920px] space-y-8 font-sans transition-colors duration-300">
      <style jsx global>{`
        .discord-md strong { font-weight: 700; color: inherit; }
        .discord-md .inlinecode {
          background: rgba(var(--muted), 0.5);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 px-2 lg:px-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* TITEL & BESCHREIBUNG - Hier ist das Padding (pl-14) für Mobile */}
            <div className="pl-8 lg:pl-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <Inbox className="w-8 h-8 text-primary" />
                    Bewerbungssystem
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Verwalte Bewerbungen, erstelle das Formular und lege Regeln fest.</p>
            </div>

            {/* TABS / BUTTONS - FIX: w-full entfernt, w-fit hinzugefügt */}
            {/* BUTTONS - Jetzt Full Width mit gleichmäßig breiten Buttons */}
<div className="bg-card p-1 rounded-lg border border-border shadow-sm flex gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
    <button
        onClick={() => setActiveTab("overview")}
        disabled={loading}
        className={cn(
            "flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap",
            activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            loading && "opacity-50 cursor-not-allowed"
        )}
    >
        <BarChart3 className="w-4 h-4" /> Übersicht
    </button>
    <button
        onClick={() => setActiveTab("settings")}
        disabled={loading}
        className={cn(
            "flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            loading && "opacity-50 cursor-not-allowed"
        )}
    >
        <Settings2 className="w-4 h-4" /> Konfiguration
    </button>
</div>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 px-2 sm:px-0">
          
          {/* STATS KARTEN */}
          {/* FIX: 'px-2 sm:px-0' entfernt. Jetzt nutzt es die volle Breite des Eltern-Containers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatsCard title="Gesamt" value={stats.total} icon={Inbox} colorClass="text-blue-500" loading={loading} />
            <StatsCard title="Offen" value={stats.pending} icon={History} colorClass="text-yellow-400" loading={loading} />
            <StatsCard title="Angenommen" value={stats.accepted} icon={CheckCircle2} colorClass="text-green-400" loading={loading} />
            <StatsCard title="Abgelehnt" value={stats.declined} icon={XCircle} colorClass="text-red-400" loading={loading} />
          </div>

          {/* LISTE DER BEWERBUNGEN */}
<Card className="bg-card border-border shadow-sm min-h-[350px] flex flex-col h-[calc(100vh-380px)] overflow-hidden">
  {/* Header: Padding reduziert auf py-3 px-4, Border dezenter */}
  <CardHeader className="border-b border-border/50 py-1 px-4 flex flex-row items-center justify-between space-y-0">
    <CardTitle className="text-foreground text-sm font-bold flex items-center gap-2 uppercase tracking-wider opacity-80">
      <History className="w-4 h-4 text-primary" /> Letzte Bewerbungen
    </CardTitle>
    {/* Optional: Hier könnte ein kleiner Badge mit der Anzahl hin */}
    {!loading && applications.length > 0 && (
      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
        {applications.length}
      </span>
    )}
  </CardHeader>

  {/* Content: pt-2 reicht aus, da der Header schon Padding hat */}
  <CardContent className="space-y-0.5 pt-2 px-2 flex-1 overflow-y-auto custom-scrollbar">
    {loading ? (
      /* Skeleton: bündig mit den echten Items */
      [...Array(6)].map((_, i) => (
        <div key={i} className="w-full flex items-center justify-between p-2.5 rounded-md mb-1">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full bg-muted/50 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded bg-muted/50" />
              <Skeleton className="h-2 w-12 rounded bg-muted/30" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded bg-muted/50" />
        </div>
      ))
    ) : (
      <>
        {(applications || []).slice(0, 50).map((app) => (
          <div
            key={app._id}
            className="group w-full flex items-center justify-between p-2.5 rounded-md border border-transparent hover:bg-muted/30 hover:border-border/20 transition-all duration-200 mb-0.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img 
                  alt="" 
                  src={app.userAvatar || guildIconUrl} 
                  className="w-8 h-8 rounded-full bg-muted object-cover ring-1 ring-border/20" 
                />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                  app.status === "accepted" ? "bg-green-500" :
                  app.status === "declined" ? "bg-red-500" : "bg-yellow-500"
                )} />
              </div>

              <div className="min-w-0">
                <div className="text-foreground font-medium text-sm group-hover:text-primary transition-colors truncate">
                  {app.username || app.userId}
                </div>
                <div className="text-muted-foreground text-[10px] flex items-center gap-1 opacity-70">
                  <CalendarDays className="w-3 h-3" />
                  <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className={cn(
              "text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm tracking-tighter shadow-sm shrink-0 border",
              app.status === "accepted"
                ? "bg-green-500/5 text-green-500 border-green-500/20"
                : app.status === "declined"
                ? "bg-red-500/5 text-red-500 border-red-500/20"
                : "bg-yellow-500/5 text-yellow-500 border-yellow-500/20"
            )}>
              {app.status || "pending"}
            </div>
          </div>
        ))}

        {(!applications || applications.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground/50 gap-2">
            <Inbox className="w-8 h-8 opacity-20" />
            <p className="text-xs font-medium uppercase tracking-widest">Leer</p>
          </div>
        )}
      </>
    )}
  </CardContent>
</Card>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && settings && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col xl:flex-row w-full items-start gap-8 relative">
            <div className="w-full xl:flex-1 min-w-0 transition-all duration-500 ease-in-out">
              
              <Card className="bg-card border-border shadow-sm rounded-lg flex flex-col z-10 relative w-full transition-all duration-500 ease-in-out">
                <div className="bg-muted/30 border-b border-border px-6 pt-4 pb-0 flex flex-col gap-4 rounded-t-lg">
                   {/* ... Header Content ... */}
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-foreground text-lg font-bold flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-primary" /> Konfiguration & Design
                    </CardTitle>

                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                      {formMsg && <span className="text-xs text-muted-foreground">{formMsg}</span>}

                      <Button
                        disabled={saving}
                        onClick={handleReset}
                        variant="outline"
                        className="border-border bg-card hover:bg-muted/50 text-foreground flex-1 sm:flex-none"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                      </Button>

                      <Button
                        disabled={saving}
                        onClick={handleSave}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
                      >
                        <Save className="w-4 h-4 mr-2" /> Speichern
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm border-b border-border pb-2 overflow-x-auto no-scrollbar">
                    {['config', 'panel', 'modal', 'response', 'review'].map((tab) => (
                        <button
                        key={tab}
                        onClick={() => setEditorTab(tab)}
                        className={cn("pb-2 transition-colors capitalize shrink-0", editorTab === tab ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
                        >
                        {tab === 'config' ? 'Konfiguration' : tab === 'modal' ? 'Formular' : tab === 'response' ? 'Antwort' : tab + ' Design'}
                        </button>
                    ))}
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6 min-h-[500px]">
                  {editorTab === "config" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <CollapsibleSection title="Kanäle & Rollen" icon={FolderOpen}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <ChannelSelect label="Panel Channel" value={settings.appPanelChannelId || ""} onChange={(v) => setSettings({ ...settings, appPanelChannelId: v })} channels={channels} placeholder="Wähle Channel…" />
                          <ChannelSelect label="Review Channel" value={settings.appReviewChannelId || ""} onChange={(v) => setSettings({ ...settings, appReviewChannelId: v })} channels={channels} placeholder="Wähle Channel…" />
                          <RoleSelect label="Applicant Role" value={settings.applicantRoleId || ""} onChange={(v) => setSettings({ ...settings, applicantRoleId: v })} roles={roles} placeholder="Wähle Rolle…" />
                          <RoleSelect label="Staff Role" value={settings.appStaffRoleId || ""} onChange={(v) => setSettings({ ...settings, appStaffRoleId: v })} roles={roles} placeholder="Wähle Rolle…" />
                        </div>
                      </CollapsibleSection>
                      <CollapsibleSection title="Cooldown" icon={History}>
                        <div className="space-y-2">
                          <Label className="text-[11px] text-muted-foreground uppercase font-bold">Cooldown Tage nach Ablehnung</Label>
                          <Input type="number" min={0} value={settings.appDeclineCooldownDays ?? 7} onChange={(e) => setSettings({ ...settings, appDeclineCooldownDays: Number(e.target.value) })} className="bg-muted/30 border-input text-foreground focus-visible:ring-primary" />
                        </div>
                      </CollapsibleSection>
                    </div>
                  )}

                  {editorTab === "panel" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <CollapsibleSection title="Button Konfiguration" icon={Palette}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-[11px] text-muted-foreground uppercase font-bold">Button Text</Label>
                            <Input value={panelButtonText || ""} onChange={(e) => setPanelButtonText(e.target.value)} placeholder="Standard" className="bg-muted/30 border-input text-foreground focus-visible:ring-primary" />
                          </div>
                          <DiscordSelect label="Button Farbe" value={panelButtonStyle || "Primary"} onChange={setPanelButtonStyle} options={[{ label: "Primary (Blurple)", value: "Primary" }, { label: "Secondary (Grey)", value: "Secondary" }, { label: "Success (Green)", value: "Success" }, { label: "Danger (Red)", value: "Danger" }]} placeholder="Style wählen..." icon={Palette} />
                        </div>
                        <div className="pt-2">
                          <Label className="text-muted-foreground text-xs">Vorschau (Button)</Label>
                          <div className="mt-2 inline-flex"><DiscordButton label={panelButtonText || "Bewerben"} style={panelButtonStyle} /></div>
                        </div>
                      </CollapsibleSection>
                      <EmbedBuilder data={panelEmbed} onChange={setPanelEmbed} hiddenSections={["author", "fields"]} />
                    </div>
                  )}

                  {editorTab === "modal" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-end"><VariableDropdown modal={modal} /></div>
                      <ModalBuilder data={modal} onChange={setModal} />
                    </div>
                  )}

                  {editorTab === "response" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-border pb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Nachrichtentyp</span>
                          <div className="flex bg-muted/30 p-1 rounded-md border border-border w-full sm:w-auto">
                            <button onClick={() => setResponse((r) => ({ ...r, type: "text" }))} className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2", response.type === "text" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Type className="w-3 h-3" /> Text</button>
                            <button onClick={() => setResponse((r) => ({ ...r, type: "embed" }))} className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2", response.type === "embed" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><LayoutTemplate className="w-3 h-3" /> Embed</button>
                          </div>
                        </div>
                        <div className="w-full xl:w-auto"><VariableDropdown modal={modal} /></div>
                      </div>
                      <CollapsibleSection title="Bot Antwort" icon={MessageSquare}>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider pl-0.5">Content (optional)</Label>
                          <textarea value={response.text || ""} onChange={(e) => setResponse((r) => ({ ...r, text: e.target.value }))} className="w-full h-32 bg-muted/30 border border-input rounded-md text-foreground p-4 text-sm resize-none focus-visible:ring-primary" placeholder="Schreibe etwas..." />
                        </div>
                        {response.type === "embed" && (<div className="pt-6"><EmbedBuilder data={response.embed} onChange={(v) => setResponse((r) => ({ ...r, embed: v }))} /></div>)}
                      </CollapsibleSection>
                    </div>
                  )}

                  {editorTab === "review" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-end"><VariableDropdown modal={modal} /></div>
                      <CollapsibleSection title="Review Nachricht (Embed)" icon={ShieldCheck} defaultOpen><EmbedBuilder data={reviewEmbed} onChange={setReviewEmbed} /></CollapsibleSection>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className={cn("shrink-0 transition-all duration-500 ease-in-out hidden xl:block", editorTab === "config" || isPreviewMinimized ? "w-0" : "w-[600px]")} />
          </div>
          
          {/* LIVE PREVIEW CONTAINER */}
          <div style={{ top: isPreviewMinimized ? "-9999px" : `calc(50% + ${120 + previewY}px)` }} className={cn("hidden xl:block fixed -translate-y-1/2 right-10 w-[600px] z-50 origin-top-right scale-[0.85]", isDragging ? "transition-none" : "transition-all duration-300 ease-in-out", editorTab === "config" && !isPreviewMinimized ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100")}>
            <div className="bg-card border border-border rounded-lg shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
              <div onMouseDown={handleDragStart} className="bg-muted/50 border-b border-border p-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
                <div className="flex items-center gap-2"><GripHorizontal className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Live Preview</span></div>
                <div className="flex gap-2">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{editorTab === "config" ? "Allgemein" : editorTab === "modal" ? "Formular" : editorTab === "response" ? "Bot Antwort" : editorTab === "review" ? "Review" : "Panel"}</span>
                    <button onClick={() => setIsPreviewMinimized(true)} className="text-muted-foreground hover:text-foreground transition-colors"><Minimize2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar bg-[#313338]">
                {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                {editorTab === "panel" && (<div className="bg-[#2b2d31] rounded-md p-4 transition-all duration-300 border border-black/10"><EmbedPreview embed={sanitizeEmbedForSave(panelEmbed)} content="" botName="Application System" botIconUrl={guildIconUrl}><div className="flex gap-2 flex-wrap mt-2"><DiscordButton label={panelButtonText || "Bewerben"} style={panelButtonStyle || "Primary"} /></div></EmbedPreview></div>)}
                {editorTab === "response" && (<div className="bg-[#2b2d31] rounded-md p-4 transition-all duration-300 border border-black/10">{response.type === "text" ? (<div className="flex gap-4 items-start"><img src={guildIconUrl} alt="Bot" className="w-10 h-10 rounded-full bg-[#1e1f22]" /><div className="min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-white font-medium">Application Bot</span><span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px]">BOT</span><span className="text-gray-400 text-xs">Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="text-[#dbdee1] whitespace-pre-wrap break-words text-[15px]">{response.text ? <DiscordMarkdown text={response.text} /> : <span className="text-gray-500 italic text-sm">Schreibe etwas...</span>}</div></div></div>) : <EmbedPreview embed={sanitizeEmbedForSave(response.embed)} content={response.text || ""} botName="Application Bot" botIconUrl={guildIconUrl} />}</div>)}
                {editorTab === "review" && (<div className="bg-[#2b2d31] rounded-md p-4 transition-all duration-300 border border-black/10"><EmbedPreview embed={sanitizeEmbedForSave(reviewEmbed)} content="" botName="Application Bot" botIconUrl={guildIconUrl}><div className="flex gap-2 flex-wrap mt-2"><DiscordButton label="Annehmen" style="Success" /><DiscordButton label="Ablehnen" style="Danger" /></div></EmbedPreview></div>)}
                {editorTab === "config" && <div className="text-center py-20 text-gray-500 italic text-sm">Einstellungen...</div>}
              </div>
            </div>
          </div>

          {isPreviewMinimized && <button onClick={() => setIsPreviewMinimized(false)} className="hidden xl:flex fixed right-6 bottom-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground w-14 h-14 rounded-full shadow-2xl items-center justify-center transition-transform hover:scale-110" title="Vorschau anzeigen"><Maximize2 className="w-6 h-6" /></button>}
          
          {editorTab !== "config" && <button onClick={() => setShowMobilePreview(true)} className="xl:hidden fixed right-4 bottom-4 z-40 bg-primary hover:bg-primary/90 text-primary-foreground w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"><Eye className="w-6 h-6" /></button>}
            {showMobilePreview && (
              <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-card border border-border w-full max-w-md max-h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                    <h3 className="text-foreground font-bold text-sm uppercase">Vorschau</h3>
                    <button onClick={() => setShowMobilePreview(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 overflow-y-auto custom-scrollbar bg-[#313338]">
                    {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                    {editorTab === "response" && (<div className="bg-[#313338]">{response.type === "text" ? (<div className="flex gap-3 group items-start"><img src={guildIconUrl} className="w-8 h-8 rounded-full bg-[#1e1f22]" /><div><div className="flex items-center gap-2"><span className="text-white font-bold text-sm">App Bot</span><span className="bg-[#5865F2] text-[10px] text-white px-1 rounded">BOT</span></div><div className="text-gray-200 text-sm mt-1 whitespace-pre-wrap"><DiscordMarkdown text={response.text || "..."} /></div></div></div>) : <EmbedPreview embed={response.embed} content={response.content} botName="App Bot" botIconUrl={guildIconUrl} />}</div>)}
                    {editorTab === "panel" && (<div className="bg-[#313338]"><EmbedPreview embed={panelEmbed} content="" botName="App System" botIconUrl={guildIconUrl}><div className="flex gap-2 flex-wrap mt-2"><DiscordButton label={panelButtonText || "Bewerben"} style={panelButtonStyle} /></div></EmbedPreview></div>)}
                  </div>
                </div>
              </div>
            )}

        </div>
      )}
    </div>
  );
}