"use client";

import { useState, useEffect, use, useRef } from "react";
import { 
    Settings, MessageSquare, Save, RotateCcw, 
    CheckCircle2, Search, User, Clock, Shield, Trash2, Send, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Helper für Dropdowns
const ChannelSelect = ({ label, value, onChange, channels, typeFilter, placeholder }) => {
    // typeFilter: 0=Text, 2=Voice, 4=Category
    const filtered = channels.filter(c => typeFilter === undefined || c.type === typeFilter);

    return (
        <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">{label}</Label>
            <select 
                value={value || ""} 
                onChange={e => onChange(e.target.value)}
                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#5865F2] outline-none appearance-none"
            >
                <option value="" className="bg-[#1a1b1e] text-gray-500">{placeholder || "Bitte wählen..."}</option>
                {filtered.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#1a1b1e]">
                        {typeFilter === 4 ? "📁 " : "# "}{c.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default function TicketsPage({ params }) {
    const resolvedParams = use(params);
    const guildId = resolvedParams.guildId;

    const [activeTab, setActiveTab] = useState("overview"); 
    const [tickets, setTickets] = useState([]);
    const [settings, setSettings] = useState(null); // Startet als null!
    const [channels, setChannels] = useState([]); // Liste aller Discord Channels
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // CHAT STATE
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Initial Laden
    useEffect(() => {
        const loadData = async () => {
            try {
                const [sRes, tRes, cRes] = await Promise.all([
                    fetch(`/api/settings/${guildId}`),
                    fetch(`/api/guilds/${guildId}/tickets`),
                    fetch(`/api/guilds/${guildId}/channels`) // Channels für Dropdowns
                ]);

                setSettings(await sRes.json());
                setTickets(await tRes.json());
                setChannels(await cRes.json());
            } catch (error) {
                console.error("Fehler:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [guildId]);

    // Auto-Scroll Chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Settings speichern
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch(`/api/settings/${guildId}`, {
                method: "POST",
                body: JSON.stringify(settings),
            });
            // Kein Alert mehr, Button zeigt Status
        } catch (error) { console.error(error); } 
        finally { setSaving(false); setTimeout(() => setSaving(false), 2000); }
    };

    // Ticket auswählen & Chat laden
    const openTicket = async (ticket) => {
        setSelectedTicket(ticket);
        setChatLoading(true);
        try {
            const res = await fetch(`/api/tickets/${ticket._id}`);
            const msgs = await res.json();
            setMessages(msgs);
        } catch (e) { console.error(e); } 
        finally { setChatLoading(false); }
    };

    // Nachricht senden
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const text = chatInput;
        setChatInput(""); // Sofort leeren
        
        // Optimistisch hinzufügen
        setMessages(prev => [...prev, { id: 'temp', content: `**Support (Dashboard):** ${text}`, author: { username: 'You', discriminator: '0000' } }]);

        await fetch(`/api/tickets/${selectedTicket._id}`, {
            method: 'POST',
            body: JSON.stringify({ action: 'send', content: text })
        });
        
        // Chat neu laden für echte Daten
        const res = await fetch(`/api/tickets/${selectedTicket._id}`);
        setMessages(await res.json());
    };

    // Ticket Aktionen
    const handleAction = async (action) => {
        if (!confirm(`Bist du sicher? (${action})`)) return;
        await fetch(`/api/tickets/${selectedTicket._id}`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        
        if (action === 'delete') {
            setTickets(tickets.filter(t => t._id !== selectedTicket._id));
            setSelectedTicket(null);
        } else if (action === 'claim') {
            setSelectedTicket({...selectedTicket, claimedBy: 'Dashboard'});
        }
    };

    if (loading || !settings) return <div className="p-10 text-center text-gray-500">Lade Dashboard...</div>;

    const openCount = tickets.filter(t => t.status === 'open').length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 lg:px-8">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Ticket System</h1>
                    <p className="text-gray-400 text-sm mt-1">Setup & Live Management</p>
                </div>
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button onClick={() => setActiveTab("overview")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "overview" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"}`}>
                        Übersicht
                    </button>
                    <button onClick={() => setActiveTab("settings")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "settings" ? "bg-[#5865F2] text-white" : "text-gray-400 hover:text-white"}`}>
                        Einstellungen
                    </button>
                </div>
            </div>

            {/* --- LIVE ÜBERSICHT --- */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {tickets.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-gray-500">Keine Tickets gefunden.</div>
                    ) : (
                        tickets.map((ticket) => (
                            <div key={ticket._id} onClick={() => openTicket(ticket)} className="cursor-pointer group relative bg-[#1a1b1e] border border-white/5 p-5 rounded-2xl hover:border-[#5865F2] transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${ticket.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-gray-700/30 text-gray-500'}`}>
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">#{ticket.channelId.slice(-4)} | {ticket.category}</h3>
                                            <p className="text-xs text-gray-500">Owner: {ticket.ownerId}</p>
                                        </div>
                                    </div>
                                    {ticket.language === 'de' ? '🇩🇪' : '🇺🇸'}
                                </div>
                                <p className="text-gray-300 text-sm line-clamp-1 bg-black/20 p-2 rounded mb-2">"{ticket.issue || 'Kein Betreff'}"</p>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{new Date(ticket.createdAt).toLocaleString('de-DE')}</span>
                                    {ticket.claimedBy && <span className="text-[#5865F2] font-bold">BEARBEITET</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* --- SETTINGS (JETZT MIT DROPDOWNS) --- */}
            {activeTab === "settings" && (
                <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-8 bg-[#1a1b1e] p-6 rounded-2xl border border-white/5">
                    
                    {/* Toggle */}
                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                        <div>
                            <h3 className="text-white font-bold">Status</h3>
                            <p className="text-gray-500 text-xs">System ein/ausschalten</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings.ticketsEnabled === true} // Expliziter Check
                                onChange={e => setSettings({...settings, ticketsEnabled: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#23a559] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    <div className="space-y-6">
                        {/* Kategorie Dropdown */}
                        <ChannelSelect 
                            label="Ticket Kategorie" 
                            value={settings.ticketCategoryId} 
                            onChange={v => setSettings({...settings, ticketCategoryId: v})}
                            channels={channels}
                            typeFilter={4} // Nur Kategorien
                            placeholder="Wähle eine Kategorie..."
                        />

                        {/* Log Channel Dropdown */}
                        <ChannelSelect 
                            label="Transkript Log Channel" 
                            value={settings.logChannelId} 
                            onChange={v => setSettings({...settings, logChannelId: v})}
                            channels={channels}
                            typeFilter={0} // Nur Text Channel
                            placeholder="Wähle einen Channel..."
                        />

                        {/* Panel Channel Dropdown */}
                        <ChannelSelect 
                            label="Ticket Panel Channel" 
                            value={settings.panelChannelId} 
                            onChange={v => setSettings({...settings, panelChannelId: v})}
                            channels={channels}
                            typeFilter={0} // Nur Text Channel
                            placeholder="Wo soll das Panel hin?"
                        />

                        {/* Rollen ID (Bleibt Input, da wir keine Rollen laden aktuell) */}
                        <div className="space-y-2">
                            <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Support Rolle ID</Label>
                            <Input 
                                value={settings.supportRoleId || ""} 
                                onChange={e => setSettings({...settings, supportRoleId: e.target.value})}
                                className="bg-black/20 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={saving} className="w-full bg-[#5865F2] hover:bg-[#4752c4] py-6 rounded-xl font-bold">
                        {saving ? "Speichere..." : "Einstellungen übernehmen"}
                    </Button>
                </form>
            )}

            {/* --- CHAT MODAL (OVERLAY) --- */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1b1e] w-full max-w-3xl h-[80vh] rounded-2xl border border-white/10 flex flex-col shadow-2xl">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#2b2d31] rounded-t-2xl">
                            <div>
                                <h2 className="text-white font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                                    {selectedTicket.issue || "Support Ticket"}
                                </h2>
                                <p className="text-xs text-gray-400">Owner: {selectedTicket.ownerId}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!selectedTicket.claimedBy && (
                                    <Button size="sm" onClick={() => handleAction('claim')} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                        <Shield className="w-3 h-3 mr-1" /> Claim
                                    </Button>
                                )}
                                <Button size="sm" onClick={() => handleAction('delete')} variant="destructive" className="text-xs">
                                    <Trash2 className="w-3 h-3 mr-1" /> Löschen
                                </Button>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#313338]">
                            {chatLoading ? (
                                <div className="text-center text-gray-500 mt-10">Lade Verlauf...</div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={msg.id || i} className={`flex ${msg.author?.bot ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                            msg.author?.bot 
                                            ? "bg-[#5865F2] text-white rounded-br-none" 
                                            : "bg-[#2b2d31] text-gray-200 rounded-bl-none border border-white/5"
                                        }`}>
                                            <div className="font-bold text-[10px] opacity-50 mb-1">{msg.author?.username}</div>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} className="p-4 bg-[#2b2d31] border-t border-white/10 rounded-b-2xl flex gap-2">
                            <Input 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)} 
                                placeholder="Nachricht an Discord senden..." 
                                className="bg-[#383a40] border-none text-white focus:ring-0"
                            />
                            <Button type="submit" disabled={!chatInput.trim()} className="bg-[#5865F2] hover:bg-[#4752c4]">
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}