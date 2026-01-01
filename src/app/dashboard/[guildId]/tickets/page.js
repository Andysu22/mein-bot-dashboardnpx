"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MessageSquare,
  Settings2,
  RefreshCw,
  Save,
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
  Minimize2,
  Maximize2,
  GripHorizontal,
  Eye,
  X,
  Copy,
  ArrowLeft,
  Send
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

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import ModalBuilder from "@/components/builders/modal/ModalBuilder";
import ModalPreview from "@/components/builders/modal/ModalPreview";
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";

import Link from "next/link";
// --- Helper Functions ---

function truncate(s, max) {
  const str = String(s ?? "");
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

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
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
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

// --- Variable Dropdown Helper ---
function VariableDropdown({ modal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null); 
  const containerRef = useRef(null);

  const standardVars = [
    { label: "User Mention", value: "{user}", desc: "Erwähnt den User (@User)" },
    { label: "Username", value: "{username}", desc: "Name des Users" },
    { label: "Server Name", value: "{server}", desc: "Name des Servers" },
    { label: "Channel Name", value: "{channel}", desc: "Aktueller Channel" },
    { label: "Ticket ID", value: "{ticket_id}", desc: "Nummer des Tickets (z.B. 004)" },
  ];

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

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch (err) {
      console.error("Copy failed", err);
      return false;
    }
  };

  const handleCopy = async (val) => {
    const success = await copyToClipboard(val);
    if (success) {
      setCopyFeedback(val);
      setIsOpen(false);
      setTimeout(() => setCopyFeedback(null), 2000);
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

  // 1. Kurzform (z.B. 9.9k)
  const formatCompactNumber = (num) => {
     if (typeof num !== "number") return num;
     if (num >= 1000000) return (Math.floor(num / 100000) / 10) + "m";
     if (num >= 1000) return (Math.floor(num / 100) / 10) + "k";
     return num;
  };

  // 2. Langform (z.B. 9.923)
  const formatFullNumber = (num) => {
      if (typeof num !== "number") return num;
      return new Intl.NumberFormat('de-DE').format(num);
  };

  return (
    <Card className="flex flex-row items-center gap-3 p-3 md:gap-4 md:p-4 border-border shadow-sm hover:border-primary/20 transition-all duration-300 overflow-visible">
      
      {/* ICON: Kompakter auf Handy */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-muted/50 shrink-0", 
        colorClass
      )}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      
      {/* TEXT & WERT */}
      <div className="flex flex-col space-y-0.5 md:space-y-1 min-w-0">
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
                {/* ZAHL: Responsive Größen */}
                <p className="text-lg md:text-2xl font-black text-foreground tracking-tight leading-none cursor-pointer select-none">
                    {formatCompactNumber(value)}
                </p>

                {/* MODERNER TOOLTIP */}
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

// NEU: Kompaktes Skeleton (passend zu den neuen Höhen)
function TicketContentSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-auto xl:h-[calc(100vh-380px)] min-h-[400px] animate-in fade-in duration-500">
        
        {/* LINKE SPALTE SKELETON */}
        <Card className="!gap-0 !py-0 bg-card border-border flex flex-col overflow-hidden shadow-sm h-[350px] xl:h-auto rounded-lg">
          {/* Header Skeleton passend zur neuen Höhe */}
          <div className="bg-muted/30 border-b border-border/50 h-12 px-4 flex items-center justify-between shrink-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>

          <div className="flex-1 overflow-hidden p-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full px-4 py-5 border-b border-border/30 space-y-2">
                <Skeleton className="h-4 w-[85%] rounded-sm" />
                <div className="flex justify-between items-center mt-1">
                      <Skeleton className="h-3 w-24 rounded-sm" />
                      <Skeleton className="h-3 w-16 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RECHTE SPALTE SKELETON */}
        <Card className="!gap-0 !py-0 bg-card border-border flex flex-col shadow-sm h-[450px] xl:h-auto rounded-lg overflow-hidden">
          <div className="bg-muted/30 border-b border-border/50 h-12 px-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
               <Skeleton className="w-5 h-5 rounded-sm" />
               <Skeleton className="h-5 w-48 rounded-md" />
            </div>
            <div className="flex gap-3">
               <Skeleton className="h-4 w-24 rounded-md" />
               <Skeleton className="h-5 w-16 rounded-md bg-muted" />
            </div>
          </div>

          <div className="flex-1 p-6 space-y-8 overflow-hidden bg-muted/20">
            {/* Beispiel-Nachricht im Chat */}
            <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-2 flex-1 max-w-[80%]">
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm opacity-50" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-[90%] rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
  );
}

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
      <Label className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider pl-0.5">
        {label}
      </Label>

      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-muted/30 border border-input text-foreground rounded-sm px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-all hover:bg-muted/50 hover:border-primary/50",
            isOpen
              ? "border-primary ring-1 ring-primary rounded-b-none border-b-0"
              : ""
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {Icon && (
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isOpen || selectedOption ? "text-foreground" : "text-muted-foreground"
                )}
              />
            )}
            <span className={cn("truncate font-medium", !selectedOption && "text-muted-foreground")}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-foreground"
            )}
          />
        </div>

        {isOpen && (
          <div className="absolute z-[9999] w-full bg-card border border-primary border-t-0 rounded-b-sm shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="p-1 space-y-0.5">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center italic">
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
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                      )}
                      <span className={cn("truncate flex-1", isSelected && "font-medium")}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-background/20 shrink-0">
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

      return { 
          ...base, 
          k: c.kind, 
          s: 1, 
          mn: c.min_values || 1, 
          mx: c.max_values || 1 
      };
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
  const [editorTab, setEditorTab] = useState("config"); 
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
  const chatScrollRef = useRef(null);

  // --- UI STATE ---
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [clientTime, setClientTime] = useState(""); 

  // DRAG STATE & HANDLERS
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
        if (settingsData.panelEmbed && !Array.isArray(settingsData.panelEmbed.fields)) {
            settingsData.panelEmbed.fields = [];
        }
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
          
          if (!r.embed) {
             r.embed = { fields: [] };
          } else if (!Array.isArray(r.embed.fields)) {
             r.embed.fields = [];
          }

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
    await fetchMessages(t._id);
  }

  async function handleSave() {
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
      else if (editorTab === "panel") {
         const r = await fetch(`/api/settings/${guildId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (r.ok) flashFormMsg("Panel Design gespeichert ✅");
        else throw new Error();
      }
      else if (editorTab === "modal" || editorTab === "response") {
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

  const guildIconUrl = currentGuild?.icon
    ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

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

      {/* --- HEADER --- */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 px-2 lg:px-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* TITEL & BESCHREIBUNG - Mit Padding für Mobile (pl-14) */}
            <div className="pl-8 lg:pl-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <Inbox className="w-8 h-8 text-primary" />
                    Ticket System
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Verwalte Support-Tickets, konfiguriere das Design und den Ablauf.
                </p>
            </div>

            {/* BUTTONS - Full Width auf Mobile, Gleichmäßig breit */}
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

      {/* --- CONTENT --- */}
      {/* KEIN "if (loading) return" MEHR!
         Wir zeigen die Stats immer an und nutzen ein lokales Skeleton für den Content.
      */}
      
      {loadError ? (
         <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg m-4">
            ❌ Fehler: {loadError}
         </div>
      ) : (
        <>
          {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 pb-2">
          
          {/* STATS ROW */}
          {/* FIX: grid-cols-2 für Handy, gap-2 für mehr Platz */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatsCard title="Tickets" value={stats.total} icon={Inbox} colorClass="text-blue-500" loading={loading} />
            <StatsCard title="Offen" value={stats.open} icon={MessageSquare} colorClass="text-green-500" loading={loading} />
            <StatsCard title="Neu (7d)" value={stats.thisWeek} icon={CalendarDays} colorClass="text-orange-500" loading={loading} />
            <StatsCard title="Geschlossen" value={stats.closed} icon={CheckCircle2} colorClass="text-purple-500" loading={loading} />
          </div>

          {loading ? (
             <TicketContentSkeleton />
          ) : (
            /* HIER: Höhen angepasst für mehr Platz unten */
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-auto xl:h-[calc(100vh-380px)] min-h-[400px]">
              
            {/* LISTE DER TICKETS (LINKE SPALTE) */}
<Card className="!gap-0 !py-0 bg-card border-border flex flex-col overflow-hidden shadow-sm rounded-lg h-[350px] xl:h-auto border-none relative">
  {/* Header: Wir erzwingen h-auto und m-0 */}
  <div className="bg-muted/30 border-b border-border/50 px-4 py-5 flex items-center justify-between shrink-0 m-0 w-full">
    <h3 className="text-foreground text-[11px] font-bold flex items-center gap-2 uppercase tracking-widest opacity-80 leading-none">
      <History className="w-3.5 h-3.5 text-primary" /> Offene Tickets
    </h3>
    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono leading-none">
      {openTickets.length}
    </span>
  </div>

  {/* Die Liste: Wir nutzen 'block' statt 'flex', um Grid-Lücken zu vermeiden */}
  <div className="flex-1 overflow-y-auto custom-scrollbar block m-0 p-0">
    {openTickets.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2 py-10">
        <CheckCircle2 className="w-8 h-8 opacity-20" />
        <p className="text-xs font-medium uppercase tracking-widest">Alles erledigt!</p>
      </div>
    ) : (
      /* 'divide-y' sorgt für Trennlinien OHNE Abstände dazwischen */
      <div className="divide-y divide-border/30 m-0 p-0 flex flex-col">
        {openTickets.map((t) => {
  // Falls dein Backend die ID und den Hash liefert:
  const avatarUrl = t.userId && t.userAvatarHash 
    ? `https://cdn.discordapp.com/avatars/${t.userId}/${t.userAvatarHash}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 6)}.png`; // Fallback

  return (
    <button
      key={t._id}
      onClick={() => onSelectTicket(t)}
      className={cn(
        "w-full text-left px-4 py-4 border-b border-border/30 transition-all group m-0 flex gap-3 items-center !gap-0 !py-5", 
        selectedTicketId === t._id
          ? "bg-primary/5 border-l-2 border-l-primary shadow-sm"
          : "bg-transparent hover:bg-muted/30 border-l-2 border-l-transparent"
      )}
    >
      {/* ECHTES PROFILBILD */}
      <div className="shrink-0 mr-3">
        <img 
          src={avatarUrl} 
          alt="" 
          className="w-10 h-10 rounded-full object-cover border border-border/20"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className={cn(
            "font-bold text-sm transition-colors leading-tight truncate",
            selectedTicketId === t._id ? "text-primary" : "text-foreground"
          )}>
            {t.userTag || "Unbekannter User"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono opacity-60 shrink-0">
            {new Date(t.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
          </span>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1 opacity-80">
          {t.issue || "Keine Vorschau verfügbar"}
        </div>
      </div>
    </button>
  );
})}
      </div>
    )}
  </div>
</Card>

              {/* RECHTE SPALTE (CHAT) */}
<Card className="!gap-0 !py-0 bg-card border-border flex flex-col shadow-sm rounded-lg h-[450px] xl:h-auto overflow-hidden relative">
  {!selectedTicket ? (
    <div className="m-auto text-muted-foreground flex flex-col items-center gap-3 py-20">
      <div className="p-4 bg-muted rounded-full">
        <MessageSquare className="w-8 h-8 opacity-40" />
      </div>
      <p className="text-sm">Wähle ein Ticket aus, um den Verlauf zu sehen.</p>
    </div>
  ) : (
    <>
      {/* --- CHAT HEADER: Jetzt mit py-2.5 für exakte Symmetrie zur linken Seite --- */}
      <div className="bg-muted/30 border-b border-border/50 px-4 py-5 flex justify-between items-center shrink-0 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          {/* Icon etwas kleiner für den modernen Look */}
          <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" /> 
          
          <span className="font-bold text-sm text-foreground truncate max-w-[140px] sm:max-w-[280px] leading-tight">
            {selectedTicket.issue}
          </span>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Badges mit py-0.5 und leading-none für kompakte Optik innerhalb des Headers */}
          <div className="hidden sm:block text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50 leading-none">
            {selectedTicket.userTag}
          </div>
          <div className="text-[10px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 leading-none">
            {selectedTicket.channelId}
          </div>
        </div>
      </div>

      {/* CHAT VERLAUF */}
      <div className="flex-1 overflow-hidden relative bg-muted/20">
        <div ref={chatScrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && !chatLoading && (
                            <div className="text-center text-muted-foreground text-xs mt-10">Keine Nachrichten vorhanden.</div>
                        )}
                        
                        {messages.map((m, i) => {
  const authorAvatarUrl = m.authorId && m.authorAvatarHash
    ? `https://cdn.discordapp.com/avatars/${m.authorId}/${m.authorAvatarHash}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  return (
    <div key={i} className="group flex gap-4 hover:bg-muted/10 p-2 rounded-lg -mx-2 transition-colors">
      <img 
        src={authorAvatarUrl} 
        className="w-10 h-10 rounded-full shrink-0 border border-border/10" 
        alt="" 
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-foreground text-[15px]">{m.authorTag}</span>
          <span className="text-[11px] text-muted-foreground opacity-70">
            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-[15px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
          <DiscordMarkdown text={m.content} />
        </div>
      </div>
    </div>
  );
})}
                        {chatLoading && (
                            <div className="text-center text-muted-foreground text-xs animate-pulse py-4">Lade Verlauf...</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

          {activeTab === "settings" && settings && !loading && (
            <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col xl:flex-row w-full items-start gap-8 relative">
                
                {/* LINKER BEREICH: EDITOR */}
                <div className="w-full xl:flex-1 min-w-0 transition-all duration-500 ease-in-out">
                    <Card className={cn(
                      "bg-card border-border shadow-sm rounded-lg flex flex-col z-10 relative transition-all duration-500 ease-in-out",
                      editorTab === "config" ? "w-full xl:w-[85%]" : "w-full"
                    )}>
                      
                      <div className="bg-muted/30 border-b border-border px-6 pt-4 pb-0 flex flex-col gap-4 rounded-t-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-foreground text-lg font-bold flex items-center gap-2">
                              Konfiguration & Design
                            </h2>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button size="sm" variant="ghost" onClick={handleReset} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 text-xs font-medium flex-1 sm:flex-none">
                              <History className="w-3.5 h-3.5 mr-1.5" /> Reset
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-bold px-4 rounded-md shadow-sm flex-1 sm:flex-none">
                              {saving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Speichern
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-6 overflow-x-auto mt-2 no-scrollbar pb-1">
                          {[{ id: "config", label: "Konfiguration", icon: Settings2 }, { id: "panel", label: "Panel Design", icon: LayoutTemplate }, { id: "modal", label: "Formular", icon: MousePointerClick }, { id: "response", label: "Antwort", icon: MessageSquare }].map((tab) => (
                            <button key={tab.id} onClick={() => setEditorTab(tab.id)} className={cn("pb-3 text-sm font-medium border-b-[2px] transition-all flex items-center gap-2 whitespace-nowrap shrink-0", editorTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}>
                              <tab.icon className={cn("w-4 h-4", editorTab === tab.id ? "text-primary" : "text-muted-foreground")} /> {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <CardContent className="p-0 bg-card rounded-b-lg">
                        {formMsg && <div className="mx-6 mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-md text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {formMsg}</div>}
                        <div className="p-4 sm:p-6 min-h-[500px]">
                          
                          {editorTab === "config" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                              <CollapsibleSection title="Allgemeine Einstellungen" icon={Settings2}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <ChannelSelect label="Ticket Kategorie (Offen)" value={settings.ticketCategoryId} onChange={(v) => setSettings({ ...settings, ticketCategoryId: v })} channels={channels} typeFilter={4} placeholder="Kategorie wählen..." />
                                    <ChannelSelect label="Log Channel (Transcripts)" value={settings.logChannelId} onChange={(v) => setSettings({ ...settings, logChannelId: v })} channels={channels} typeFilter={0} placeholder="#logs wählen..." />
                                    <ChannelSelect label="Panel Channel (Ticket Erstellung)" value={settings.panelChannelId} onChange={(v) => setSettings({ ...settings, panelChannelId: v })} channels={channels} typeFilter={0} placeholder="#tickets wählen..." />
                                    <RoleSelect label="Support Team Rolle" value={settings.supportRoleId} onChange={(v) => setSettings({ ...settings, supportRoleId: v })} roles={roles} placeholder="@Support wählen..." />
                                </div>
                              </CollapsibleSection>
                            </div>
                          )}

                          {editorTab === "panel" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                              <CollapsibleSection title="Button Konfiguration" icon={Palette}>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2"><Label className="text-[11px] text-muted-foreground uppercase font-bold">Button Text</Label><Input value={settings.panelButtonText || ""} onChange={(e) => setSettings({ ...settings, panelButtonText: e.target.value })} placeholder="Standard" className="bg-muted/30 border-input text-foreground focus-visible:ring-primary" /></div>
                                    <div className="space-y-2"><DiscordSelect label="Button Farbe" value={settings.panelButtonStyle || "Primary"} onChange={(v) => setSettings({ ...settings, panelButtonStyle: v })} options={[{ label: "Primary (Blurple)", value: "Primary" }, { label: "Secondary (Grey)", value: "Secondary" }, { label: "Success (Green)", value: "Success" }, { label: "Danger (Red)", value: "Danger" }]} placeholder="Style wählen..." icon={Palette} /></div>
                                  </div>
                              </CollapsibleSection>
                              <EmbedBuilder data={settings.panelEmbed} onChange={(e) => setSettings({ ...settings, panelEmbed: e })} hiddenSections={["author", "fields"]} />
                            </div>
                          )}

                          {editorTab === "modal" && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                              <ModalBuilder data={modal} onChange={setModal} />
                            </div>
                          )}

                          {editorTab === "response" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-border pb-6">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Nachrichtentyp</span>
                                      <div className="flex bg-muted/30 p-1 rounded-md border border-border w-full sm:w-auto">
                                          <button onClick={() => setResponse(r => ({...r, type: 'text'}))} className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2", response.type === 'text' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><Type className="w-3 h-3" /> Text</button>
                                          <button onClick={() => setResponse(r => ({...r, type: 'embed'}))} className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-2", response.type === 'embed' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}><LayoutTemplate className="w-3 h-3" /> Embed</button>
                                      </div>
                                  </div>
                                  <div className="w-full xl:w-auto"><VariableDropdown modal={modal} /></div>
                              </div>
                              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  {response.type === "text" && (<div className="space-y-2"><textarea value={response.text || ""} onChange={(e) => setResponse((r) => ({ ...r, text: e.target.value }))} className="w-full h-64 bg-muted/30 border border-input rounded-md p-4 text-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed text-sm font-mono custom-scrollbar" placeholder="Schreibe hier deine Nachricht..." /></div>)}
                                  {response.type === "embed" && (<div className="space-y-6"><div><Label className="text-[11px] text-muted-foreground uppercase font-bold mb-2 block">Text über dem Embed (Optional)</Label><Input value={response.content || ""} onChange={(e) => setResponse((r) => ({ ...r, content: e.target.value }))} placeholder="Z.B.: Hallo {user}, danke für dein Ticket!" className="bg-muted/30 border-input text-foreground focus-visible:ring-primary" /></div><div className="pt-4 border-t border-border"><EmbedBuilder data={response.embed} onChange={(e) => setResponse({ ...response, embed: e })} /></div></div>)}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                </div>

                {/* SPACER */}
                <div className={cn("shrink-0 transition-all duration-500 ease-in-out hidden xl:block", editorTab === "config" || isPreviewMinimized ? "w-0" : "w-[600px]")} />

                {/* PREVIEW CONTAINER */}
                <div style={{ top: isPreviewMinimized ? '-9999px' : `calc(50% + ${120 + previewY}px)` }} className={cn("hidden xl:block fixed -translate-y-1/2 right-10 w-[600px] z-50 origin-top-right scale-[0.85]", isDragging ? "transition-none" : "transition-all duration-300 ease-in-out", editorTab === "config" && !isPreviewMinimized ? "translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100")}>
                  <div className="bg-card border border-border rounded-lg shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
                    <div onMouseDown={handleDragStart} className="bg-muted/50 border-b border-border p-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
                      <div className="flex items-center gap-2"><GripHorizontal className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Live Preview</span></div>
                      <div className="flex gap-2">
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{editorTab === "config" ? "Allgemein" : editorTab === "modal" ? "Formular" : editorTab === "response" ? "Bot Antwort" : "Panel"}</span>
                          <button onClick={() => setIsPreviewMinimized(true)} className="text-muted-foreground hover:text-foreground transition-colors"><Minimize2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar bg-[#313338]">
                        {editorTab === "modal" && <ModalPreview modal={modal} guildIconUrl={guildIconUrl} />}
                        {editorTab === "config" && <div className="text-center py-20 text-gray-500 italic text-sm">Einstellungen...</div>}
                        {editorTab === "response" && (
                        <div className="bg-[#2b2d31] rounded-md p-4 transition-all duration-300 border border-black/10">
                            {response.type === "text" ? (
                            <div className="flex gap-4 group items-start">
                                <img src={guildIconUrl} alt="Bot" className="w-10 h-10 rounded-full hover:opacity-80 transition shadow-sm bg-[#1e1f22]" />
                                <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1"><span className="text-white font-medium hover:underline cursor-pointer">Ticket Bot</span><span className="bg-[#5865F2] text-[10px] text-white px-1 rounded-[3px] flex items-center h-[15px] leading-none mt-[1px]">BOT</span><span className="text-gray-400 text-xs ml-1">Today at {clientTime}</span></div>
                                <div className="text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed text-[15px]">{response.text ? <DiscordMarkdown text={response.text} /> : <span className="text-gray-500 italic text-sm">Schreibe etwas...</span>}</div>
                                </div>
                            </div>
                            ) : <EmbedPreview embed={{ ...response.embed, thumbnail_url: response.embed.thumbnail_url === "{user_avatar}" ? "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" : response.embed.thumbnail_url }} content={response.content} botName="Ticket Bot" botIconUrl={guildIconUrl} />}
                        </div>
                        )}
                        {editorTab === "panel" && (
                        <div className="bg-[#2b2d31] rounded-md p-4 transition-all duration-300 border border-black/10">
                            <EmbedPreview embed={{ ...settings?.panelEmbed, image: settings?.panelEmbed?.image_url ? { url: settings.panelEmbed.image_url } : undefined }} content="" botName="Ticket System" botIconUrl={guildIconUrl}>
                            <div className="flex gap-2 flex-wrap mt-2">{settings?.panelButtonText ? <DiscordButton label={settings.panelButtonText} emoji="📩" style={settings.panelButtonStyle} /> : <><DiscordButton label="DE" emoji="🇩🇪" /><DiscordButton label="EN" emoji="🇺🇸" /></>}</div>
                            </EmbedPreview>
                        </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* MINIMIZED BUTTON */}
                {isPreviewMinimized && <button onClick={() => setIsPreviewMinimized(false)} className="hidden xl:flex fixed right-6 bottom-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground w-14 h-14 rounded-full shadow-2xl items-center justify-center transition-transform hover:scale-110" title="Vorschau anzeigen"><Maximize2 className="w-6 h-6" /></button>}
                
                {/* MOBILE TOGGLE & OVERLAY */}
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
                        {editorTab === "response" && (<div className="bg-[#313338]">{response.type === "text" ? (<div className="flex gap-3 group items-start"><img src={guildIconUrl} className="w-8 h-8 rounded-full bg-[#1e1f22]" /><div><div className="flex items-center gap-2"><span className="text-white font-bold text-sm">Ticket Bot</span><span className="bg-[#5865F2] text-[10px] text-white px-1 rounded">BOT</span></div><div className="text-gray-200 text-sm mt-1 whitespace-pre-wrap"><DiscordMarkdown text={response.text || "..."} /></div></div></div>) : <EmbedPreview embed={response.embed} content={response.content} botName="Ticket Bot" botIconUrl={guildIconUrl} />}</div>)}
                        {editorTab === "panel" && (<div className="bg-[#313338]"><EmbedPreview embed={settings?.panelEmbed} content="" botName="Ticket System" botIconUrl={guildIconUrl}><div className="flex gap-2 flex-wrap mt-2">{settings?.panelButtonText ? <DiscordButton label={settings.panelButtonText} emoji="📩" style={settings.panelButtonStyle} /> : <><DiscordButton label="DE" emoji="🇩🇪" /><DiscordButton label="EN" emoji="🇺🇸" /></>}</div></EmbedPreview></div>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}