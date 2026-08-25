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

export function rankParticipants(
  participants: ParticipatingPenya[],
  winDirection: WinDirection
): ParticipatingPenya[] {
  const valid = participants.filter((p) => p.participates && p.result && p.result !== "");
  const invalid = participants.filter((p) => !p.participates || !p.result || p.result === "");

  if (winDirection !== "NONE") {
    valid.sort((a, b) => {
      const resA = parseInt(a.result ?? "0") || 0;
      const resB = parseInt(b.result ?? "0") || 0;
      return winDirection === "ASC" ? resA - resB : resB - resA;
    });
  }

  invalid.sort((a, b) => a.name.localeCompare(b.name));

  const combined = [...valid, ...invalid];
  combined.forEach((p, i) => (p.index = i + 1));
  return combined;
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
