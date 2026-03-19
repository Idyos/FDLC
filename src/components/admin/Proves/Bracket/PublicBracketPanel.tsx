import { useEffect, useMemo, useState } from "react";
import { BracketViewer } from "./BracketViewer";
import type { Prova } from "@/interfaces/interfaces";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { propagateBracketByes, shouldHaveThirdPlaceMatch } from "@/features/bracket/bracketDomain";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type { FinalStageState, ThirdPlaceMatch } from "@/features/bracket/types";
import { subscribeProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";

interface PublicBracketPanelProps {
  year: number;
  prova: Prova;
}

export default function PublicBracketPanel({ year, prova }: PublicBracketPanelProps) {
  const [finalStage, setFinalStage] = useState<FinalStageState | null>(null);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState<ThirdPlaceMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!prova.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeProvaBracket(
      year,
      prova.id,
      (saved) => {
        if (!saved) {
          setFinalStage(null);
          setThirdPlaceMatch(null);
        } else {
          setFinalStage({
            ...saved.finalStage,
            bracket: {
              ...saved.finalStage.bracket,
              matches: propagateBracketByes([...saved.finalStage.bracket.matches]),
            },
          });
          setThirdPlaceMatch(saved.finalStage.thirdPlaceMatch ?? null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("PublicBracketPanel subscription error:", error);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [year, prova.id]);

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Quadre de Rondes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregant quadre...</p>
        )}
        {!isLoading && glootMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">Encara no hi ha cap quadre disponible.</p>
        )}
        {!isLoading && glootMatches.length > 0 && (
          <div className="space-y-4">
            <div className="w-full overflow-auto rounded-lg border p-4">
              <BracketViewer matches={glootMatches} readOnly />
            </div>
            {finalStage && shouldHaveThirdPlaceMatch(finalStage.bracket.matches) && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-semibold text-sm">Partit pel 3r lloc</p>
                {thirdPlaceMatch ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm">{thirdPlaceMatch.teamA.displayName ?? "–"}</span>
                    <span className="text-sm text-muted-foreground">
                      {thirdPlaceMatch.status === "finished"
                        ? `${thirdPlaceMatch.scoreA} – ${thirdPlaceMatch.scoreB}`
                        : "–"}
                    </span>
                    <span className="text-sm">{thirdPlaceMatch.teamB.displayName ?? "–"}</span>
                    {thirdPlaceMatch.status === "finished" && thirdPlaceMatch.winnerTeamId && (
                      <Badge variant="secondary">
                        Guanyador:{" "}
                        {thirdPlaceMatch.winnerTeamId === thirdPlaceMatch.teamA.teamId
                          ? thirdPlaceMatch.teamA.displayName
                          : thirdPlaceMatch.teamB.displayName}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Pendent de semifinals.</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
