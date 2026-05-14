import { useEffect, useState } from "react";
import { getProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";
import type { Match } from "@/utils/bracketCreator";
import LoadingAnimation from "@/components/shared/loadingAnim";

interface Props {
  year: number;
  provaId: string;
  subProvaId?: string;
}

function formatTime(timeStr: string): string {
  return timeStr || "—";
}

function MatchScheduleCard({ match, time }: { match: Match; time: string }) {
  const nameA = match.teams[0]?.displayName ?? "Pendent";
  const nameB = match.teams[1]?.displayName ?? "Pendent";
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-neutral-800 shadow-sm border">
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">
          {match.roundName} · {match.position}
        </span>
        <span className="font-medium text-sm truncate">
          {nameA} vs {nameB}
        </span>
      </div>
      <span className="text-sm font-mono text-gray-600 dark:text-neutral-300 whitespace-nowrap shrink-0">
        {formatTime(time)}
      </span>
    </div>
  );
}

export default function PublicBracketHoraris({ year, provaId, subProvaId }: Props) {
  const [schedulableMatches, setSchedulableMatches] = useState<Match[]>([]);
  const [matchSchedules, setMatchSchedules] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasSchedules, setHasSchedules] = useState(false);

  useEffect(() => {
    if (!provaId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getProvaBracket(year, provaId, subProvaId)
      .then((doc) => {
        if (doc?.finalStage?.bracket?.matches) {
          const sorted = [...doc.finalStage.bracket.matches]
            .filter((m) => m.status !== "bye")
            .sort((a, b) => a.roundNumber - b.roundNumber || a.position - b.position);
          setSchedulableMatches(sorted);
          const schedules = doc.matchSchedules ?? {};
          setMatchSchedules(schedules);
          setHasSchedules(Object.values(schedules).some((t) => !!t));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [year, provaId, subProvaId]);

  if (isLoading) return <div className="p-4"><LoadingAnimation /></div>;

  if (!hasSchedules || schedulableMatches.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Encara no hi ha horaris disponibles per a aquesta prova.
        </p>
      </div>
    );
  }

  const grouped: Record<string, Match[]> = {};
  schedulableMatches.forEach((m) => {
    const t = matchSchedules[m.id] ?? "";
    (grouped[t] ??= []).push(m);
  });

  const sortedTimes = Object.keys(grouped)
    .filter((t) => t)
    .sort();
  const unscheduled = grouped[""] ?? [];

  return (
    <div className="p-4 space-y-4">
      {sortedTimes.map((time) => (
        <div key={time}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {time}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,_minmax(280px,_1fr))] gap-3">
            {grouped[time].map((match) => (
              <MatchScheduleCard key={match.id} match={match} time={time} />
            ))}
          </div>
        </div>
      ))}
      {unscheduled.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Sense horari
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,_minmax(280px,_1fr))] gap-3">
            {unscheduled.map((match) => (
              <MatchScheduleCard key={match.id} match={match} time="" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
