"use client";
import React from "react";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown"; 

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
            className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity object-cover shadow-sm" 
            alt="Bot Avatar" 
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 leading-snug">
            <span className="text-white font-medium hover:underline cursor-pointer">{name}</span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded-[3px] flex items-center h-[15px] font-medium leading-none mt-[1px]">BOT</span>
            <span className="text-xs text-[#949BA4] ml-1 font-medium select-none">Today at {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          {content && (
            <div className="text-[#dbdee1] text-[15px] whitespace-pre-wrap break-words mb-2 leading-[1.375rem]">
              <DiscordMarkdown text={content} />
            </div>
          )}
          <div className="flex flex-col w-fit max-w-full sm:max-w-[520px] rounded bg-[#2b2d31] overflow-hidden border-l-4 shadow-sm" style={{ borderLeftColor: color }}>
            <div className="flex p-4 gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                {(data.author?.name || data.author?.icon_url) && (
                  <div className="flex items-center gap-2 mb-1">
                    {data.author.icon_url && <img src={data.author.icon_url} className="w-6 h-6 rounded-full object-cover" alt="" />}
                    <span className="text-sm font-bold text-white truncate hover:underline cursor-pointer"><DiscordMarkdown text={data.author.name} /></span>
                  </div>
                )}
                {data.title && <div className="text-base font-bold text-white break-words hover:underline cursor-pointer leading-tight"><DiscordMarkdown text={data.title} /></div>}
                {data.description && <div className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed"><DiscordMarkdown text={data.description} /></div>}
                {(data.fields || []).length > 0 && (
                  <div className="grid grid-cols-12 gap-2 mt-2">
                    {data.fields.map(f => (
                      <div key={f.id} className={f.inline ? "col-span-4 min-w-[100px]" : "col-span-12"}>
                        <div className="text-xs font-bold text-[#b5bac1] mb-1 truncate"><DiscordMarkdown text={f.name} /></div>
                        <div className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-snug"><DiscordMarkdown text={f.value} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {data.thumbnail_url && <div className="shrink-0"><img src={data.thumbnail_url} className="w-[80px] h-[80px] rounded object-cover" alt="Thumbnail" onError={(e) => (e.currentTarget.style.display = "none")} /></div>}
            </div>
            {data.image_url && <div className="px-4 pb-4 mt-[-8px]"><img src={data.image_url} className="rounded max-w-full max-h-[300px] object-cover w-full" alt="Main Image" onError={(e) => (e.currentTarget.style.display = "none")} /></div>}
            {(data.footer?.text || data.footer?.icon_url || data.timestamp) && (
              <div className="px-4 pb-4 pt-0 flex items-center gap-2 text-xs text-[#949ba4] font-medium">
                {data.footer?.icon_url && <img src={data.footer.icon_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
                <span className="flex items-center gap-1 flex-wrap">
                  {data.footer?.text && <span>{data.footer.text}</span>}
                  {data.footer?.text && data.timestamp && <span>•</span>}
                  {data.timestamp && <span>Today at {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                </span>
              </div>
            )}
          </div>
          {children && (
             <div className="mt-2 flex flex-wrap gap-2">
                {children}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}