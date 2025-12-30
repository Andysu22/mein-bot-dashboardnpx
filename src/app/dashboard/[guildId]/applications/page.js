"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { XCircle } from "lucide-react";


function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

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

// ✅ URL Normalisierung für Zod + damit Next nicht /dashboard/... als Route versucht
function normalizeUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  // akzeptiere http/https
  if (/^https?:\/\//i.test(s)) return s;
  // wenn user "dummyimage.com/..." eingibt -> https:// davor
  return `https://${s}`;
}

function sanitizeEmbedForSave(embed) {
  const e = embed ? { ...embed } : {};

  if (typeof e.timestamp !== "boolean") {
    // manche Builder geben "true"/"false" als string
    if (e.timestamp === "true") e.timestamp = true;
    else if (e.timestamp === "false") e.timestamp = false;
    else e.timestamp = false;
  }

  // URLs normalisieren (sonst Zod invalid_format url)
  if ("image_url" in e) e.image_url = normalizeUrl(e.image_url);
  if ("thumbnail_url" in e) e.thumbnail_url = normalizeUrl(e.thumbnail_url);
  if (e.author?.icon_url) e.author = { ...e.author, icon_url: normalizeUrl(e.author.icon_url) };

  // Fields/Strings unverändert lassen
  return e;
}

// ---------------- defaults ----------------
function defaultAppModal() {
  return {
    title: "Bewerbung",
    components: [
      { id: "c1", custom_id: "app_ign", label: "Ingame Name", style: 1, required: true, kind: "text_input" },
      { id: "c2", custom_id: "app_motivation", label: "Motivation", style: 2, required: true, kind: "text_input" },
    ],
  };
}

function defaultPanelEmbed() {
  return {
    title: "Jetzt Bewerben",
    description: "Klicke auf den Button, um dich zu bewerben.",
    color: "#248046",
    fields: [],
    footer: { text: "Bewerbungssystem" },
    image_url: "",
    thumbnail_url: "",
    timestamp: false,
    author: { name: "", icon_url: "" },
  };
}

function defaultReviewEmbed() {
  return {
    title: "Neue Bewerbung",
    description:
      "Von: {user}\nUser: {username}\n\n**Ingame Name:** {field:app_ign}\n**Motivation:** {field:app_motivation}",
    color: "#5865F2",
    fields: [],
    footer: { text: "Review" },
    image_url: "",
    thumbnail_url: "",
    timestamp: true,
    author: { name: "", icon_url: "" },
  };
}

function defaultAppResponseState() {
  return {
    type: "text", // "text" | "embed"
    text: "Deine Bewerbung ist eingegangen!",
    embed: {
      title: "Erfolg",
      description: "Bewerbung gesendet.",
      color: "#57F287",
      fields: [],
      footer: { text: "" },
      image_url: "",
      thumbnail_url: "",
      timestamp: false,
      author: { name: "", icon_url: "" },
    },
  };
}

// BotCode Generator
function truncate(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
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
        return {
          ...base,
          s: c.style === "paragraph" || c.style === 2 ? 2 : 1,
          ph: truncate(c.placeholder || "", 100) || undefined,
          mx: 4000,
        };
      }

      if (c.kind === "string_select") {
        return {
          ...base,
          ph: truncate(c.placeholder || "", 100) || undefined,
          mn: c.min_values ?? 1,
          mxv: c.max_values ?? 1,
          o: (c.options || []).slice(0, 25).map((o) => ({
            l: truncate(o.label || "Option", 100),
            v: truncate(o.value || "value", 100),
            d: truncate(o.description || "", 100) || undefined,
            e: o.emoji || undefined,
          })),
        };
      }

      return {
        ...base,
        mn: c.min_values ?? 1,
        mx: c.max_values ?? 1,
        ph: truncate(c.placeholder || "", 100) || undefined,
      };
    }),
  };

  return JSON.stringify(payload);
}

// ---------------- UI HELPERS ----------------
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="p-5 space-y-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

function DiscordButton({ label, style = "Primary" }) {
  const styles = {
    Primary: "bg-[#5865F2]",
    Secondary: "bg-[#4e5058]",
    Success: "bg-[#248046]",
    Danger: "bg-[#da373c]",
  };
  return (
    <div className={cn(styles[style] || styles.Primary, "h-[32px] px-[16px] rounded-[3px] text-white text-[14px] font-medium flex items-center justify-center select-none")}>
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
      <Label className="text-gray-400 text-[11px] uppercase font-bold tracking-wider pl-0.5">{label}</Label>
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-[#1e1f22] border border-black/20 text-gray-200 rounded-sm px-3 py-2 text-sm cursor-pointer flex items-center justify-between",
            isOpen ? "border-[#5865F2]" : ""
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {Icon && <Icon className="w-4 h-4 text-gray-500" />}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {isOpen && (
          <div className="absolute z-[9999] w-full bg-[#2b2d31] border border-[#5865F2] shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="px-3 py-2 text-sm text-gray-300 hover:bg-[#35373c] hover:text-white cursor-pointer"
              >
                {opt.label}
              </div>
            ))}
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

// ✅ Variables copy stable
function VariableDropdown({ modal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const containerRef = useRef(null);

  const standardVars = [
    { value: "{user}", desc: "User Mention" },
    { value: "{username}", desc: "Username" },
    { value: "{server}", desc: "Server Name" },
  ];

  const formVars = (modal?.components || []).map((c) => ({
    value: `{field:${c.custom_id || "unknown"}}`,
    desc: c.label || "Feld",
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
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider h-9 min-w-[140px] justify-between",
          copyFeedback
            ? "bg-green-500/10 border-green-500/50 text-green-400"
            : "bg-[#111214] border-white/10 text-gray-300 hover:border-[#5865F2] hover:text-white"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {copyFeedback ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
          <span className="truncate">{copyFeedback ? "Kopiert!" : "Variablen"}</span>
        </div>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-[300px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl p-1 max-h-[350px] overflow-y-auto custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-[#111214]">Standard</div>
          <div className="p-1 space-y-0.5">
            {standardVars.map((v) => (
              <button
                key={v.value}
                onClick={() => handleCopy(v.value)}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#5865F2] hover:text-white text-xs text-gray-300 font-mono flex items-center justify-between"
              >
                <span>{v.value}</span>
                <span className="text-[10px] text-gray-400">{v.desc}</span>
              </button>
            ))}
          </div>

          {formVars.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase bg-[#111214] mt-1">
                Formular Felder
              </div>
              <div className="p-1 space-y-0.5">
                {formVars.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => handleCopy(v.value)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#5865F2] hover:text-white text-xs text-gray-300 font-mono flex items-center justify-between"
                  >
                    <span className="truncate max-w-[180px]">{v.value}</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{v.desc}</span>
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

function StatsCard({ title, value, icon: Icon, colorClass = "text-white" }) {
  return (
    <Card className="bg-[#111214] border-white/10 shadow-sm flex items-center p-4 gap-4 rounded-lg">
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

// ---------------- main ----------------
export default function ApplicationsPage() {
  const { guildId } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [editorTab, setEditorTab] = useState("panel"); // config|panel|modal|response|review

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
  const [previewY, setPreviewY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef(0);

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

  // drag preview
  const handleDragStart = (e) => {
    setIsDragging(true);
    dragOffsetRef.current = e.clientY - previewY;
  };
  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const newY = e.clientY - dragOffsetRef.current;
      setPreviewY(Math.max(-250, Math.min(250, newY)));
    },
    [isDragging, previewY]
  );
  const handleDragEnd = useCallback(() => setIsDragging(false), []);
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

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

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400 animate-pulse">Lade...</div>;
  if (loadError) return <div className="p-8 text-red-400">Fehler: {loadError}</div>;

  return (
    <div className="p-2 sm:p-6 xl:p-10 mx-auto w-full max-w-[1920px] space-y-8 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Inbox className="w-8 h-8 text-[#5865F2]" />
            Bewerbungssystem
          </h1>
          <p className="text-gray-400 text-sm mt-1">Verwalte Bewerbungen, erstelle das Formular und lege Regeln fest.</p>
        </div>

        <div className="bg-[#111214] p-1 rounded-lg border border-white/10 shadow-sm flex gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "overview" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Übersicht
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              activeTab === "settings" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings2 className="w-4 h-4" /> Konfiguration
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard title="Gesamt" value={stats.total} icon={Inbox} />
            <StatsCard title="Offen" value={stats.pending} icon={History} colorClass="text-yellow-400" />
            <StatsCard title="Angenommen" value={stats.accepted} icon={CheckCircle2} colorClass="text-green-400" />
            <StatsCard title="Abgelehnt" value={stats.declined} icon={XCircle} colorClass="text-red-400" />

          </div>

          <Card className="bg-[#111214] border-white/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-[#5865F2]" /> Letzte Bewerbungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(applications || []).slice(0, 15).map((app) => (
                <div
                  key={app._id}
                  className="w-full flex items-center justify-between p-3 rounded-md bg-[#1e1f22] border border-white/5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <img alt="" src={app.userAvatar || guildIconUrl} className="w-9 h-9 rounded-full" />
                    <div>
                      <div className="text-white font-semibold text-sm">{app.username || app.userId}</div>
                      <div className="text-gray-500 text-xs">{new Date(app.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-xs font-bold uppercase px-2 py-1 rounded",
                      app.status === "accepted"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : app.status === "declined"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                    )}
                  >
                    {app.status || "pending"}
                  </div>
                </div>
              ))}

              {(!applications || applications.length === 0) && (
                <div className="text-sm text-gray-500 py-8 text-center">Noch keine Bewerbungen vorhanden.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SETTINGS + LIVE PREVIEW */}
      {activeTab === "settings" && settings && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <Card className="bg-[#111214] border-white/10 shadow-sm">
                <CardHeader className="space-y-4">
                  {/* ✅ wirklich rechtsbündig */}
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-[#5865F2]" /> Konfiguration & Design
                    </CardTitle>

                    <div className="flex items-center gap-2 ml-auto">
                      {formMsg && <span className="text-xs text-gray-400">{formMsg}</span>}

                      <Button
                        disabled={saving}
                        onClick={handleReset}
                        variant="outline"
                        className="border-white/10 bg-[#1e1f22] hover:bg-[#232428] text-gray-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                      </Button>

                      <Button
                        disabled={saving}
                        onClick={handleSave}
                        className="bg-[#5865F2] hover:bg-[#4752c4] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" /> Speichern
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-6 text-sm border-b border-white/5 pb-2">
                    <button
                      onClick={() => setEditorTab("config")}
                      className={cn("pb-2 transition-colors", editorTab === "config" ? "text-white border-b-2 border-[#5865F2]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Konfiguration
                    </button>
                    <button
                      onClick={() => setEditorTab("panel")}
                      className={cn("pb-2 transition-colors", editorTab === "panel" ? "text-white border-b-2 border-[#5865F2]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Panel Design
                    </button>
                    <button
                      onClick={() => setEditorTab("modal")}
                      className={cn("pb-2 transition-colors", editorTab === "modal" ? "text-white border-b-2 border-[#5865F2]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Formular
                    </button>
                    <button
                      onClick={() => setEditorTab("response")}
                      className={cn("pb-2 transition-colors", editorTab === "response" ? "text-white border-b-2 border-[#5865F2]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Antwort
                    </button>
                    <button
                      onClick={() => setEditorTab("review")}
                      className={cn("pb-2 transition-colors", editorTab === "review" ? "text-white border-b-2 border-[#5865F2]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Review
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {editorTab === "config" && (
                    <div className="space-y-6">
                      <CollapsibleSection title="Kanäle & Rollen" icon={FolderOpen}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <ChannelSelect
                            label="Panel Channel"
                            value={settings.appPanelChannelId || ""}
                            onChange={(v) => setSettings({ ...settings, appPanelChannelId: v })}
                            channels={channels}
                            placeholder="Wähle Channel…"
                          />
                          <ChannelSelect
                            label="Review Channel"
                            value={settings.appReviewChannelId || ""}
                            onChange={(v) => setSettings({ ...settings, appReviewChannelId: v })}
                            channels={channels}
                            placeholder="Wähle Channel…"
                          />
                          <RoleSelect
                            label="Applicant Role"
                            value={settings.applicantRoleId || ""}
                            onChange={(v) => setSettings({ ...settings, applicantRoleId: v })}
                            roles={roles}
                            placeholder="Wähle Rolle…"
                          />
                          <RoleSelect
                            label="Staff Role"
                            value={settings.appStaffRoleId || ""}
                            onChange={(v) => setSettings({ ...settings, appStaffRoleId: v })}
                            roles={roles}
                            placeholder="Wähle Rolle…"
                          />
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection title="Cooldown" icon={History}>
                        <div className="space-y-2">
                          <Label className="text-[11px] text-gray-400 uppercase font-bold">
                            Cooldown Tage nach Ablehnung
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={settings.appDeclineCooldownDays ?? 7}
                            onChange={(e) => setSettings({ ...settings, appDeclineCooldownDays: Number(e.target.value) })}
                            className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2]"
                          />
                        </div>
                      </CollapsibleSection>
                    </div>
                  )}

                  {editorTab === "panel" && (
                    <div className="space-y-6">
                      <CollapsibleSection title="Button Konfiguration" icon={Palette}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label className="text-[11px] text-gray-400 uppercase font-bold">Button Text</Label>
                            <Input
                              value={panelButtonText || ""}
                              onChange={(e) => setPanelButtonText(e.target.value)}
                              placeholder="Standard"
                              className="bg-[#111214] border-white/10 text-white focus-visible:ring-[#5865F2]"
                            />
                          </div>

                          <DiscordSelect
                            label="Button Farbe"
                            value={panelButtonStyle || "Primary"}
                            onChange={setPanelButtonStyle}
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

                        <div className="pt-2">
                          <Label className="text-gray-500 text-xs">Vorschau (Button)</Label>
                          <div className="mt-2 inline-flex">
                            <DiscordButton label={panelButtonText || "Bewerben"} style={panelButtonStyle} />
                          </div>
                        </div>
                      </CollapsibleSection>

                      <EmbedBuilder data={panelEmbed} onChange={setPanelEmbed} hiddenSections={["author", "fields"]} />
                      <div className="text-xs text-gray-500">
                        Tipp: Wenn du bei Bildern nur z.B. <span className="font-mono">dummyimage.com/...</span> eingibst,
                        wird beim Speichern automatisch <span className="font-mono">https://</span> ergänzt.
                      </div>
                    </div>
                  )}

                  {editorTab === "modal" && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <VariableDropdown modal={modal} />
                      </div>
                      <ModalBuilder data={modal} onChange={setModal} />
                    </div>
                  )}

                  {editorTab === "response" && (
                    <div className="space-y-6">
                      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-white/5 pb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Nachrichtentyp</span>
                          <div className="flex bg-[#16171a] p-1 rounded-md border border-white/10 w-full sm:w-auto">
                            <button
                              onClick={() => setResponse((r) => ({ ...r, type: "text" }))}
                              className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2",
                                response.type === "text" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <Type className="w-3 h-3" /> Text
                            </button>
                            <button
                              onClick={() => setResponse((r) => ({ ...r, type: "embed" }))}
                              className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2",
                                response.type === "embed" ? "bg-[#5865F2] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <LayoutTemplate className="w-3 h-3" /> Embed
                            </button>
                          </div>
                        </div>

                        <div className="w-full xl:w-auto">
                          <VariableDropdown modal={modal} />
                        </div>
                      </div>

                      <CollapsibleSection title="Bot Antwort" icon={MessageSquare}>
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-[11px] uppercase font-bold tracking-wider pl-0.5">
                            Content (optional)
                          </Label>
                          <textarea
                            value={response.text || ""}
                            onChange={(e) => setResponse((r) => ({ ...r, text: e.target.value }))}
                            className="w-full h-32 bg-[#111214] border border-white/10 rounded-md text-white p-4 text-sm resize-none focus-visible:ring-[#5865F2]"
                            placeholder="Schreibe etwas..."
                          />
                        </div>

                        {response.type === "embed" && (
                          <div className="pt-6">
                            <EmbedBuilder
                              data={response.embed}
                              onChange={(v) => setResponse((r) => ({ ...r, embed: v }))}
                            />
                          </div>
                        )}
                      </CollapsibleSection>
                    </div>
                  )}

                  {editorTab === "review" && (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <VariableDropdown modal={modal} />
                      </div>
                      <CollapsibleSection title="Review Nachricht (Embed)" icon={ShieldCheck} defaultOpen>
                        <EmbedBuilder data={reviewEmbed} onChange={setReviewEmbed} />
                      </CollapsibleSection>
                      <div className="text-xs text-gray-500">
                        Nutze <span className="font-mono">{`{field:custom_id}`}</span> wie bei Tickets, z.B.{" "}
                        <span className="font-mono">{`{field:app_motivation}`}</span>.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className={cn("shrink-0 transition-all duration-500 ease-in-out hidden xl:block", editorTab === "config" || isPreviewMinimized ? "w-0" : "w-[600px]")} />
          </div>

          {/* LIVE PREVIEW */}
          <div
            style={{ top: isPreviewMinimized ? "-9999px" : `calc(50% + ${120 + previewY}px)` }}
            className={cn(
              "hidden xl:block fixed -translate-y-1/2 right-10 w-[600px] z-50 origin-top-right scale-[0.85]",
              isDragging ? "transition-none" : "transition-all duration-300 ease-in-out",
              editorTab === "config" && !isPreviewMinimized ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
            )}
          >
            <div className="bg-[#111214] border border-white/10 rounded-lg shadow-2xl ring-1 ring-white/5 overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
              <div
                onMouseDown={(e) => {
                  setIsDragging(true);
                  dragOffsetRef.current = e.clientY - previewY;
                }}
                className="bg-[#1e1f22] border-b border-white/5 p-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2">
                  <GripHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Live Preview</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">
                    {editorTab === "config"
                      ? "Allgemein"
                      : editorTab === "modal"
                      ? "Formular"
                      : editorTab === "response"
                      ? "Bot Antwort"
                      : editorTab === "review"
                      ? "Review"
                      : "Panel"}
                  </span>
                  <button onClick={() => setIsPreviewMinimized(true)} className="text-gray-500 hover:text-white transition-colors">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                className="p-5 overflow-y-auto custom-scrollbar"
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  const newY = e.clientY - dragOffsetRef.current;
                  setPreviewY(Math.max(-250, Math.min(250, newY)));
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}

                {editorTab === "panel" && (
                  <div className="bg-[#313338] rounded-md p-4">
                    <EmbedPreview
                      embed={sanitizeEmbedForSave(panelEmbed)} // ✅ preview sieht jetzt auch "richtige" urls/boolean timestamp
                      content=""
                      botName="Application System"
                      botIconUrl={guildIconUrl}
                    >
                      <div className="flex gap-2 flex-wrap mt-2">
                        <DiscordButton label={panelButtonText || "Bewerben"} style={panelButtonStyle || "Primary"} />
                      </div>
                    </EmbedPreview>
                  </div>
                )}

                {editorTab === "response" && (
                  <div className="bg-[#313338] rounded-md p-4">
                    {response.type === "text" ? (
                      <div className="flex gap-4 items-start">
                        <img src={guildIconUrl} alt="Bot" className="w-10 h-10 rounded-full bg-[#1e1f22]" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">Application Bot</span>
                            <span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px]">BOT</span>
                            <span className="text-gray-400 text-xs">
                              Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="text-[#dbdee1] whitespace-pre-wrap break-words text-[15px]">
                            {response.text ? <DiscordMarkdown text={response.text} /> : <span className="text-gray-500 italic text-sm">Schreibe etwas...</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmbedPreview
                        embed={sanitizeEmbedForSave(response.embed)}
                        content={response.text || ""}
                        botName="Application Bot"
                        botIconUrl={guildIconUrl}
                      />
                    )}
                  </div>
                )}

                {editorTab === "review" && (
                  <div className="bg-[#313338] rounded-md p-4">
                    <EmbedPreview
                      embed={sanitizeEmbedForSave(reviewEmbed)}
                      content=""
                      botName="Application Bot"
                      botIconUrl={guildIconUrl}
                    >
                      <div className="flex gap-2 flex-wrap mt-2">
                        <DiscordButton label="Annehmen" style="Success" />
                        <DiscordButton label="Ablehnen" style="Danger" />
                      </div>
                    </EmbedPreview>
                  </div>
                )}

                {editorTab === "config" && <div className="text-center py-20 text-gray-500 italic text-sm">Einstellungen...</div>}
              </div>
            </div>
          </div>

          {isPreviewMinimized && (
            <button
              onClick={() => setIsPreviewMinimized(false)}
              className="hidden xl:flex fixed right-6 bottom-6 z-50 bg-[#5865F2] hover:bg-[#4752C4] text-white w-14 h-14 rounded-full shadow-2xl items-center justify-center transition-transform hover:scale-110"
              title="Vorschau anzeigen"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
