"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Terminal,
  MessageSquare,
  Save,
  Loader2,
  Info,
  AtSign,
  Server,
  Hash,
  User,
  Search,
} from "lucide-react";
import { useParams } from "next/navigation";

/** UI Helpers */
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Toggle
function Toggle({ label, value, onChange }) {
  const left = value ? 26 : 2;
  return (
    <div className="flex items-center justify-between rounded-md bg-[#141518] ring-1 ring-white/10 px-3 py-2">
      <div className="text-sm text-gray-200">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-12 rounded-full transition-colors cursor-pointer",
          value ? "bg-[#5865F2]" : "bg-white/10"
        )}
        aria-pressed={value}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]"
          style={{ left }}
        />
      </button>
    </div>
  );
}

// Variable badge
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
  const [selectedCmdId, setSelectedCmdId] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Response type
  const [type, setType] = useState("text"); // "text" | "modal" | "embed"

  // Text response
  const [response, setResponse] = useState("");

  // Modal fields
  const [modalBotCode, setModalBotCode] = useState(""); // wird in response gespeichert
  const [modalSubmitTemplate, setModalSubmitTemplate] = useState("Danke {user}! ✅");

  // Embed fields
  const [embedBotCode, setEmbedBotCode] = useState(""); // wird in response gespeichert

  // Options
  const [ephemeral, setEphemeral] = useState(false);

  // Track last focused textarea (für Variable insertion)
  const lastFocusedRef = useRef("response"); // "response" | "modalSubmitTemplate" | "modalBotCode" | "embedBotCode"

  useEffect(() => {
    fetchCommands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resetForm = () => {
    setSelectedCmdId(null);
    setName("");
    setDescription("");
    setType("text");
    setResponse("");
    setModalBotCode("");
    setEmbedBotCode("");
    setModalSubmitTemplate("Danke {user}! ✅");
    setEphemeral(false);
    lastFocusedRef.current = "response";
  };

  const selectCommand = (cmd) => {
    setSelectedCmdId(cmd._id);
    setName(cmd.name);
    setDescription(cmd.description);

    // load type if present (fallback text)
    const t = cmd.type || "text";
    setType(t);

    // response holds text OR modalBotCode OR embedBotCode, depending on type
    setResponse(cmd.response || "");
    setModalBotCode(cmd.response || "");
    setEmbedBotCode(cmd.response || "");

    // builderData may hold submit template (modal)
    const submitTpl =
      cmd?.builderData?.submitTemplate ||
      cmd?.builderData?.modal?.submitTemplate ||
      "Danke {user}! ✅";
    setModalSubmitTemplate(submitTpl);

    setEphemeral(cmd.ephemeral || false);
  };

  const insertVariable = (variable) => {
    const target = lastFocusedRef.current;

    if (type === "modal" && target === "modalSubmitTemplate") {
      setModalSubmitTemplate((prev) => (prev ? prev + " " + variable : variable));
      return;
    }

    if (type === "embed" && target === "embedBotCode") {
      // WARN: In JSON reintippen kann den Code kaputt machen – nur wenn du weißt was du tust.
      setEmbedBotCode((prev) => (prev ? prev + " " + variable : variable));
      return;
    }

    // default: text response
    setResponse((prev) => (prev ? prev + " " + variable : variable));
  };

  const handleSave = async () => {
    // Validations
    if (!name) return;

    if (type === "text") {
      if (!response) return;
    } else if (type === "modal") {
      if (!modalBotCode) return;
    } else if (type === "embed") {
      if (!embedBotCode) return;
    }

    setSubmitting(true);

    try {
      // quick & dirty update: delete old then create new
      if (selectedCmdId) {
        await fetch(`/api/guilds/${guildId}/commands?commandId=${selectedCmdId}`, {
          method: "DELETE",
        });
      }

      const payload = {
        name,
        description,
        type,
        ephemeral,
        response: type === "modal" ? modalBotCode : type === "embed" ? embedBotCode : response,
        builderData:
          type === "modal"
            ? {
                submitTemplate: modalSubmitTemplate,
              }
            : null,
      };

      const res = await fetch(`/api/guilds/${guildId}/commands`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchCommands();
        resetForm();
      } else {
        const err = await res.json();
        alert(err.error || "Fehler beim Speichern");
      }
    } catch (e) {
      console.error(e);
      alert("Fehler aufgetreten");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Command wirklich löschen?")) return;

    await fetch(`/api/guilds/${guildId}/commands?commandId=${id}`, { method: "DELETE" });

    if (selectedCmdId === id) resetForm();
    fetchCommands();
  };

  const filteredCommands = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const requiredOk =
    type === "text"
      ? !!(name && response)
      : type === "modal"
      ? !!(name && modalBotCode)
      : type === "embed"
      ? !!(name && embedBotCode)
      : false;

  return (
    <div className="w-full text-zinc-100">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Custom Commands</h1>
            <p className="text-sm text-gray-400">Verwalte server-spezifische Befehle.</p>
          </div>

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
          {/* LEFT: list */}
          <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10 flex flex-col h-[600px]">
            <div className="border-b border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">Befehlsliste</span>
                <span className="text-xs text-gray-500">{commands.length} aktiv</span>
              </div>

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
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-gray-500" />
                </div>
              ) : filteredCommands.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">Keine Commands gefunden.</div>
              ) : (
                filteredCommands.map((cmd) => (
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
                      <div className="font-bold text-sm text-gray-200 flex items-center gap-2">
                        <span className="text-gray-500 font-mono">/</span>
                        {cmd.name}
                        {cmd.type === "modal" ? (
                          <span className="ml-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 ring-1 ring-white/10">
                            MODAL
                          </span>
                        ) : cmd.type === "embed" ? (
                          <span className="ml-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-300 ring-1 ring-white/10">
                            EMBED
                          </span>
                        ) : null}
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

          {/* RIGHT: editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white/[0.03] shadow-sm ring-1 ring-white/10">
              <div className="border-b border-white/10 p-4 flex items-center justify-between">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {selectedCmdId ? (
                    <Terminal className="w-4 h-4 text-[#5865F2]" />
                  ) : (
                    <Plus className="w-4 h-4 text-green-400" />
                  )}
                  {selectedCmdId ? "Command bearbeiten" : "Command erstellen"}
                </div>
                {selectedCmdId && (
                  <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white">
                    Abbrechen
                  </button>
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
                      onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                      placeholder="z.b. feedback"
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

                {/* Type selector */}
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Antworttyp</span>
                  <select
                    value={type}
                    onChange={(e) => {
                      const next = e.target.value;
                      setType(next);
                      lastFocusedRef.current =
                        next === "modal"
                          ? "modalBotCode"
                          : next === "embed"
                          ? "embedBotCode"
                          : "response";
                    }}
                    className="w-full rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2]"
                  >
                    <option value="text">Text</option>
                    <option value="modal">Modal</option>
                    <option value="embed">Embed</option>
                  </select>
                </label>

                {/* Text UI */}
                {type === "text" ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                        Antwort <MessageSquare className="w-3 h-3" />
                      </span>
                      <div className="flex gap-2">
                        <VariableBadge
                          icon={AtSign}
                          label="User"
                          colorClass="text-[#5865F2]"
                          onClick={() => insertVariable("{user}")}
                        />
                        <VariableBadge
                          icon={User}
                          label="Name"
                          colorClass="text-[#EB459E]"
                          onClick={() => insertVariable("{username}")}
                        />
                        <VariableBadge
                          icon={Server}
                          label="Server"
                          colorClass="text-[#57F287]"
                          onClick={() => insertVariable("{server}")}
                        />
                        <VariableBadge
                          icon={Hash}
                          label="Channel"
                          colorClass="text-[#FEE75C]"
                          onClick={() => insertVariable("{channel}")}
                        />
                      </div>
                    </div>

                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      onFocus={() => (lastFocusedRef.current = "response")}
                      placeholder="Hallo {user}, willkommen auf {server}!"
                      maxLength={2000}
                      className="w-full min-h-[140px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono custom-scrollbar"
                    />
                  </div>
                ) : null}

                {/* Modal UI */}
                {type === "modal" ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                          Modal BOT Code <Terminal className="w-3 h-3" />
                        </span>
                      </div>
                      <textarea
                        value={modalBotCode}
                        onChange={(e) => setModalBotCode(e.target.value)}
                        onFocus={() => (lastFocusedRef.current = "modalBotCode")}
                        placeholder='{"t":"Feedback","id":"modal","w":0,"c":[...]}'
                        className="w-full min-h-[140px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono custom-scrollbar"
                      />
                      <div className="text-xs text-gray-500">
                        Hier den kompakten JSON-String aus deinem Modal Builder einfügen.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                          Submit-Antwort (ephemeral) <MessageSquare className="w-3 h-3" />
                        </span>
                        <div className="flex gap-2">
                          <VariableBadge
                            icon={AtSign}
                            label="User"
                            colorClass="text-[#5865F2]"
                            onClick={() => insertVariable("{user}")}
                          />
                          <VariableBadge
                            icon={User}
                            label="Name"
                            colorClass="text-[#EB459E]"
                            onClick={() => insertVariable("{username}")}
                          />
                          <VariableBadge
                            icon={Server}
                            label="Server"
                            colorClass="text-[#57F287]"
                            onClick={() => insertVariable("{server}")}
                          />
                          <VariableBadge
                            icon={Hash}
                            label="Channel"
                            colorClass="text-[#FEE75C]"
                            onClick={() => insertVariable("{channel}")}
                          />
                        </div>
                      </div>

                      <textarea
                        value={modalSubmitTemplate}
                        onChange={(e) => setModalSubmitTemplate(e.target.value)}
                        onFocus={() => (lastFocusedRef.current = "modalSubmitTemplate")}
                        placeholder="Danke {user}! Du hast geschrieben: {field:message}"
                        className="w-full min-h-[110px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono custom-scrollbar"
                      />

                      <div className="text-xs text-gray-500">
                        Zusätzlich: <span className="font-mono">{`{field:custom_id}`}</span> (TextInput) und{" "}
                        <span className="font-mono">{`{select:custom_id}`}</span> (StringSelect).
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Embed UI */}
                {type === "embed" ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                          Embed BOT Code <Terminal className="w-3 h-3" />
                        </span>
                      </div>

                      <textarea
                        value={embedBotCode}
                        onChange={(e) => setEmbedBotCode(e.target.value)}
                        onFocus={() => (lastFocusedRef.current = "embedBotCode")}
                        placeholder='{"v":1,"t":"Title","d":"Desc","c":"#5865F2","a":{"n":"","i":"","u":""},"f":{"t":"","i":""},"th":"","im":"","ts":false,"fs":[{"n":"Field","v":"Value","i":false}]}'
                        className="w-full min-h-[160px] resize-none rounded-md bg-[#1e1f22] px-3 py-2 text-sm text-gray-200 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#5865F2] font-mono custom-scrollbar"
                      />

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Hier den kompakten JSON-String aus deinem <b>Embed Builder</b> einfügen.</div>
                        <div>
                          Platzhalter in Strings werden ersetzt:{" "}
                          <span className="font-mono">{`{user}`}</span>,{" "}
                          <span className="font-mono">{`{username}`}</span>,{" "}
                          <span className="font-mono">{`{server}`}</span>,{" "}
                          <span className="font-mono">{`{channel}`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Settings */}
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
                  disabled={submitting || !requiredOk}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all",
                    !requiredOk
                      ? "bg-white/5 text-gray-500 cursor-not-allowed"
                      : "bg-[#5865F2] hover:bg-[#4f5ae6] text-white shadow-lg shadow-[#5865F2]/20"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {selectedCmdId ? "Änderungen Speichern" : "Command Erstellen"}
                </button>
              </div>
            </div>

            {/* Hint */}
            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-4 flex gap-3">
              <Info className="w-5 h-5 text-yellow-500 shrink-0" />
              <div className="text-xs text-yellow-200/80 leading-5">
                <strong>Hinweis:</strong> Änderungen an Commands können bis zu einigen Sekunden dauern, bis sie auf
                Discord sichtbar sind.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
