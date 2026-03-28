import { ParticipatingPenya } from "@/interfaces/interfaces";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { Separator } from "@/components/ui/separator";

interface Props {
  penyes: ParticipatingPenya[];
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function HorariCard({ penya }: { penya: ParticipatingPenya }) {
  return (
    <div
      key={penya.penyaId}
      className="rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-neutral-800 shadow-sm border"
    >
      <span className="font-medium truncate">{penya.name}</span>
      <span className="text-sm font-mono text-gray-600 dark:text-neutral-300 whitespace-nowrap">
        {formatTime(penya.participationTime)}
      </span>
    </div>
  );
}

export default function PublicHoraris({ penyes }: Props) {
  const { favoritePenyes } = useFavoritePenyes();

  const favoriteItems = penyes.filter((p) => favoritePenyes.some((f) => f.id === p.penyaId));
  const missingFavorites = favoritePenyes.filter((f) => !penyes.some((p) => p.penyaId === f.id));
  const hasFavoritesSection = favoritePenyes.length > 0;

  return (
    <div className="p-4">
      {hasFavoritesSection && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Les teves penyes
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,_minmax(220px,_1fr))] gap-3 mb-3">
            {favoriteItems.map((penya) => (
              <HorariCard key={penya.penyaId} penya={penya} />
            ))}
            {missingFavorites.map((f) => (
              <div
                key={f.id}
                className="rounded-xl p-3 flex items-center gap-3 bg-white dark:bg-neutral-800 shadow-sm border border-dashed"
              >
                <span className="text-sm text-muted-foreground italic truncate">
                  {f.name} no té horari assignat en aquesta prova
                </span>
              </div>
            ))}
          </div>
          <Separator className="mb-3" />
        </>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(220px,_1fr))] gap-3">
        {penyes.map((penya) => (
          <HorariCard key={penya.penyaId} penya={penya} />
        ))}
      </div>
    </div>
  );
}
