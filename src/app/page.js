"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link"; 

export default function Home() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <h1 className="text-3xl font-bold">Hallo, {session.user.name}! 👋</h1>
        {session.user.image && (
          <img 
            src={session.user.image} 
            alt="Avatar" 
            className="rounded-full w-24 h-24 border-4 border-slate-200"
          />
        )}
        <p className="text-muted-foreground">Du bist erfolgreich eingeloggt.</p>
        
        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button>Zum Dashboard</Button>
          </Link>
          
          <Button variant="destructive" onClick={() => signOut()}>
            Ausloggen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Bot Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Verwalte deinen Server-Bot einfach und sicher.
        </p>
      </div>
      
      <Button size="lg" onClick={() => signIn("discord")}>
        Login mit Discord
      </Button>
    </div>
  );
}