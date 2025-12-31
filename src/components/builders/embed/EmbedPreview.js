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

// Embed-Felder sind Plain-Text (keine Backticks anzeigen)
function renderPlainField(value) {
  return String(value ?? "")
    .replace(/```/g, "")
    .replace(/`/g, "");
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

  // 👉 Thumbnail-Quelle bestimmen
  const rightImage =
    data.settings?.showApplicantAvatar
      ? data.applicant?.avatar_url
      : data.thumbnail_url;

  return (
    <div className="w-full bg-[#313338] rounded-xl border border-[#2b2d31] p-4">
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
            {/* COLOR BAR */}
            <div
              className="w-[4px] rounded-l shrink-0"
              style={{ backgroundColor: color }}
            />

            {/* EMBED BODY */}
            <div className="bg-[#2b2d31] rounded-r w-full p-3.5">
              {/* TITLE + DESCRIPTION + THUMBNAIL */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  {data.title && (
                    <div className="text-white font-bold mb-1 break-words">
                      <DiscordMarkdown text={data.title} />
                    </div>
                  )}

                  {data.description && (
                    <div className="text-[#dbdee1] text-sm mb-2 break-words leading-relaxed">
                      <DiscordMarkdown text={data.description} />
                    </div>
                  )}
                </div>

                {/* RIGHT IMAGE (Thumbnail oder Applicant Avatar) */}
                {rightImage && (
                  <img
                    src={rightImage}
                    className="w-[80px] h-[80px] rounded object-cover shrink-0"
                    alt=""
                    onError={(e) =>
                      (e.currentTarget.style.display = "none")
                    }
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
                        field.inline
                          ? "w-[calc(33.333%-1rem)]"
                          : "w-full"
                      )}
                    >
                      <div className="text-white font-bold text-sm mb-1 truncate">
                        {field.name}
                      </div>
                      <div
                        className={cn(
                          "embed-field-value",
                          !field.inline && "embed-field-value--large"
                        )}
                      >
                        {renderPlainField(field.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MAIN IMAGE */}
              {data.image_url && (
                <div className="mt-3">
                  <img
                    src={data.image_url}
                    className="rounded max-w-full max-h-[300px] object-cover w-full"
                    alt=""
                    onError={(e) =>
                      (e.currentTarget.style.display = "none")
                    }
                  />
                </div>
              )}

              {/* FOOTER */}
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
                    {data.footer?.text && (
                      <span>{data.footer.text}</span>
                    )}
                    {data.footer?.text && data.timestamp && (
                      <span>•</span>
                    )}
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

          {/* ACTION ROW (Buttons etc.) */}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
