import { Skeleton } from "@/components/ui/skeleton";

export default function TicketSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Header Bereich simulieren */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" /> {/* Titel */}
        <Skeleton className="h-10 w-32" /> {/* Button */}
      </div>

      {/* 3-4 Fake-Tickets simulieren */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-xl bg-card/50">
          {/* Avatar Kreis */}
          <Skeleton className="h-12 w-12 rounded-full" />
          
          <div className="space-y-2 flex-1">
            {/* Ticket Titel Zeile */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Untertitel Zeile */}
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}