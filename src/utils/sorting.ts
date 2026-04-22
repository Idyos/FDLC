import { ParticipatingPenya, WinDirection } from "@/interfaces/interfaces";

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
      case "result-asc":  return (a.result ?? 0) - (b.result ?? 0);
      case "result-desc": return (b.result ?? 0) - (a.result ?? 0);
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
