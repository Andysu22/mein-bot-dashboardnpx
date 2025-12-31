"use client";

import React from "react";
import DiscordMarkdown from "@/components/builders/shared/DiscordMarkdown";
import { cn } from "@/lib/utils";
// ✅ NEU: Icon importieren
import { Copy } from "lucide-react";

function toHexColor(s) {
  const t = String(s ?? "").trim();
  if (!t) return "#5865F2";
  const v = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : "#5865F2";
}

// Funktion um Codeblöcke manuell zu rendern (jetzt mit visuellem Copy-Icon)
function renderFieldContent(text) {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      let content = part.slice(3, -3);

      if (/^[a-zA-Z0-9]+\n/.test(content)) {
        content = content.replace(/^[a-zA-Z0-9]+\n/, "");
      }

      // ✅ ÄNDERUNG HIER:
      return (
        // 1. 'relative' und 'group' hinzufügen
        <div key={index} className="discord-md__codeblock relative group pr-8">
          {content}
          {/* 2. Das visuelle Copy-Icon */}
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

  const name = botName || "Application Bot";
  const avatar =
    botIconUrl || "https://cdn.discordapp.com/embed/avatars/0.png";
  const time = timestamp || new Date();

  const rightImage =
    data.settings?.showApplicantAvatar
      ? data.applicant?.avatar_url
      : data.thumbnail_url;

  return (
    <div className="w-full bg-[#313338] rounded-xl border border-[#2b2d31] p-4 font-sans text-left">
      <div className="flex gap-3">
        {/* BOT AVATAR */}
        <img
          src={avatar}
          className="w-10 h-10 rounded-full bg-[#1e1f22] shrink-0"
          alt="Bot Avatar"
        />

        <div className="flex-1 min-w-0">
          {/* HEADER */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-medium hover:underline cursor-pointer">
              {name}
            </span>
            <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded">
              BOT
            </span>
            <span className="text-xs text-[#949ba4]">
              Today at{" "}
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* MESSAGE CONTENT */}
          {content && (
            <div className="text-[#dbdee1] text-sm mb-2 leading-relaxed">
              <DiscordMarkdown text={content} />
            </div>
          )}

          {/* EMBED */}
          <div className="flex max-w-full">
            <div
              className="w-[4px] rounded-l shrink-0"
              style={{ backgroundColor: color }}
            />

            <div className="bg-[#2b2d31] rounded-r w-full p-3.5">
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  {data.title && (
                    <div className="text-white font-bold mb-1 break-words">
                      {data.title}
                    </div>
                  )}

                  {data.description && (
                    <div className="text-[#dbdee1] text-sm mb-2 break-words leading-relaxed">
                      <DiscordMarkdown text={data.description} />
                    </div>
                  )}
                </div>

                {rightImage && (
                  <img
                    src={rightImage}
                    className="w-[80px] h-[80px] rounded object-cover shrink-0"
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* FIELDS */}
              {Array.isArray(data.fields) && data.fields.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-2">
                  {data.fields.map((field) => (
                    <div
                      key={field.id}
                      className={cn(
                        field.inline ? "w-[calc(33.333%-1rem)]" : "w-full"
                      )}
                    >
                      <div className="text-white font-bold text-sm mb-1">
                        <DiscordMarkdown text={field.name} />
                      </div>
                      
                      <div
                        className={cn(
                          "embed-field-value text-sm text-[#dbdee1]",
                          !field.inline && "embed-field-value--large"
                        )}
                      >
                        {renderFieldContent(field.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.image_url && (
                <div className="mt-3">
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
                <div className="pt-2 mt-2 flex items-center gap-2 text-xs text-[#949ba4]">
                  {data.footer?.icon_url && (
                    <img
                      src={data.footer.icon_url}
                      className="w-5 h-5 rounded-full object-cover"
                      alt=""
                    />
                  )}
                  <span className="flex items-center gap-1 flex-wrap">
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
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}