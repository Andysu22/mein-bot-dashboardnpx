"use client";
import React from "react";
import DiscordMarkdown from "../shared/DiscordMarkdown";

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : "#5865F2";
}

export default function EmbedPreview({ 
  embed,       // Das Embed Daten-Objekt
  content,     // Der Text ÜBER dem Embed
  botName,     // Name des Bots
  botIconUrl,  // Profilbild URL
  timestamp    // Datum
}) {
  // Fallbacks, falls Daten leer sind
  const data = embed || {};
  const color = toHexColor(data.color);
  const name = botName || "Ticket Bot";
  // Standard Discord Icon als Fallback
  const avatar = botIconUrl || "https://cdn.discordapp.com/embed/avatars/0.png"; 
  const time = timestamp || new Date();

  return (
    <div className="w-full font-sans text-left">
      {/* Container für die ganze Nachricht */}
      <div className="flex gap-4 py-0.5 hover:bg-[#040405]/7 rounded -mx-2 px-2 transition-colors group items-start">
        
        {/* LINKER TEIL: Profilbild */}
        <div className="flex-shrink-0 cursor-pointer mt-0.5">
          <img 
            src={avatar} 
            className="w-10 h-10 rounded-full bg-gray-700 hover:opacity-80 transition-opacity object-cover" 
            alt="Bot Avatar" 
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        {/* RECHTER TEIL: Header, Content, Embed */}
        <div className="min-w-0 flex-1">
          
          {/* Header Zeile: Name, APP-Tag, Zeit */}
          <div className="flex items-center gap-1.5 mb-1 leading-none">
            <span className="text-white font-medium hover:underline cursor-pointer text-[1rem]">
              {name}
            </span>
            <span className="bg-[#5865F2] text-white text-[0.625rem] px-1.5 rounded-[0.25rem] h-[0.9375rem] flex items-center font-bold mt-[1px] leading-none select-none">
              APP
            </span>
            <span className="text-xs text-[#949BA4] ml-1 font-medium mt-0.5 select-none">
              Today at {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>

          {/* Nachrichtentext (Content) */}
          {content && (
            <div className="text-[#dbdee1] text-[0.9375rem] leading-[1.375rem] whitespace-pre-wrap break-words mb-1">
              <DiscordMarkdown text={content} />
            </div>
          )}

          {/* Das Embed selbst */}
          {/* Der farbige Strich ist hier border-l-4 direkt am Container */}
          <div 
            className="grid max-w-[520px] rounded bg-[#2b2d31] overflow-hidden border-l-4 box-border"
            style={{ borderLeftColor: color }}
          >
            <div className="grid gap-2 p-4">
              
              {/* Obere Reihe: Author, Title, Description + Thumbnail rechts */}
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  
                  {/* Author */}
                  {(data.author?.name || data.author?.icon_url) && (
                    <div className="flex items-center gap-2 mb-1">
                      {data.author.icon_url && (
                        <img 
                          src={data.author.icon_url} 
                          className="w-6 h-6 rounded-full object-cover bg-gray-700" 
                          alt="" 
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      )}
                      <span className="text-sm font-bold text-white truncate cursor-pointer hover:underline">
                        <DiscordMarkdown text={data.author.name} />
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  {data.title && (
                    <div className="text-base font-bold text-white break-words cursor-pointer hover:underline">
                      <DiscordMarkdown text={data.title} />
                    </div>
                  )}
                  
                  {/* Description */}
                  {data.description && (
                    <div className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                      <DiscordMarkdown text={data.description} />
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                {data.thumbnail_url && (
                  <img 
                    src={data.thumbnail_url} 
                    className="w-20 h-20 rounded object-cover flex-shrink-0" 
                    alt="Thumbnail"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* Fields */}
              {(data.fields || []).length > 0 && (
                <div className="grid grid-cols-12 gap-2 mt-1">
                  {data.fields.map(f => (
                    <div key={f.id} className={f.inline ? "col-span-4" : "col-span-12"}>
                      <div className="text-xs font-bold text-[#b5bac1] mb-1 truncate">
                        <DiscordMarkdown text={f.name} />
                      </div>
                      <div className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-snug">
                        <DiscordMarkdown text={f.value} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Großes Bild unten */}
              {data.image_url && (
                <div className="mt-1 rounded overflow-hidden cursor-pointer">
                  <img 
                    src={data.image_url} 
                    className="max-w-full h-auto object-cover" 
                    alt="Image" 
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}

              {/* Footer & Timestamp */}
              {(data.footer?.text || data.footer?.icon_url || data.timestamp) && (
                <div className="flex items-center gap-2 text-xs text-[#b5bac1] font-medium pt-1 mt-1">
                  {data.footer?.icon_url && (
                    <img 
                      src={data.footer.icon_url} 
                      className="w-5 h-5 rounded-full object-cover bg-gray-700" 
                      alt="" 
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <span>
                    {data.footer?.text && <span className="mr-1">{data.footer.text}</span>}
                    {data.footer?.text && data.timestamp && <span className="mx-1">•</span>}
                    {data.timestamp && <span>Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}