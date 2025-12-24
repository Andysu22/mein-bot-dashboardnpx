import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CustomCommand from "@/models/CustomCommand";

// Hilfsfunktion: Pusht die Commands an Discord
async function pushCommandsToDiscord(guildId) {
  const botToken = process.env.DISCORD_TOKEN;
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

  const dbCommands = await CustomCommand.find({ guildId });

  const discordCommands = dbCommands.map((cmd) => ({
    name: cmd.name,
    description: cmd.description,
    type: 1, // Slash Command
  }));

  const response = await fetch(
    `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordCommands),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Discord API Error:", errorText);
    throw new Error("Konnte Commands nicht bei Discord registrieren.");
  }
}

// GET
export async function GET(req, { params }) {
  const { id: guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const commands = await CustomCommand.find({ guildId }).sort({ createdAt: -1 });
  return NextResponse.json(commands);
}

// POST
export async function POST(req, { params }) {
  const { id: guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const {
      name,
      description,
      response,
      ephemeral,
      type = "text",
      builderData = null,
    } = body;

    const cleanName = String(name || "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (!cleanName) {
      return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
    }

    if (!response) {
      return NextResponse.json({ error: "Response fehlt" }, { status: 400 });
    }

    await dbConnect();

    const count = await CustomCommand.countDocuments({ guildId });
    if (count >= 50) return NextResponse.json({ error: "Limit erreicht" }, { status: 403 });

    const newCmd = await CustomCommand.create({
      guildId,
      name: cleanName,
      description: description || "Custom Command",
      type,
      response,
      ephemeral: !!ephemeral,
      builderData: builderData ?? null,
    });

    await pushCommandsToDiscord(guildId);

    return NextResponse.json(newCmd);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req, { params }) {
  const { id: guildId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commandId = searchParams.get("commandId");

  await dbConnect();
  await CustomCommand.findOneAndDelete({ _id: commandId, guildId });

  try {
    await pushCommandsToDiscord(guildId);
  } catch (e) {
    console.error("Fehler beim Sync mit Discord:", e);
  }

  return NextResponse.json({ success: true });
}
