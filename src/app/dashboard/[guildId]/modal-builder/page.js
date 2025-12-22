"use client";

import { useState } from "react";
import { 
    Settings2, Type, AlignJustify, List, Users, Shield, Hash, 
    Plus, Trash2, Code, Check, ChevronDown, MousePointer2, GripVertical, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ModalBuilderPage() {
    const [selectedSlot, setSelectedSlot] = useState(null); 
    const [copied, setCopied] = useState(false);
    
    // Modal Einstellungen
    const [modalSettings, setModalSettings] = useState({ title: "Bewerbung", customId: "app_modal" });
    
    // 5 Slots (Null = Leer)
    const [slots, setSlots] = useState([
        { type: 4, style: 1, customId: "name", label: "Wie heißt du?", placeholder: "Max Mustermann", required: true, minLength: 2, maxLength: 50 },
        null, null, null, null 
    ]);

    // --- LOGIK ---
    const addComponent = (index, type) => {
        let label = "Neues Feld";
        if(type === 3) label = "Option wählen";
        const newComp = {
            type, style: 1, customId: `field_${Date.now()}`, label, placeholder: "", required: true,
            options: type === 3 ? [{label: "Option 1", value: "opt_1"}] : [],
            minValues: 1, maxValues: 1
        };
        const newSlots = [...slots];
        newSlots[index] = newComp;
        setSlots(newSlots);
        setSelectedSlot(index); // Automatisch auswählen zum Bearbeiten
    };

    const removeComponent = (index, e) => {
        e?.stopPropagation();
        const newSlots = [...slots];
        newSlots[index] = null;
        setSlots(newSlots);
        if (selectedSlot === index) setSelectedSlot(null);
    };

    const updateComponent = (index, field, value) => {
        const newSlots = [...slots];
        if(!newSlots[index]) return;
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
    };

    // Option Helper
    const updateOption = (slotIdx, optIdx, field, val) => {
        const newSlots = [...slots];
        newSlots[slotIdx].options[optIdx][field] = val;
        setSlots(newSlots);
    };
    const addOption = (slotIdx) => {
        const newSlots = [...slots];
        if(newSlots[slotIdx].options.length >= 25) return;
        newSlots[slotIdx].options.push({ label: "Neu", value: "val" });
        setSlots(newSlots);
    };
    const removeOption = (slotIdx, optIdx) => {
        const newSlots = [...slots];
        newSlots[slotIdx].options = newSlots[slotIdx].options.filter((_, i) => i !== optIdx);
        setSlots(newSlots);
    };

    // Code Generator
    const generateCode = () => {
        const active = slots.filter(s => s !== null);
        const json = {
            title: modalSettings.title, custom_id: modalSettings.customId,
            components: active.map(c => {
                const data = { type: c.type, custom_id: c.customId };
                if(c.type === 4) {
                    data.label = c.label; data.style = parseInt(c.style); data.required = c.required;
                    if(c.minLength) data.min_length = parseInt(c.minLength);
                    if(c.maxLength) data.max_length = parseInt(c.maxLength);
                    if(c.placeholder) data.placeholder = c.placeholder;
                } else {
                    if(c.options) data.options = c.options;
                    data.min_values = parseInt(c.minValues); data.max_values = parseInt(c.maxValues);
                    if(c.placeholder) data.placeholder = c.placeholder;
                }
                return { type: 1, components: [data] };
            })
        };
        return JSON.stringify(json, null, 4);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(generateCode());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const activeComp = selectedSlot !== null ? slots[selectedSlot] : null;

    return (
        <div className="flex flex-col xl:flex-row h-[calc(100vh-64px)] w-full bg-[#1e1f22] overflow-hidden">
            
            {/* --- SPALTE 1: TOOLBOX (Links) --- */}
            <div className="hidden xl:flex w-[260px] bg-[#2b2d31] border-r border-[#1e1f22] flex-col shrink-0">
                <div className="p-4 border-b border-[#1e1f22] bg-[#232428]">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Komponenten</h3>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto custom-scroll">
                    {/* Drag & Drop Simulation (Click to add to first empty slot) */}
                    <div className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-1 px-1">Eingabefelder</div>
                    <ToolBtn label="Kurzer Text" icon={<Type/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) addComponent(emptyIdx, 4);
                    }}/>
                    <ToolBtn label="Absatz" icon={<AlignJustify/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) { addComponent(emptyIdx, 4); updateComponent(emptyIdx, 'style', 2); }
                    }}/>
                    
                    <div className="text-[10px] font-bold text-gray-500 uppercase mt-4 mb-1 px-1">Auswahlmenüs</div>
                    <ToolBtn label="String Select" icon={<List/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) addComponent(emptyIdx, 3);
                    }}/>
                    <ToolBtn label="User Select" icon={<Users/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) addComponent(emptyIdx, 5);
                    }}/>
                    <ToolBtn label="Role Select" icon={<Shield/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) addComponent(emptyIdx, 6);
                    }}/>
                    <ToolBtn label="Channel Select" icon={<Hash/>} onClick={() => {
                        const emptyIdx = slots.findIndex(s => s === null);
                        if(emptyIdx !== -1) addComponent(emptyIdx, 8);
                    }}/>
                </div>
            </div>

            {/* --- SPALTE 2: VORSCHAU (Mitte) --- */}
            <div className="flex-1 flex flex-col relative bg-[#1e1f22] min-w-0">
                
                {/* Toolbar */}
                <div className="h-14 bg-[#2b2d31] border-b border-[#1e1f22] flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-[#5865F2]" />
                        <span className="font-bold text-white text-sm">Preview</span>
                    </div>
                    <Button onClick={copyCode} size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5">
                        {copied ? <Check className="w-3 h-3 mr-2 text-green-400"/> : <Code className="w-3 h-3 mr-2"/>}
                        JSON Export
                    </Button>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-y-auto p-10 flex justify-center items-start bg-[radial-gradient(#5865F2_1px,transparent_1px)] [background-size:24px_24px] [background-position:0_0]">
                    
                    {/* --- DAS MODAL (Fixed Width, Read Only) --- */}
                    <div className="w-[440px] bg-[#313338] rounded-[12px] shadow-2xl border border-[#202225] select-none shrink-0">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-[#26272d]">
                            <div className="flex items-center w-[calc(100%-32px)]">
                                <div className="mr-3 shrink-0">
                                    {/* Icon SVG */}
                                    <svg width="24" height="24" viewBox="0 0 256 256" fill="none" style={{borderRadius: "50%"}}>
                                        <defs>
                                            <linearGradient id="p0" x1="256" y1="256" x2="0" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#6A58F2"/><stop offset="1" stopColor="#5865F2"/></linearGradient>
                                        </defs>
                                        <rect width="256" height="256" fill="url(#p0)"/>
                                        <path d="M70 90 L186 90" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                                        <path d="M70 130 L160 130" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                                        <path d="M70 170 L190 170" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <input 
                                    value={modalSettings.title}
                                    onChange={e => setModalSettings({...modalSettings, title: e.target.value})}
                                    className="bg-transparent border-none p-0 text-[20px] font-semibold text-white focus:ring-0 w-full placeholder-gray-500"
                                    placeholder="Titel..."
                                />
                            </div>
                            <X className="w-6 h-6 text-[#dbdee1] opacity-50 cursor-not-allowed" />
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 bg-[#313338]">
                            {slots.map((slot, index) => (
                                <div key={index} className="relative group">
                                    
                                    {/* Empty Slot */}
                                    {!slot && (
                                        <div 
                                            onClick={() => setSelectedSlot(index)} // Zum Fokussieren (damit man rechts was hinzufügen kann)
                                            className={`h-[48px] border border-dashed border-[#4e5058] rounded-[4px] flex items-center justify-center cursor-pointer hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all ${selectedSlot === index ? "border-[#5865F2] bg-[#5865F2]/5" : ""}`}
                                        >
                                            <span className="text-xs text-[#b5bac1] font-bold uppercase tracking-wider">
                                                {selectedSlot === index ? "Slot Ausgewählt (Siehe Rechts)" : "Leerer Slot"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Filled Slot */}
                                    {slot && (
                                        <div 
                                            onClick={() => setSelectedSlot(index)}
                                            className={`relative cursor-pointer rounded-[4px] border-2 transition-all p-1 -m-1 ${selectedSlot === index ? "border-[#5865F2] bg-[#3a3c42]/30" : "border-transparent hover:bg-[#36393f]/30"}`}
                                        >
                                            <div className="flex justify-between items-center mb-1.5 px-0.5">
                                                <label className="text-[12px] font-bold text-[#b5bac1] uppercase tracking-wide flex items-center">
                                                    {slot.label}
                                                    {slot.required && <span className="text-[#f23f42] ml-0.5 font-normal">*</span>}
                                                </label>
                                                {selectedSlot === index && (
                                                    <button onClick={(e) => removeComponent(index, e)} className="text-gray-400 hover:text-[#f23f42]">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* READ ONLY INPUT */}
                                            <div className="pointer-events-none">
                                                {slot.type === 4 ? (
                                                    <div className={`bg-[#1e1f22] rounded-[3px] w-full px-3 py-2 text-[16px] text-[#dbdee1] flex border border-[#1e1f22] ${slot.style === 2 ? "h-[100px] items-start" : "h-[40px] items-center"}`}>
                                                        <span className="opacity-50 truncate w-full font-normal select-none">{slot.placeholder || ""}</span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-[#1e1f22] rounded-[3px] w-full h-[40px] px-3 flex items-center justify-between text-[16px] text-[#dbdee1] border border-[#1e1f22]">
                                                        <span className="opacity-50 truncate font-normal select-none">{slot.placeholder || "Bitte wählen..."}</span>
                                                        <ChevronDown className="w-5 h-5 opacity-70" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="bg-[#2b2d31] p-4 flex justify-end gap-3 rounded-b-[12px] border-t border-[#202225]">
                            <div className="text-white text-[14px] font-medium px-4 py-2 hover:underline cursor-not-allowed opacity-80 flex items-center">Abbrechen</div>
                            <div className="bg-[#5865F2] text-white text-[14px] font-medium px-6 py-2 rounded-[3px] hover:bg-[#4752c4] cursor-not-allowed shadow-sm transition-colors">Absenden</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SPALTE 3: PROPERTIES (Rechts) --- */}
            <div className="w-[320px] bg-[#2b2d31] border-l border-[#1e1f22] flex flex-col shrink-0 overflow-y-auto custom-scroll h-full">
                <div className="p-5 border-b border-[#1e1f22] bg-[#232428] sticky top-0 z-10">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-[#5865F2]" />
                        {selectedSlot !== null && slots[selectedSlot] ? "Bearbeiten" : "Einstellungen"}
                    </h3>
                </div>

                <div className="p-6 space-y-6">
                    {/* LEERER SLOT AUSGEWÄHLT? -> ZEIGE ADD BUTTONS */}
                    {selectedSlot !== null && !slots[selectedSlot] && (
                        <div className="space-y-4 animate-in fade-in">
                            <Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Element hinzufügen</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <ToolBtn label="Kurzer Text" icon={<Type/>} onClick={() => addComponent(selectedSlot, 4)}/>
                                <ToolBtn label="Langer Text" icon={<AlignJustify/>} onClick={() => { addComponent(selectedSlot, 4); updateComponent(selectedSlot, 'style', 2); }}/>
                                <ToolBtn label="Select Menu" icon={<List/>} onClick={() => addComponent(selectedSlot, 3)}/>
                                <ToolBtn label="User Select" icon={<Users/>} onClick={() => addComponent(selectedSlot, 5)}/>
                                <ToolBtn label="Role Select" icon={<Shield/>} onClick={() => addComponent(selectedSlot, 6)}/>
                                <ToolBtn label="Channel" icon={<Hash/>} onClick={() => addComponent(selectedSlot, 8)}/>
                            </div>
                        </div>
                    )}

                    {/* SLOT BEARBEITEN */}
                    {activeComp && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Frage (Label)</Label>
                                <Input value={activeComp.label} onChange={e => updateComponent(selectedSlot, 'label', e.target.value)} className="bg-[#1e1f22] border-none text-white h-10 text-sm focus-visible:ring-1 focus-visible:ring-[#5865F2]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Custom ID</Label>
                                <Input value={activeComp.customId} onChange={e => updateComponent(selectedSlot, 'customId', e.target.value)} className="bg-[#1e1f22] border-none text-blue-300 font-mono h-10 text-sm focus-visible:ring-1 focus-visible:ring-[#5865F2]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Platzhalter</Label>
                                <Input value={activeComp.placeholder} onChange={e => updateComponent(selectedSlot, 'placeholder', e.target.value)} className="bg-[#1e1f22] border-none text-gray-300 h-10 text-sm focus-visible:ring-1 focus-visible:ring-[#5865F2]" />
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                <input type="checkbox" checked={activeComp.required} onChange={e => updateComponent(selectedSlot, 'required', e.target.checked)} className="w-4 h-4 rounded bg-[#1e1f22] border-[#404249] accent-[#5865F2]" />
                                <Label className="text-sm text-white select-none">Pflichtfeld?</Label>
                            </div>
                            {/* Option Editor for Selects */}
                            {activeComp.type === 3 && (
                                <div className="space-y-3 pt-3 border-t border-white/5">
                                    <div className="flex justify-between items-center"><Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Optionen</Label><button onClick={() => addOption(selectedSlot)} className="text-[10px] bg-[#5865F2] px-2 py-1 rounded text-white">+ Add</button></div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll">
                                        {activeComp.options.map((opt, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-[#1e1f22] p-1.5 rounded"><Input value={opt.label} onChange={e => updateOption(selectedSlot, i, 'label', e.target.value)} className="bg-transparent border-none text-white h-6 text-xs p-0 px-1" placeholder="Label" /><Input value={opt.value} onChange={e => updateOption(selectedSlot, i, 'value', e.target.value)} className="bg-transparent border-none text-blue-300 h-5 text-[10px] p-0 px-1 font-mono" placeholder="val" /><button onClick={() => removeOption(selectedSlot, i)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GLOBAL SETTINGS (wenn nichts ausgewählt) */}
                    {selectedSlot === null && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#b5bac1] uppercase">Modal Custom ID</Label>
                                <Input value={modalSettings.customId} onChange={e => setModalSettings({...modalSettings, customId: e.target.value})} className="bg-[#1e1f22] border-none text-blue-300 font-mono h-10 text-sm" />
                            </div>
                            <div className="bg-[#5865F2]/10 p-4 rounded border border-[#5865F2]/20"><p className="text-xs text-[#5865F2]">Klicke auf einen Slot in der Mitte.</p></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ToolBtn({ label, icon, onClick }) {
    return (
        <button onClick={onClick} className="flex items-center gap-3 w-full p-2 rounded bg-[#1e1f22] hover:bg-[#35373c] text-gray-300 hover:text-white transition-colors group border border-transparent hover:border-[#5865F2]">
            <div className="text-gray-500 group-hover:text-[#5865F2]">{icon}</div>
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}