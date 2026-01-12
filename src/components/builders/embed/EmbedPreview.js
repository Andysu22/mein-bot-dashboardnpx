"use client";

import React from "react";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : "#5865F2";
}

function renderFieldContent(text) {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      let content = part.slice(3, -3);

      if (/^[a-zA-Z0-9]+\n/.test(content)) {
        content = content.replace(/^[a-zA-Z0-9]+\n/, "");
      }

      return (
        <div key={index} className="discord-md__codeblock relative group pr-8 mt-1">
          {content}
          <div className="absolute top-2 right-2 p-1 rounded bg-[#1e1f22] text-[#b5bac1] opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
            <Copy className="w-3.5 h-3.5" />
          </div>
        </div>
      );
    }

    if (!part.trim()) return null;
    return <DiscordMarkdown key={index} text={part} />;
  });
}

export default function EmbedPreview({
  embed,
  content,
  botName,
  botIconUrl,
  timestamp,
  children,
}) {
  const data = embed || {};
  const color = toHexColor(data.color);

  const name = botName || "Ticketbot";
  
  const avatar = (botIconUrl && botIconUrl.includes("http") && !botIconUrl.includes("embed/avatars/0.png")) 
    ? botIconUrl 
    : "/logo.svg";

  const time = timestamp || new Date();

  const rightImage =
    data.settings?.showApplicantAvatar
      ? data.applicant?.avatar_url
      : data.thumbnail_url;

  return (
    <div className="w-full p-4 font-['gg_sans',_sans-serif] text-left leading-[1.375rem]">
      <div className="flex gap-4">
        {/* Avatar ohne Hintergrund-Kreis */}
        <img
          src={avatar}
          className="w-10 h-10 rounded-full shrink-0 object-contain mt-[2px]"
          alt="Bot Avatar"
          onError={(e) => { e.currentTarget.src = "/logo.svg"; }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-white text-[1rem] font-medium cursor-default">
              {name}
            </span>
            <span className="bg-[#5865F2] text-white text-[0.625rem] px-1.25 py-[1px] rounded-[3px] font-semibold flex items-center h-[15px]">
              BOT
            </span>
            <span className="text-[0.75rem] text-[#949ba4] font-medium ml-0.5">
              Today at{" "}
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {content && (
            <div className="text-[#dbdee1] text-[0.9375rem] mb-2 leading-relaxed">
              <DiscordMarkdown text={content} />
            </div>
          )}

          <div className="flex max-w-[520px]">
            <div
              className="w-[4px] rounded-l shrink-0"
              style={{ backgroundColor: color }}
            />

            <div className="bg-[#2b2d31] rounded-r w-full p-3 pr-4">
              <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  {data.title && (
                    <div className="text-white text-[1rem] font-bold mb-2 break-words leading-[1.375rem]">
                      {data.title}
                    </div>
                  )}

                  {data.description && (
                    <div className="text-[#dbdee1] text-[0.875rem] break-words leading-[1.125rem]">
                      <DiscordMarkdown text={data.description} />
                    </div>
                  )}
                </div>

                {rightImage && (
                  <img
                    src={rightImage}
                    className="w-[80px] h-[80px] rounded object-cover shrink-0 ml-2"
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {Array.isArray(data.fields) && data.fields.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                  {data.fields.map((field) => (
                    <div
                      key={field.id}
                      className={cn(
                        field.inline ? "w-[calc(33.333%-1rem)]" : "w-full"
                      )}
                    >
                      <div className="text-white text-[0.875rem] font-bold mb-0.5">
                        <DiscordMarkdown text={field.name} />
                      </div>
                      
                      <div className="text-[0.875rem] text-[#dbdee1] leading-[1.125rem]">
                        {renderFieldContent(field.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.image_url && (
                <div className="mt-4">
                  <img
                    src={data.image_url}
                    className="rounded max-w-full max-h-[300px] object-cover w-full"
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}

              {(data.footer?.text ||
                data.footer?.icon_url ||
                data.timestamp) && (
                <div className="mt-2 flex items-center gap-2 text-[0.75rem] text-[#949ba4] font-medium">
                  {data.footer?.icon_url && (
                    <img
                      src={data.footer.icon_url}
                      className="w-5 h-5 rounded-full object-cover"
                      alt=""
                    />
                  )}
                  <span className="flex items-center gap-1 flex-wrap leading-[1rem]">
                    {data.footer?.text && <span>{data.footer.text}</span>}
                    {data.footer?.text && data.timestamp && <span>•</span>}
                    {data.timestamp && (
                      <span>
                        Today at{" "}
                        {time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}