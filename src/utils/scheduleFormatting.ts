export type SlotStatus = "under" | "ok" | "overflow";

export function formatTime(date: Date | null | undefined): string {
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Buckets HH:mm times into fixed-size windows of `durationMinutes` starting at
 *  `startDate`, and flags each id as under/ok/overflow relative to `concurrencyLimit`. */
export function computeSlotStatuses(
  times: Record<string, string>,
  durationMinutes: number,
  concurrencyLimit: number,
  startDate: Date
): Record<string, SlotStatus> {
  if (!durationMinutes || !concurrencyLimit) return {};
  const groups: Record<number, string[]> = {};
  Object.entries(times).forEach(([id, timeStr]) => {
    if (!timeStr) return;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(startDate);
    d.setHours(h, m, 0, 0);
    const diffMins = (d.getTime() - startDate.getTime()) / 60000;
    const slot = Math.floor(diffMins / durationMinutes);
    (groups[slot] ??= []).push(id);
  });
  const out: Record<string, SlotStatus> = {};
  Object.values(groups).forEach((group) => {
    const status: SlotStatus =
      group.length > concurrencyLimit ? "overflow" :
      group.length < concurrencyLimit ? "under" : "ok";
    group.forEach((id) => (out[id] = status));
  });
  return out;
}
