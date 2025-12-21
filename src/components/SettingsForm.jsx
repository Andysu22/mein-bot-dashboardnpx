"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Bot, Ticket, Mic, FileText, ChevronDown, RotateCcw } from "lucide-react"; 

// --- HILFSFUNKTIONEN (DEEP COMPARE & INPUTS) ---
function isDeepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (let key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

const Select = ({ label, value, onChange, options = [], placeholder = "Bitte wählen..." }) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-0.5">{label}</Label>
    <div className="relative group">
      <select
        className="w-full appearance-none bg-[#1e1f22] text-gray-200 border border-[#1e1f22] rounded-md p-3 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:border-transparent transition-all cursor-pointer hover:bg-[#232428]"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" className="text-gray-500">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-[#2b2d31]">{opt.name}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 group-hover:text-gray-300 transition-colors">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const Input = ({ label, type = "text", value, onChange, placeholder, ...props }) => (
  <div className="space-y-2">
     <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-0.5">{label}</Label>
     <input 
        type={type}
        className="w-full bg-[#1e1f22] text-gray-200 border border-[#1e1f22] rounded-md p-3 pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:border-transparent transition-all placeholder:text-gray-600 hover:bg-[#232428]"
        placeholder={placeholder}
        value={value || ""}
        onChange={onChange}
        {...props}
     />
  </div>
);

// --- HAUPTKOMPONENTE ---
export default function SettingsForm({ guildId, initialSettings, channels = [], roles = [], module }) {
  const [original] = useState(initialSettings || {}); 
  const [settings, setSettings] = useState(initialSettings || {});
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsDirty(!isDeepEqual(original, settings));
  }, [settings, original]);

  const handleChange = (key, value) => {
    let val = value;
    if (key === "appDeclineCooldownDays") val = parseInt(value) || 0;
    if (val === "") val = null;
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setSettings(original);
    setMessage("↺ Änderungen verworfen");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      const data = await res.json();
      setSettings(data);
      setIsDirty(false); 
      setMessage("✅ Gespeichert!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setMessage("❌ Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter-Logik mit Fallback, um Crashes zu vermeiden
  const textChannels = (channels || []).filter(c => c.type === 0);
  const voiceChannels = (channels || []).filter(c => c.type === 2);
  const categories = (channels || []).filter(c => c.type === 4);
  const sortedRoles = [...(roles || [])].sort((a, b) => b.position - a.position);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* BOT NICKNAME - Nur auf der Übersicht */}
      {(!module || module === "identity") && (
        <Card className="bg-[#2b2d31] border-none shadow-lg overflow-hidden group hover:shadow-indigo-500/5 transition-all duration-300">
          <CardHeader className="bg-[#232428] border-b border-[#1e1f22] py-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition-colors"><Bot className="w-5 h-5" /></div>
              <div>
                  <CardTitle className="text-white text-lg font-semibold">Bot Identität</CardTitle>
                  <CardDescription className="text-gray-400 text-xs mt-1">Passe an, wie der Bot auf diesem Server auftritt.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-6">
             <Input label="Nickname auf diesem Server" value={settings.botNickname} onChange={(e) => handleChange("botNickname", e.target.value)} placeholder="z.B. Super Support Bot" maxLength={32} />
          </CardContent>
        </Card>
      )}

      {/* TICKETS - Nur auf der Ticket-Seite */}
      {(module === "tickets") && (
        <Card className="bg-[#2b2d31] border-none shadow-lg overflow-hidden group hover:shadow-emerald-500/5 transition-all duration-300">
          <CardHeader className="bg-[#232428] border-b border-[#1e1f22] py-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors"><Ticket className="w-5 h-5" /></div>
               <div>
                  <CardTitle className="text-white text-lg font-semibold">Ticket System</CardTitle>
                  <CardDescription className="text-gray-400 text-xs mt-1">Support-Anfragen verwalten und protokollieren.</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-3 bg-[#1e1f22] px-3 py-1.5 rounded-full border border-white/5 cursor-pointer hover:bg-[#2a2b30]" onClick={() => handleChange("ticketsEnabled", !settings.ticketsEnabled)}>
                <span className={`text-xs font-bold ${settings.ticketsEnabled !== false ? "text-emerald-400" : "text-gray-500"}`}>{settings.ticketsEnabled !== false ? "AKTIV" : "INAKTIV"}</span>
                <div className={`w-3 h-3 rounded-full ${settings.ticketsEnabled !== false ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-gray-600"}`} />
            </div>
          </CardHeader>
          <CardContent className={`grid gap-6 pt-6 pb-8 px-6 md:grid-cols-2 ${settings.ticketsEnabled === false ? "opacity-50 pointer-events-none grayscale" : ""}`}>
            <Select label="Log Kanal (Transcripts)" value={settings.logChannelId} onChange={(v) => handleChange("logChannelId", v)} options={textChannels} />
            <Select label="Ticket Kategorie" value={settings.ticketCategoryId} onChange={(v) => handleChange("ticketCategoryId", v)} options={categories} />
            <Select label="Support Rolle" value={settings.supportRoleId} onChange={(v) => handleChange("supportRoleId", v)} options={sortedRoles} />
            <Input type="password" label="DeepL API Key (Optional)" value={settings.deeplApiKey} onChange={(e) => handleChange("deeplApiKey", e.target.value)} placeholder="••••••••••••••••••••" />
          </CardContent>
        </Card>
      )}

      {/* TEMP VOICE - Nur auf der Voice-Seite */}
      {(module === "voice") && (
        <Card className="bg-[#2b2d31] border-none shadow-lg overflow-hidden group hover:shadow-orange-500/5 transition-all duration-300">
          <CardHeader className="bg-[#232428] border-b border-[#1e1f22] py-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover:bg-orange-500/20 transition-colors"><Mic className="w-5 h-5" /></div>
               <div>
                  <CardTitle className="text-white text-lg font-semibold">Temp Voice</CardTitle>
                  <CardDescription className="text-gray-400 text-xs mt-1">Join-to-Create Kanäle automatisch erstellen.</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-3 bg-[#1e1f22] px-3 py-1.5 rounded-full border border-white/5 cursor-pointer hover:bg-[#2a2b30]" onClick={() => handleChange("tempVcEnabled", !settings.tempVcEnabled)}>
                <span className={`text-xs font-bold ${settings.tempVcEnabled ? "text-emerald-400" : "text-gray-500"}`}>{settings.tempVcEnabled ? "AKTIV" : "INAKTIV"}</span>
                <div className={`w-3 h-3 rounded-full ${settings.tempVcEnabled ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-gray-600"}`} />
            </div>
          </CardHeader>
          <CardContent className={`grid gap-6 pt-6 pb-8 px-6 md:grid-cols-2 ${!settings.tempVcEnabled ? "opacity-50 pointer-events-none grayscale" : ""}`}>
            <Select label="Generator Kanal (Join Here)" value={settings.creatorChannelId} onChange={(v) => handleChange("creatorChannelId", v)} options={voiceChannels} />
            <Select label="Kategorie für neue Channels" value={settings.tempCategoryChannelId} onChange={(v) => handleChange("tempCategoryChannelId", v)} options={categories} />
          </CardContent>
        </Card>
      )}

      {/* BEWERBUNGEN - Nur auf der Bewerbungen-Seite */}
      {(module === "applications") && (
        <Card className="bg-[#2b2d31] border-none shadow-lg overflow-hidden group hover:shadow-pink-500/5 transition-all duration-300">
          <CardHeader className="bg-[#232428] border-b border-[#1e1f22] py-5">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400 group-hover:bg-pink-500/20 transition-colors"><FileText className="w-5 h-5" /></div>
               <div>
                  <CardTitle className="text-white text-lg font-semibold">Bewerbungen</CardTitle>
                  <CardDescription className="text-gray-400 text-xs mt-1">Automatische Bewerbungsformulare und Team-Rollen.</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6 pb-8 px-6 md:grid-cols-2">
            <Select label="Review Kanal (Intern)" value={settings.appReviewChannelId} onChange={(v) => handleChange("appReviewChannelId", v)} options={textChannels} />
            <Select label="Rolle für Bewerber" value={settings.applicantRoleId} onChange={(v) => handleChange("applicantRoleId", v)} options={sortedRoles} />
            <Select label="Team Rolle (Reviewer)" value={settings.appStaffRoleId} onChange={(v) => handleChange("appStaffRoleId", v)} options={sortedRoles} />
            <Input type="number" min="0" max="365" label="Cooldown nach Ablehnung (Tage)" value={settings.appDeclineCooldownDays ?? 7} onChange={(e) => handleChange("appDeclineCooldownDays", e.target.value)} />
          </CardContent>
        </Card>
      )}

      {/* FLOATING SAVE BAR */}
      <div className={`fixed bottom-6 left-0 right-0 px-6 flex justify-center z-50 transition-all duration-500 transform ${isDirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}>
        <div className="bg-[#111214]/90 backdrop-blur-xl border border-[#5865F2]/20 rounded-2xl shadow-2xl p-4 w-full max-w-4xl flex items-center justify-between">
            <div className="flex flex-col pl-2">
                <span className="font-bold text-gray-200 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />Ungespeicherte Änderungen</span>
                <span className="text-xs text-gray-400 pl-4">Du hast die Konfiguration bearbeitet.</span>
            </div>
            <div className="flex items-center gap-3">
                {message && <span className={`text-sm font-bold animate-pulse mr-4 ${message.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>{message}</span>}
                <Button variant="ghost" onClick={handleReset} disabled={loading} className="text-gray-400 hover:text-white hover:bg-white/5"><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
                <Button onClick={handleSave} disabled={loading} className="bg-[#23a559] hover:bg-[#1f8b4c] text-white font-bold px-8 py-2.5 rounded-xl transition-all active:scale-95">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{loading ? "Speichert..." : "Speichern"}</Button>
            </div>
        </div>
      </div>
    </div>
  );
}