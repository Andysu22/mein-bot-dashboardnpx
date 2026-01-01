import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ accentColor: "#5865F2", theme: "dark" });

  await connectDB();
  const user = await User.findOne({ userId: session.user.id });
  
  return NextResponse.json({ 
    accentColor: user?.accentColor || "#5865F2",
    theme: user?.theme || "dark"
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updateData = {};

    // Validierung und Update für Farbe
    if (body.accentColor) {
        if (!/^#[0-9A-F]{6}$/i.test(body.accentColor)) {
            return NextResponse.json({ error: "Invalid color" }, { status: 400 });
        }
        updateData.accentColor = body.accentColor;
    }

    // Validierung und Update für Theme
    if (body.theme) {
        if (!["light", "dark"].includes(body.theme)) {
            return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
        }
        updateData.theme = body.theme;
    }

    await connectDB();
    const user = await User.findOneAndUpdate(
      { userId: session.user.id },
      updateData,
      { new: true, upsert: true }
    );

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}