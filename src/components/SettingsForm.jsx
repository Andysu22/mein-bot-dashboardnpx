"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Falls du keine UI Library hast, nutzen wir normale Inputs

export default function SettingsForm({ guildId, initialSettings, channels, roles }) {
  const [settings, setSettings] = useState(initialSettings || {});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (key, value) => {
    // Bei Zahlen müssen wir sicherstellen, dass es wirklich eine Zahl ist
    if (key === "appDeclineCooldownDays") value = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, [key]: value }));
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
      setMessage("✅ Einstellungen erfolgreich gespeichert!");
      
      // Nachricht nach 3 Sekunden ausblenden
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage("❌ Fehler: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Listen filtern
  const textChannels = channels.filter(c => c.type === 0); // Textkanäle
  const voiceChannels = channels.filter(c => c.type === 2); // Voicekanäle
  const categories = channels.filter(c => c.type === 4); // Kategorien
  const sortedRoles = [...roles].sort((a, b) => b.position - a.position); // Rollen nach Rang

  // Helper Komponente für Dropdowns (spart Code)
  const Select = ({ label, value, onChange, options, placeholder = "-- Auswählen --" }) => (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <select
        className="w-full p-2 border rounded-md bg-background text-foreground text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} style={opt.color ? { color: `#${opt.color.toString(16)}` } : {}}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      
      {/* === 1. TICKET SYSTEM === */}
      <Card>
        <CardHeader className="bg-slate-100 dark:bg-slate-900/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>🎟️ Ticket System</CardTitle>
            <div className="flex items-center gap-2">
              <Label>Aktiv</Label>
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue-600"
                checked={settings.ticketsEnabled ?? true}
                onChange={(e) => handleChange("ticketsEnabled", e.target.checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <Select 
            label="Log Kanal (Transcripts)" 
            value={settings.logChannelId} 
            onChange={(v) => handleChange("logChannelId", v)} 
            options={textChannels} 
          />
          <Select 
            label="Ticket Kategorie (Erstellung)" 
            value={settings.ticketCategoryId} 
            onChange={(v) => handleChange("ticketCategoryId", v)} 
            options={categories} 
          />
          <Select 
            label="Support Team Rolle" 
            value={settings.supportRoleId} 
            onChange={(v) => handleChange("supportRoleId", v)} 
            options={sortedRoles} 
          />
          <div className="space-y-1">
             <Label className="text-sm font-medium">DeepL API Key (Optional)</Label>
             <input 
                type="password"
                className="w-full p-2 border rounded-md bg-background text-foreground text-sm"
                placeholder="DeepL Key für Übersetzungen"
                value={settings.deeplApiKey || ""}
                onChange={(e) => handleChange("deeplApiKey", e.target.value)}
             />
          </div>
        </CardContent>
      </Card>

      {/* === 2. TEMP VOICE (Join to Create) === */}
      <Card>
        <CardHeader className="bg-slate-100 dark:bg-slate-900/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>🔊 Temp Voice</CardTitle>
            <div className="flex items-center gap-2">
              <Label>Aktiv</Label>
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue-600"
                checked={settings.tempVcEnabled ?? false}
                onChange={(e) => handleChange("tempVcEnabled", e.target.checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <Select 
            label="Generator Kanal (Join Here)" 
            value={settings.creatorChannelId} 
            onChange={(v) => handleChange("creatorChannelId", v)} 
            options={voiceChannels} 
          />
           <Select 
            label="Kategorie für neue Channels" 
            value={settings.tempCategoryChannelId} 
            onChange={(v) => handleChange("tempCategoryChannelId", v)} 
            options={categories} 
          />
        </CardContent>
      </Card>

      {/* === 3. BEWERBUNGEN === */}
      <Card>
        <CardHeader className="bg-slate-100 dark:bg-slate-900/50 pb-4">
          <CardTitle>📝 Bewerbungssystem</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <Select 
            label="Review Kanal (Für das Team)" 
            value={settings.appReviewChannelId} 
            onChange={(v) => handleChange("appReviewChannelId", v)} 
            options={textChannels} 
          />
           <Select 
            label="Bewerber Rolle (Wird vergeben)" 
            value={settings.applicantRoleId} 
            onChange={(v) => handleChange("applicantRoleId", v)} 
            options={sortedRoles} 
          />
          <Select 
            label="Team Rolle (Darf bearbeiten)" 
            value={settings.appStaffRoleId} 
            onChange={(v) => handleChange("appStaffRoleId", v)} 
            options={sortedRoles} 
          />
          <div className="space-y-1">
             <Label className="text-sm font-medium">Cooldown nach Ablehnung (Tage)</Label>
             <input 
                type="number"
                min="0"
                max="365"
                className="w-full p-2 border rounded-md bg-background text-foreground text-sm"
                value={settings.appDeclineCooldownDays ?? 7}
                onChange={(e) => handleChange("appDeclineCooldownDays", e.target.value)}
             />
          </div>
        </CardContent>
      </Card>

      {/* SPEICHER LEISTE (Floating) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
        <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl p-4 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="font-semibold">Änderungen speichern?</span>
                <span className="text-xs text-muted-foreground">Vergiss nicht zu speichern.</span>
            </div>
            <div className="flex items-center gap-4">
                {message && (
                    <span className={`text-sm font-medium ${message.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                        {message}
                    </span>
                )}
                <Button onClick={handleSave} disabled={loading} size="lg" className="shadow-md">
                    {loading ? "Speichert..." : "Speichern"}
                </Button>
            </div>
        </div>
      </div>

    </div>
  );
}