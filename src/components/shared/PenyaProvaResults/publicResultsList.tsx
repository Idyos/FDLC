import { ParticipatingPenya, ProvaType } from "@/interfaces/interfaces";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { Separator } from "@/components/ui/separator";
import DynamicList from "@/components/shared/dynamicList";
import SingleProvaResult from "./singleProvaResult";
import SingleProvaResultGrid from "./singleProvaResultGrid";

interface Props {
  penyes: ParticipatingPenya[];
  challengeTypeOverride?: ProvaType;
}

export default function PublicResultsList({ penyes, challengeTypeOverride }: Props) {
  const { favoritePenyes } = useFavoritePenyes();

  const favoriteItems = penyes.filter((p) => favoritePenyes.some((f) => f.id === p.penyaId));
  const missingFavorites = favoritePenyes.filter((f) => !penyes.some((p) => p.penyaId === f.id));
  const hasFavoritesSection = favoritePenyes.length > 0;

  if (penyes.length === 0) {
    return <p>No s'han trobat penyes per a aquesta prova.</p>;
  }

  return (
    <div className="w-full">
      {hasFavoritesSection && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Les teves penyes
          </p>
          <div className="flex flex-col gap-3 md:gap-6">
            {favoriteItems.map((p) => (
              <SingleProvaResult key={p.penyaId} provaResultSummary={p} challengeTypeOverride={challengeTypeOverride} />
            ))}
            {missingFavorites.map((f) => (
              <p key={f.id} className="text-sm text-muted-foreground italic px-1 py-1">
                {f.name} no participa en aquesta prova
              </p>
            ))}
          </div>
          <Separator className="mt-3" />
          <Separator />
          <Separator className="mb-3" />
        </>
      )}
      <DynamicList
        items={penyes}
        renderItem={(provaResultSummary) => (
          <SingleProvaResult key={provaResultSummary.penyaId} provaResultSummary={provaResultSummary} challengeTypeOverride={challengeTypeOverride} />
        )}
        renderGridItem={(item, index) => (
          <SingleProvaResultGrid key={index} provaResultSummary={item} challengeTypeOverride={challengeTypeOverride} />
        )}
      />
    </div>
  );
}
