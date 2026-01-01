import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. STATS KARTEN (Angepasst an dein StatsCard Layout: Icon Links, Text Rechts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 sm:px-0">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex flex-row items-center gap-4 p-4 bg-card border-border shadow-sm rounded-lg">
            
            {/* ICON PLATZHALTER (Links: 48x48px, rounded-xl) */}
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            
            {/* TEXT PLATZHALTER (Rechts: Title + Value) */}
            <div className="flex flex-col space-y-1 w-full">
               <Skeleton className="h-3 w-20 rounded-full" />  {/* Titel */}
               <Skeleton className="h-7 w-16 rounded-md" />    {/* Wert */}
            </div>
          </Card>
        ))}
      </div>

      {/* 2. MAIN CONTENT (Unverändert übernommen) */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 h-auto xl:h-[calc(100vh-320px)] min-h-[600px] px-2 sm:px-0">
        
        {/* LINKE SPALTE: TICKET LISTE */}
        <Card className="bg-card border-border flex flex-col overflow-hidden shadow-sm h-[400px] xl:h-auto rounded-lg">
          <CardHeader className="bg-muted/30 border-b border-border py-3.5 px-4 flex flex-row justify-between items-center space-y-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </CardHeader>

          {/* overflow-hidden verhindert hier die Scrollbar */}
          <div className="flex-1 overflow-hidden p-2 space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full p-3 rounded-md border border-transparent space-y-2.5 mb-1">
                <Skeleton className="h-4 w-[85%] rounded-sm" />
                <div className="flex justify-between items-center mt-1">
                      <Skeleton className="h-3 w-24 rounded-sm" />
                      <Skeleton className="h-3 w-16 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RECHTE SPALTE: CHAT VERLAUF */}
        <Card className="bg-card border-border flex flex-col shadow-sm h-[600px] xl:h-auto rounded-lg">
          <div className="bg-muted/30 border-b border-border p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
               <Skeleton className="w-5 h-5 rounded-sm" />
               <Skeleton className="h-5 w-48 rounded-md" />
            </div>
            <div className="flex gap-3">
               <Skeleton className="h-4 w-24 rounded-md" />
               <Skeleton className="h-5 w-16 rounded-md bg-muted" />
            </div>
          </div>

          <div className="flex-1 p-6 space-y-8 overflow-hidden bg-muted/20">
            <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-2 flex-1 max-w-[80%]">
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm opacity-50" />
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-[90%] rounded-sm" />
                </div>
              </div>
            </div>
             <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0 bg-primary/20" />
              <div className="space-y-2 flex-1 max-w-[75%]">
                 <div className="flex items-baseline gap-2">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm opacity-50" />
                </div>
                <Skeleton className="h-4 w-full rounded-sm" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}