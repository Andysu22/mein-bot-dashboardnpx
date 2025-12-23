"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Trash2, Terminal, MessageSquare, Save, Loader2, 
  Info, AtSign, Server, Hash, User, Search 
} from "lucide-react";
import { useParams } from "next/navigation";

/** * UI Components (Adapted from Reference) 
 */

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

// 1:1 Kopie des Toggles aus deiner Reference-Datei
function Toggle({ label, value, onChange }) {
  const left = value ? 26 : 2;
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-gray-200">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn("relative h-6 w-12 rounded-full transition-colors cursor-pointer", value ? "bg-[#5865F2]" : "bg-white/10")}
        aria-pressed={value}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]" style={{ left }} />
      </button>
    </div>
  );
}

// Badge Button für Variablen (User, Server etc.)
function VariableBadge({ icon: Icon, label, colorClass, onClick }) {
  return (
    <button 
      onClick={onClick}
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 ring-1 ring-white/5 hover:ring-white/20 transition-all cursor-pointer"
    >
      <Icon className={cn("w-3.5 h-3.5", colorClass)} />
      {label}
    </button>
  );
}

export default function CommandsPage() {
  const { guildId } = useParams();
  
  // Data State
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // UI State
  const [search, setSearch] = useState("");
  const [selectedCmdId, setSelectedCmdId] = useState(null); // Wenn null -> "Neuer Command Modus"

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [response, setResponse] = useState("");
  const [ephemeral, setEphemeral] = useState(false);

  useEffect(() => {
    fetchCommands();
  }, [guildId]);

  const fetchCommands = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/commands`);
      const data = await res.json();
      if (Array.isArray(data)) setCommands(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Modus wechseln: Bearbeiten oder Neu erstellen
  const resetForm = () => {
    setSelectedCmdId(null);
    setName("");
    setDescription("");
    setResponse("");
    setEphemeral(false);
  };

  // Einen Command aus der Liste auswählen
  const selectCommand = (cmd) => {
    setSelectedCmdId(cmd._id);
    setName(cmd.name);
    setDescription(cmd.description);
    setResponse(cmd.response);
    setEphemeral(cmd.ephemeral || false);
  };

  const handleSave = async () => {
    if (!name || !response) return;
    setSubmitting(true);

    try {
        // HINWEIS: Hier unterscheiden wir zwischen CREATE (POST) und UPDATE (PUT/PATCH, falls du das hast).
        // Da deine API aktuell nur POST (Create) und DELETE hat, löschen wir beim Bearbeiten theoretisch den alten
        // und erstellen neu, ODER wir nutzen nur POST für neue. 
        // Für dieses Beispiel nutze ich POST (Create), wie du es hattest. 
        // Wenn du "Bearbeiten" willst, müsstest du erst DELETE und dann POST machen oder deine API erweitern.
        
        // Simples Verhalten: Wenn ID existiert -> Löschen -> Neu erstellen (Quick & Dirty Update)
        if (selectedCmdId) {
            await fetch(`/api/guilds/${guildId}/commands?commandId=${selectedCmdId}`, { method: "DELETE" });
        }

        const res = await fetch(`/api/guilds/${guildId}/commands`, {
            method: "POST",
            body: JSON.stringify({ name, description, response, ephemeral }),
        });

        if (res.ok) {
            fetchCommands();
            resetForm(); // Zurück zum "Neu" Modus
        } else {
            const err = await res.json();
            alert(err.error || "Fehler beim Speichern");
        }
    } catch (e) {
      alert("Fehler aufgetreten");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Damit man nicht den Command auswählt beim Löschen
    if(!confirm("Command wirklich löschen?")) return;
    
    await fetch(`/api/guilds/${guildId}/commands?commandId=${id}`, { method: "DELETE" });
    
    if (selectedCmdId === id) resetForm();
    fetchCommands();
  };

  const insertVariable = (variable) => {
    setResponse((prev) => prev + " " + variable);
  };

  // Filter Commands
  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full text-zinc-100">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        
        {/* Header Area */}
        <div className="mb-6 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-semibold text-white">Custom Commands</h1>
                <p className="text-sm text-gray-400">Verwalte server-spezifische Befehle.</p>
            </div>
            {/* Create New Button */}
            <button
                onClick={resetForm}
                className={cn(
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                    !selectedCmdId ? "bg-[#5865F2] text-white" : "bg-white/5 text-gray-200 hover:bg-white/10"
                )}
            >
                <Plus className="w-4 h-4" />
                Neuer Command
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Command List */}
          <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10 flex flex-col h-[600px]">
            <div className="border-b border-white/10 p-4 space-y-3">
               <div className="flex items-center justify-between">
                   <span className="text-sm font-semibold text-gray-200">Befehlsliste</span>
                   <span className="text-xs text-gray-500">{commands.length} aktiv</span>
               </div>
               
               {/* Search Bar */}
               <div className="relative">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                 <input 
                    placeholder="Suchen..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md bg-[#1e1f22] pl-9 pr-3 py-2 text-xs text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-500" /></div>
                ) : filteredCommands.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">Keine Commands gefunden.</div>
                ) : (
                    filteredCommands.map(cmd => (
                        <div 
                            key={cmd._id}
                            onClick={() => selectCommand(cmd)}
                            className={cn(
                                "group flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all",
                                selectedCmdId === cmd._id 
                                    ? "bg-[#5865F2]/10 border-[#5865F2]/50 ring-1 ring-[#5865F2]/30" 
                                    : "bg-white/5 border-transparent hover:bg-white/10 border-white/5"
                            )}
                        >
                            <div className="min-w-0">
                                <div className="font-bold text-sm text-gray-200 flex items-center gap-1">
                                    <span className="text-gray-500 font-mono">/</span>{cmd.name}
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[180px]">{cmd.description}</div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(cmd._id, e)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
          </div>

          {/* RIGHT: Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
                <div className="border-b border-white/10 p-4 flex items-center justify-between">
                    <div className="text-sm font-semibold flex items-center gap-2">
                        {selectedCmdId ? <Terminal className="w-4 h-4 text-[#5865F2]" /> : <Plus className="w-4 h-4 text-green-400" />}
                        {selectedCmdId ? "Command bearbeiten" : "Command erstellen"}
                    </div>
                    {selectedCmdId && (
                        <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white">Abbrechen</button>
                    )}
                </div>

                <div className="p-4 space-y-4">
                    {/* Name */}
                    <label className="grid gap-1.5">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Command Name</span>
                        <div className="relative">
                             <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-sm">/</span>
                             <input 
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                                placeholder="z.b. social-media"
                                maxLength={32}
                                className="w-full rounded-md bg-[#1e1f22] pl-7 pr-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono"
                             />
                        </div>
                    </label>

                    {/* Description */}
                    <label className="grid gap-1.5">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Beschreibung</span>
                        <input 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Was macht dieser Command?"
                            maxLength={100}
                            className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                        />
                    </label>

                    {/* Response + Variables */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                             <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                                Antwort <MessageSquare className="w-3 h-3" />
                             </span>
                             <div className="flex gap-2">
                                <VariableBadge icon={AtSign} label="User" colorClass="text-[#5865F2]" onClick={() => insertVariable('{user}')} />
                                <VariableBadge icon={User} label="Name" colorClass="text-[#EB459E]" onClick={() => insertVariable('{username}')} />
                                <VariableBadge icon={Server} label="Server" colorClass="text-[#57F287]" onClick={() => insertVariable('{server}')} />
                                <VariableBadge icon={Hash} label="Channel" colorClass="text-[#FEE75C]" onClick={() => insertVariable('{channel}')} />
                             </div>
                        </div>
                        <textarea 
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Hallo {user}, willkommen auf {server}!"
                            maxLength={2000}
                            className="w-full min-h-[140px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono custom-scrollbar"
                        />
                    </div>

                    {/* Settings / Toggle */}
                    <div className="pt-2">
                        <Toggle 
                            label="Ephemeral (Nur für User sichtbar)" 
                            value={ephemeral} 
                            onChange={setEphemeral} 
                        />
                    </div>
                </div>

                <div className="border-t border-white/10 p-4 flex justify-end gap-3">
                    <button
                        onClick={handleSave}
                        disabled={submitting || !name || !response}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all",
                            !name || !response 
                                ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                                : "bg-[#5865F2] hover:bg-[#4f5ae6] text-white shadow-lg shadow-[#5865F2]/20"
                        )}
                    >
                        {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {selectedCmdId ? "Änderungen Speichern" : "Command Erstellen"}
                    </button>
                </div>
            </div>

            {/* Hint Box */}
            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-4 flex gap-3">
                 <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                 <div className="text-xs text-yellow-200/80 leading-5">
                    <strong>Hinweis:</strong> Änderungen an Commands können bis zu einigen Sekunden dauern, bis sie auf Discord sichtbar sind. 
                    Benutze die Variablen oben rechts im Editor, um dynamische Antworten zu erstellen.
                 </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}