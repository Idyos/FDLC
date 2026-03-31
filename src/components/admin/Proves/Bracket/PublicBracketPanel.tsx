import { useEffect, useMemo, useState } from "react";
import { BracketViewer } from "./BracketViewer";
import type { Prova } from "@/interfaces/interfaces";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  allGroupMatchesPlayed,
  calculateGroupStandings,
  propagateBracketByes,
  shouldHaveThirdPlaceMatch,
} from "@/features/bracket/bracketDomain";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type { BracketTeamSnapshot, FinalStageState, GroupStageState, ThirdPlaceMatch } from "@/features/bracket/types";
import { subscribeProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";

interface PublicBracketPanelProps {
  year: number;
  prova?: Prova;
  /** Used when rendering inside a MultiProva sub-prova (no full Prova object available) */
  provaId?: string;
  subProvaId?: string;
}

export default function PublicBracketPanel({ year, prova, provaId, subProvaId }: PublicBracketPanelProps) {
  const [groupStage, setGroupStage] = useState<GroupStageState | null>(null);
  const [finalStage, setFinalStage] = useState<FinalStageState | null>(null);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState<ThirdPlaceMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamSnapshot, setTeamSnapshot] = useState<BracketTeamSnapshot[]>([]);

  const effectiveProvaId = prova?.id ?? provaId;

  const teamById = useMemo(() => {
    const map = new Map<string, string>();
    if (subProvaId) {
      teamSnapshot.forEach((t) => map.set(t.teamId, t.name));
    } else {
      prova?.penyes.forEach((p) => map.set(p.penyaId, p.name));
    }
    return map;
  }, [prova?.penyes, subProvaId, teamSnapshot]);

  useEffect(() => {
    if (!effectiveProvaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeProvaBracket(
      year,
      effectiveProvaId,
      (saved) => {
        if (!saved) {
          setGroupStage(null);
          setFinalStage(null);
          setThirdPlaceMatch(null);
          setTeamSnapshot([]);
        } else {
          setTeamSnapshot(saved.teamSnapshot);
          setGroupStage(saved.groupStage);
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
      subProvaId,
    );

    return unsubscribe;
  }, [year, effectiveProvaId, subProvaId]);

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  const renderGroupStage = () => {
    if (!groupStage) return null;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">Fase de Grups</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {groupStage.groups.map((group) => {
            const allPlayed = allGroupMatchesPlayed(group.matches);
            const standings = calculateGroupStandings(group.matches, group.teamIds);
            return (
              <div key={group.groupId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{group.groupName}</p>
                  {allPlayed && <Badge variant="secondary" className="text-xs">Complet</Badge>}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {standings.map((s, i) => (
                    <div
                      key={s.teamId}
                      className={`flex justify-between gap-2 ${
                        s.teamId === group.winnerTeamId
                          ? "text-primary font-semibold"
                          : i === 0 && s.played > 0
                          ? "font-medium text-foreground"
                          : ""
                      }`}
                    >
                      <span className="truncate">{teamById.get(s.teamId) ?? s.teamId}</span>
                      <span className="shrink-0">{s.points}pt</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Quadre de Rondes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregant quadre...</p>
        )}

        {!isLoading && !groupStage && glootMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">Encara no hi ha cap quadre disponible.</p>
        )}

        {!isLoading && (
          <>
            {renderGroupStage()}

            {glootMatches.length > 0 && (
              <div className="space-y-4">
                {groupStage && <p className="text-sm font-semibold">Quadre Final</p>}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
