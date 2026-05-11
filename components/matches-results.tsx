"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { MatchCard, MatchCardMatch } from "@/components/match-card";

interface MatchesResultsProps {
  matches: MatchCardMatch[];
  currentUserId: string;
  myTentacleId: string;
  myAvailability: string;
  subjectLabel: string;
  error: Error | null;
}

export function MatchesResults({
  matches,
  currentUserId,
  myTentacleId,
  myAvailability,
  subjectLabel,
  error,
}: MatchesResultsProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, dotIndex) => (
            <span
              key={dotIndex}
              className="h-4 w-4 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${dotIndex * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-2xl font-semibold text-foreground">
          Finding your chavruta
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-sm text-destructive">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-muted-foreground">
          We couldn’t load matches right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/10 p-10 text-center">
        <Search className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-semibold">No matches yet</p>
        <p className="text-muted-foreground">
          As more people join, matches will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          currentUserId={currentUserId}
          myTentacleId={myTentacleId}
          myAvailability={myAvailability}
          subjectLabel={subjectLabel}
        />
      ))}
    </div>
  );
}
