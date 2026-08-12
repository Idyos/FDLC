export interface RoundScheduleMatch {
  id: string;
  roundNumber: number;
  position: number;
}

export interface FillRoundsResult {
  /** matchId -> offset in minutes from the shared origin used by the caller. */
  schedules: Record<string, number>;
  /** Offset in minutes at which the next (unfed) round would start. */
  nextRoundStartMins: number;
}

/** Packs matches into concurrency-limited slots, round by round, so round N+1
 *  never starts before round N's slots end. `fromRoundStartMins` lets a caller
 *  continue filling from where an earlier round (scheduled elsewhere) left off. */
export function fillRoundsSequentially(
  matches: RoundScheduleMatch[],
  durationMinutes: number,
  concurrencyLimit: number,
  fromRoundStartMins: number = 0
): FillRoundsResult {
  const sorted = [...matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.position - b.position
  );

  const byRound = new Map<number, RoundScheduleMatch[]>();
  sorted.forEach((m) => {
    if (!byRound.has(m.roundNumber)) byRound.set(m.roundNumber, []);
    byRound.get(m.roundNumber)!.push(m);
  });

  const schedules: Record<string, number> = {};
  let roundStartMins = fromRoundStartMins;

  for (const roundNum of [...byRound.keys()].sort((a, b) => a - b)) {
    const roundMatches = byRound.get(roundNum)!;
    roundMatches.forEach((match, idx) => {
      const slotIdx = Math.floor(idx / concurrencyLimit);
      schedules[match.id] = roundStartMins + slotIdx * durationMinutes;
    });
    roundStartMins += Math.ceil(roundMatches.length / concurrencyLimit) * durationMinutes;
  }

  return { schedules, nextRoundStartMins: roundStartMins };
}
