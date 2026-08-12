/** Offset-minutes interval, relative to a shared origin (typically a Prova's startDate). */
export interface BusyInterval {
  start: number;
  end: number;
}

export interface ScheduleItem {
  /** penyaId for simple-type items; match.id for a Rondes round-1 match. */
  itemId: string;
  /** 1 team for simple types; >=2 teams for a bracket match. */
  teamIds: string[];
}

export interface ScheduleAttemptResult {
  /** itemId -> offset in minutes from the shared origin. */
  assignments: Map<string, number>;
  /** itemIds that could not avoid an external-busy conflict within the search horizon
   *  and were placed anyway (best-effort relaxation), respecting only this sub-prova's
   *  own concurrency limit. */
  relaxed: string[];
}

export interface ScheduleItemsOptions {
  /** Step size, in minutes, used to probe candidate start times. Defaults to
   *  `durationMinutes` (matches the previous fixed-bucket packing behavior when
   *  there is no external constraint to route around). */
  tickMinutes?: number;
  /** Latest offset (in minutes) to search before giving up. Default 18h. */
  horizonMinutes?: number;
  /** Randomize processing order (mirrors the existing "Generar horaris" shuffle). */
  shuffle?: boolean;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Greedy earliest-fit scheduler for a single sub-prova's items. Callers must
 *  supply `durationMinutes >= 1` and `concurrencyLimit >= 1` (both are already
 *  gated by the UI before "Generar horaris" is enabled).
 *
 *  Pass 1 respects both this sub-prova's own concurrency limit (bucketed the
 *  same way `computeSlotStatuses` colors the grid) and `externalBusy` — time
 *  already occupied by sibling sub-proves within the same MultiProva, per team.
 *  Pass 2 relaxes `externalBusy` for any item still unplaced after the horizon,
 *  so no item is ever left without a time — "avoid overlap where possible". */
export function scheduleItemsAvoidingBusy(
  items: ScheduleItem[],
  durationMinutes: number,
  concurrencyLimit: number,
  externalBusy: Map<string, BusyInterval[]>,
  options: ScheduleItemsOptions = {}
): ScheduleAttemptResult {
  const tick = options.tickMinutes ?? durationMinutes;
  const horizon = options.horizonMinutes ?? 18 * 60;
  const orderedItems = options.shuffle ?? true ? shuffled(items) : items;

  const assignments = new Map<string, number>();
  const relaxed: string[] = [];
  const bucketCounts = new Map<number, number>();

  const fitsExternal = (item: ScheduleItem, t: number): boolean => {
    const end = t + durationMinutes;
    return item.teamIds.every((teamId) => {
      const busy = externalBusy.get(teamId);
      if (!busy) return true;
      return busy.every((iv) => !intervalsOverlap(t, end, iv.start, iv.end));
    });
  };

  const unresolved: ScheduleItem[] = [];

  for (const item of orderedItems) {
    let placed = false;
    for (let t = 0; t <= horizon; t += tick) {
      const bucket = Math.floor(t / durationMinutes);
      const count = bucketCounts.get(bucket) ?? 0;
      if (count < concurrencyLimit && fitsExternal(item, t)) {
        assignments.set(item.itemId, t);
        bucketCounts.set(bucket, count + 1);
        placed = true;
        break;
      }
    }
    if (!placed) unresolved.push(item);
  }

  for (const item of unresolved) {
    for (let t = 0; t <= horizon; t += tick) {
      const bucket = Math.floor(t / durationMinutes);
      const count = bucketCounts.get(bucket) ?? 0;
      if (count < concurrencyLimit) {
        assignments.set(item.itemId, t);
        bucketCounts.set(bucket, count + 1);
        relaxed.push(item.itemId);
        break;
      }
    }
  }

  return { assignments, relaxed };
}
