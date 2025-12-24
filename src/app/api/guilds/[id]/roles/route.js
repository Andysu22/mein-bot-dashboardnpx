import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("[API Error] DISCORD_TOKEN is missing in .env");
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Discord API] Fetch Roles failed for guild ${id}. Status: ${res.status}`);
      return NextResponse.json([], { status: 200 });
    }

    const roles = await res.json();
    // sort by position desc like Discord
    const sorted = Array.isArray(roles)
      ? roles.sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
      : [];
    return NextResponse.json(sorted, { status: 200 });
  } catch (e) {
    console.error("[API Error] Fetch Roles failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
