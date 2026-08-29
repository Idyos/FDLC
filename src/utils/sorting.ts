import { ParticipatingPenya, WinDirection } from "@/interfaces/interfaces";

/** Splits proves into upcoming (today onwards, soonest first) and past
 *  (yesterday or before, most recent first) — so schedule lists show what's
 *  coming up next before burying it under everything already played. */
export function splitProvesByDate<T extends { startDate?: Date }>(
  proves: T[]
): { upcoming: T[]; past: T[] } {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcoming: T[] = [];
  const past: T[] = [];

  for (const prova of proves) {
    if (prova.startDate && prova.startDate.getTime() >= startOfToday.getTime()) {
      upcoming.push(prova);
    } else {
      past.push(prova);
    }
  }

  upcoming.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0));
  past.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));

  return { upcoming, past };
}

export type SortMode =
  | "name-asc"
  | "name-desc"
  | "result-asc"
  | "result-desc"
  | "time-asc"
  | "time-desc";

/** Assigns standard competition ("1224") ranking positions to a list already
 *  sorted best-to-worst: items tied per `isTie` share the same position, and
 *  the next distinct value's position skips ahead to account for the ties
 *  (e.g. a four-way tie for 1st → the next position is 5, not 2). */
export function assignStandardCompetitionPositions<T>(
  sorted: T[],
  isTie: (a: T, b: T) => boolean
): number[] {
  const positions: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    positions.push(i > 0 && isTie(sorted[i], sorted[i - 1]) ? positions[i - 1] : i + 1);
  }
  return positions;
}

export function rankParticipants(
  participants: ParticipatingPenya[],
  winDirection: WinDirection
): ParticipatingPenya[] {
  const valid = participants.filter((p) => p.participates && p.result && p.result !== "");
  const invalid = participants.filter((p) => !p.participates || !p.result || p.result === "");

  const resultOf = (p: ParticipatingPenya) => parseInt(p.result ?? "0") || 0;

  let validPositions: number[];
  if (winDirection !== "NONE") {
    valid.sort((a, b) => {
      const resA = resultOf(a);
      const resB = resultOf(b);
      return winDirection === "ASC" ? resA - resB : resB - resA;
    });
    validPositions = assignStandardCompetitionPositions(
      valid,
      (a, b) => resultOf(a) === resultOf(b)
    );
  } else {
    validPositions = valid.map((_, i) => i + 1);
  }

  invalid.sort((a, b) => a.name.localeCompare(b.name));

  valid.forEach((p, i) => (p.index = validPositions[i]));
  invalid.forEach((p, i) => (p.index = valid.length + i + 1));

  return [...valid, ...invalid];
}

export function sortPenyes(penyes: ParticipatingPenya[], mode: SortMode): ParticipatingPenya[] {
  return [...penyes].sort((a, b) => {
    switch (mode) {
      case "name-asc":    return a.name.localeCompare(b.name);
      case "name-desc":   return b.name.localeCompare(a.name);
      case "result-asc":  return (parseFloat(a.result ?? "0") || 0) - (parseFloat(b.result ?? "0") || 0);
      case "result-desc": return (parseFloat(b.result ?? "0") || 0) - (parseFloat(a.result ?? "0") || 0);
      case "time-asc": {
        if (!a.participationTime && !b.participationTime) return a.name.localeCompare(b.name);
        if (!a.participationTime) return 1;
        if (!b.participationTime) return -1;
        return a.participationTime.getTime() - b.participationTime.getTime();
      }
      case "time-desc": {
        if (!a.participationTime && !b.participationTime) return a.name.localeCompare(b.name);
        if (!a.participationTime) return 1;
        if (!b.participationTime) return -1;
        return b.participationTime.getTime() - a.participationTime.getTime();
      }
    }
  });
}
