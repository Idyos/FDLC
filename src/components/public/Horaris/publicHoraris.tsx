import { ParticipatingPenya } from "@/interfaces/interfaces";

interface Props {
  penyes: ParticipatingPenya[];
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function PublicHoraris({ penyes }: Props) {
  const sorted = [...penyes].sort((a, b) => {
    if (!a.participationTime && !b.participationTime) return a.name.localeCompare(b.name);
    if (!a.participationTime) return 1;
    if (!b.participationTime) return -1;
    return a.participationTime.getTime() - b.participationTime.getTime();
  });

  return (
    <div className="p-4">
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(220px,_1fr))] gap-3">
        {sorted.map((penya) => (
          <div
            key={penya.penyaId}
            className="rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-800 shadow-sm border"
          >
            <span className="font-medium truncate">{penya.name}</span>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {formatTime(penya.participationTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
