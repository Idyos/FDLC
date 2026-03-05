import { ParticipatingPenya } from "@/interfaces/interfaces";

export type SortMode =
  | "name-asc"
  | "name-desc"
  | "result-asc"
  | "result-desc"
  | "time-asc"
  | "time-desc";

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
