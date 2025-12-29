"use client";
import React from "react";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";
import { cn } from "@/lib/utils"; 

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : "#5865F2";
}

export default function EmbedPreview({ 
  embed,       
  content,     
  botName,     
  botIconUrl,  
  timestamp,
  children 
}) {
  const data = embed || {};
  const color = toHexColor(data.color);
  const name = botName || "Ticket Bot";
  const avatar = botIconUrl || "https://cdn.discordapp.com/embed/avatars/0.png";
  const time = timestamp || new Date();

  return (
    <div className="w-full font-sans text-left bg-[#313338] rounded-xl overflow-hidden p-4 border border-[#2b2d31]">
      <div className="flex gap-3 sm:gap-4 hover:bg-[#2e3035]/60 -ml-2 p-2 rounded pr-4 group items-start transition-colors">
        <div className="shrink-0 cursor-pointer mt-0.5">
          <img 
            src={avatar} 
            className="w-10 h-10 rounded-full hover:opacity-80 transition shadow-sm bg-[#1e1f22]" 
            alt="Bot Avatar" 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-medium hover:underline cursor-pointer">{name}</span>
            <span className="bg-[#5865F2] text-[10px] text-white px-1.5 rounded-[3px] flex items-center h-[15px] font-medium leading-none tracking-wide mt-[1px]">BOT</span>
            <span className="text-xs text-[#949ba4] ml-0.5">
                Today at {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>

          {content && (
            <div className="text-[#dbdee1] text-[15px] mb-2 leading-relaxed whitespace-pre-wrap break-words">
              <DiscordMarkdown text={content} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row max-w-full">
            <div className="w-[4px] rounded-l-[4px] shrink-0" style={{ backgroundColor: color }}></div>
            <div className="bg-[#2b2d31] rounded-r-[4px] grid gap-2 w-full border border-l-0 border-[#2b2d31] max-w-full">
              <div className="p-3.5 grid gap-2"> {/* Padding slightly reduced for tighter feel */}
                <div className="flex gap-4 justify-between items-start">
                  <div className="grid gap-1.5 w-full min-w-0">
                    {data.author?.name && (
                      <div className="flex items-center gap-2 mb-1">
                        {data.author.icon_url && <img src={data.author.icon_url} className="w-6 h-6 rounded-full object-cover" alt="" />}
                        <span className="text-sm font-bold text-white truncate">{data.author.name}</span>
                      </div>
                    )}
                    {data.title && (
                      <div className="text-base font-bold text-white break-words leading-snug">
                        <DiscordMarkdown text={data.title} />
                      </div>
                    )}
                    {data.description && (
                      <div className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed break-words">
                        <DiscordMarkdown text={data.description} />
                      </div>
                    )}
                    
                    {/* Fields */}
                    {data.fields && data.fields.length > 0 && (
                      <div className="grid gap-2 mt-2 grid-cols-12">
                        {data.fields.map((field) => (
                          <div key={field.id} className={cn("min-w-0", field.inline ? "col-span-4" : "col-span-12")}>
                            <div className="text-sm font-bold text-white mb-0.5 truncate">{field.name}</div>
                            <div className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed break-words">
                                <DiscordMarkdown text={field.value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {data.thumbnail_url && <div className="shrink-0"><img src={data.thumbnail_url} className="w-[80px] h-[80px] rounded object-cover" alt="Thumbnail" onError={(e) => (e.currentTarget.style.display = "none")} /></div>}
                </div>
                {data.image_url && <div className="mt-2"><img src={data.image_url} className="rounded max-w-full max-h-[300px] object-cover w-full" alt="Main Image" onError={(e) => (e.currentTarget.style.display = "none")} /></div>}
                
                {/* FOOTER & TIMESTAMP */}
                {(data.footer?.text || data.footer?.icon_url || data.timestamp) && (
                  <div className="pt-2 mt-1 flex items-center gap-2 text-xs text-[#949ba4] font-medium border-t border-transparent">
                    {data.footer?.icon_url && <img src={data.footer.icon_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
                    <span className="flex items-center gap-1 flex-wrap">
                      {data.footer?.text && <span>{data.footer.text}</span>}
                      {data.footer?.text && data.timestamp && <span>•</span>}
                      {data.timestamp && <span>Today at {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Row Buttons */}
          {children && (
             <div className="mt-3">
                {children}
             </div>
          )}

        </div>
      </div>
    </div>
  );
}