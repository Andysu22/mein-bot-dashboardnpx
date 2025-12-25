"use client";

import React, { useEffect, useState, useMemo } from "react";
import { nanoid } from "nanoid";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Save, FileCode } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Importiere deine ausgelagerten Komponenten
import EmbedBuilder from "@/components/builders/embed/EmbedBuilder";
import EmbedPreview from "@/components/builders/embed/EmbedPreview";

// Helpers (Templates, Storage, Colors)
const MAX_TEMPLATES = 10;
function templatesStorageKey(guildId) { return `embed_builder_templates:${guildId || "global"}`; }
function safeJsonParse(str, fallback) { try { const v = JSON.parse(str); return v ?? fallback; } catch { return fallback; } }
function readTemplates(guildId) { if (typeof window === "undefined") return []; const raw = window.localStorage.getItem(templatesStorageKey(guildId)); const arr = safeJsonParse(raw, []); return Array.isArray(arr) ? arr : []; }
function writeTemplates(guildId, templates) { if (typeof window === "undefined") return; window.localStorage.setItem(templatesStorageKey(guildId), JSON.stringify(templates)); }
function cn(...xs) { return xs.filter(Boolean).join(" "); }
function truncate(s, max) { const t = String(s ?? ""); return t.length <= max ? t : t.slice(0, max - 1) + "…"; }
function toHexColor(s) { const t = String(s ?? "").trim(); if (!t) return "#5865F2"; const v = t.startsWith("#") ? t : `#${t}`; if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#5865F2"; return v.toUpperCase(); }

function defaultEmbed() {
  return {
    title: "Embed Title",
    description: "Embed Description",
    color: "#5865F2",
    author: { name: "", icon_url: "", url: "" },
    footer: { text: "", icon_url: "" },
    thumbnail_url: "",
    image_url: "",
    timestamp: false,
    fields: [],
  };
}

export default function EmbedBuilderPage() {
  const { guildId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return");

  const [tab, setTab] = useState("builder");
  const [embed, setEmbed] = useState(defaultEmbed());
  const [content, setContent] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [tplMsg, setTplMsg] = useState("");
  const [guildIcon, setGuildIcon] = useState(null);

  // Laden von Templates und Server Icon
  useEffect(() => {
    if (guildId) {
      setTemplates(readTemplates(guildId));
      fetch("/api/user/guilds").then(r => r.json()).then(guilds => {
           if(Array.isArray(guilds)) {
             const g = guilds.find(x => x.id === guildId);
             if(g && g.icon) setGuildIcon(`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`);
           }
      }).catch(() => {});
    }
  }, [guildId]);

  function flashTplMsg(msg) { setTplMsg(msg); setTimeout(() => setTplMsg(""), 1200); }
  function resetEmbed() { setEmbed(defaultEmbed()); setContent(""); }

  const botCode = useMemo(() => {
    const e = {
      v: 1, content: content || "", 
      t: truncate(embed.title, 256), d: truncate(embed.description, 4096), c: toHexColor(embed.color),
      a: { n: truncate(embed.author?.name, 256), i: truncate(embed.author?.icon_url, 2048), u: truncate(embed.author?.url, 2048) },
      f: { t: truncate(embed.footer?.text, 2048), i: truncate(embed.footer?.icon_url, 2048) },
      th: truncate(embed.thumbnail_url, 2048), im: truncate(embed.image_url, 2048), ts: !!embed.timestamp,
      fs: (embed.fields || []).map(x => ({ n: truncate(x.name, 256), v: truncate(x.value, 1024), i: !!x.inline })),
    };
    return JSON.stringify(e);
  }, [embed, content]);

  async function copyBotCode() { try { await navigator.clipboard.writeText(botCode); flashTplMsg("Copied ✅"); } catch { flashTplMsg("Error"); } }
  async function copyAndReturn() { await copyBotCode(); if (returnUrl) router.push(returnUrl); }

  function onSaveTemplate() {
    const name = String(templateName || "").trim();
    if (!name) return flashTplMsg("Name missing");
    const entry = { id: nanoid(), name: truncate(name, 40), createdAt: Date.now(), content, embed: { ...embed, fields: (embed.fields || []).map(f => ({ ...f, id: nanoid() })) } };
    const next = [entry, ...templates].slice(0, MAX_TEMPLATES);
    setTemplates(next); writeTemplates(guildId, next); setTemplateName(""); flashTplMsg("Saved ✅");
  }
  function onLoadTemplate(id) { const f = templates.find(x => x.id === id); if (!f) return; setEmbed(f.embed); setContent(f.content || ""); flashTplMsg("Loaded ✅"); }
  function onDeleteTemplate(id) { const n = templates.filter(x => x.id !== id); setTemplates(n); writeTemplates(guildId, n); if (selectedTemplateId === id) setSelectedTemplateId(""); flashTplMsg("Deleted ✅"); }

  const botAvatarUrl = guildIcon || "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div><h1 className="text-3xl font-black text-white uppercase">Embed Builder</h1><p className="text-gray-400 text-sm mt-1">Design & Save Embeds.</p></div>
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
          <button onClick={() => setTab("builder")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", tab === "builder" ? "bg-[#5865F2] text-white" : "text-gray-400")}>Builder</button>
          <button onClick={() => setTab("templates")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", tab === "templates" ? "bg-[#5865F2] text-white" : "text-gray-400")}>Templates</button>
          <button onClick={() => setTab("code")} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", tab === "code" ? "bg-[#5865F2] text-white" : "text-gray-400")}>Code</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-5">
          {tab === "builder" && (
            <>
              <div className="flex justify-between"><div className="text-white font-bold">Settings</div><button onClick={resetEmbed} className="px-3 py-2 bg-white/5 rounded text-sm font-bold text-gray-200">Reset</button></div>
              <div className="rounded-xl border border-white/10 p-3 space-y-2 bg-[#0f1012]">
                 <div className="text-xs text-gray-300 font-bold uppercase">Message Content</div>
                 <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Text above embed..." className="w-full min-h-[60px] bg-transparent border-none text-sm text-white outline-none resize-none" />
              </div>
              <EmbedBuilder data={embed} onChange={setEmbed} />
            </>
          )}

          {tab === "templates" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex gap-2"><Input value={templateName} onChange={e => setTemplateName(e.target.value)} className="bg-black/20 border-white/10 text-white" placeholder="Name" /><Button onClick={onSaveTemplate} className="bg-[#5865F2]">Save</Button></div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"><option value="">Select...</option>{templates.map(t => <option key={t.id} value={t.id} className="bg-black">{t.name}</option>)}</select>
                <div className="flex gap-2"><Button onClick={() => onLoadTemplate(selectedTemplateId)} disabled={!selectedTemplateId} className="bg-white/10">Load</Button><Button onClick={() => onDeleteTemplate(selectedTemplateId)} disabled={!selectedTemplateId} className="bg-red-500/20 text-red-200">Delete</Button></div>
                {tplMsg && <div className="text-sm text-gray-200">{tplMsg}</div>}
              </div>
            </div>
          )}

          {tab === "code" && (
            <div className="space-y-4">
              <div className="flex gap-2"><Button onClick={copyBotCode} className="bg-[#5865F2]">Copy</Button><Button onClick={copyAndReturn} className="bg-white/10">Copy & Return</Button></div>
              {tplMsg && <div className="text-sm text-gray-200">{tplMsg}</div>}
              <textarea value={botCode} readOnly className="w-full min-h-[260px] bg-black/20 border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none" />
            </div>
          )}
        </div>

        <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-4 sticky top-6 self-start">
          <div className="flex justify-between"><div className="text-white font-bold">Preview</div></div>
          
          {/* HIER NUTZEN WIR DIE NEUE PREVIEW */}
          <div className="bg-[#313338] border border-white/10 rounded-2xl p-4">
              <EmbedPreview 
                embed={embed} 
                content={content} 
                botName="Ticket Bot" // Oder ein anderer Name
                botIconUrl={botAvatarUrl} 
              />
          </div>
        </div>
      </div>
    </div>
  );
}