import { useEffect, useMemo, useRef, useState } from "react";
import { BracketViewer } from "./BracketViewer";
import { GroupMatchesDialog } from "./GroupMatchesDialog";
import { useAuth } from "@/routes/admin/AuthContext";
import type { Prova } from "@/interfaces/interfaces";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildFinalStageFromEntrants,
  calculateGroupStandings,
  clearMatchResult,
  createGroupFinalEntrants,
  createSimpleFinalEntrants,
  getSuggestedGroupWinner,
  propagateBracketByes,
  resolveMatchWinner,
  sanitizeTeamSnapshot,
  shouldHaveThirdPlaceMatch,
  syncThirdPlaceFromSemifinals,
} from "@/features/bracket/bracketDomain";
import type { GroupMatch } from "@/features/bracket/types";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type {
  BracketTeamSnapshot,
  FinalStageState,
  GroupStageState,
  StoredProvaBracketDoc,
  ThirdPlaceMatch,
} from "@/features/bracket/types";
import {
  getProvaBracket,
  saveProvaBracket,
} from "@/services/database/Admin/adminBracketsDbServices";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AdminBracketPanelProps {
  year: number;
  prova: Prova;
  readOnly?: boolean;
}

function buildTeamSnapshot(prova: Prova): BracketTeamSnapshot[] {
  return sanitizeTeamSnapshot(
    prova.penyes
      .filter((penya) => penya.participates)
      .map((penya) => ({
        teamId: penya.penyaId,
        name: penya.name,
      })),
  );
}

function formatSavedAt(date: Date): string {
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `Guardat: ${hh}:${mm}`;
}

export default function AdminBracketPanel({ year, prova, readOnly = false }: AdminBracketPanelProps) {
  const { user } = useAuth();
  const teams = useMemo(() => buildTeamSnapshot(prova), [prova]);
  const teamById = useMemo(() => {
    const map = new Map<string, BracketTeamSnapshot>();
    teams.forEach((team) => map.set(team.teamId, team));
    return map;
  }, [teams]);

  // Bracket state
  const [groupStage, setGroupStage] = useState<GroupStageState | null>(null);
  const [finalStage, setFinalStage] = useState<FinalStageState | null>(null);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState<ThirdPlaceMatch | null>(null);
  const [isLoadingSavedBracket, setIsLoadingSavedBracket] = useState(true);

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalStageRef = useRef<FinalStageState | null>(null);
  const thirdPlaceMatchRef = useRef<ThirdPlaceMatch | null>(null);

  // Dialog state
  const [showOverwriteAlert, setShowOverwriteAlert] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Keep refs in sync with state for debounced save
  useEffect(() => {
    finalStageRef.current = finalStage;
  }, [finalStage]);

  useEffect(() => {
    thirdPlaceMatchRef.current = thirdPlaceMatch;
  }, [thirdPlaceMatch]);

  // Stable key: only changes when group winners change, not on every match result
  const groupWinnersKey = useMemo(
    () =>
      groupStage
        ? groupStage.groups.map((g) => `${g.groupId}:${g.winnerTeamId ?? ""}`).join("|")
        : "",
    [groupStage],
  );

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  // Load bracket from Firestore on mount
  useEffect(() => {
    let isCancelled = false;

    const loadSavedBracket = async () => {
      if (!prova.id) {
        setGroupStage(null);
        setFinalStage(null);
        setIsLoadingSavedBracket(false);
        return;
      }

      setIsLoadingSavedBracket(true);

      try {
        const saved = await getProvaBracket(year, prova.id);
        if (isCancelled) return;

        if (!saved) {
          setGroupStage(null);
          setFinalStage(null);
          return;
        }

        const propagatedMatches = propagateBracketByes([...saved.finalStage.bracket.matches]);
        setGroupStage(saved.groupStage);
        setFinalStage({
          ...saved.finalStage,
          bracket: { ...saved.finalStage.bracket, matches: propagatedMatches },
        });
        setThirdPlaceMatch(
          saved.finalStage.thirdPlaceMatch ??
            syncThirdPlaceFromSemifinals(propagatedMatches, null),
        );
        setSavedAt(saved.updatedAt ? saved.updatedAt.toDate() : null);
        setSaveStatus("saved");
      } catch (error) {
        if (!isCancelled) {
          toast.error("Ha hagut un error al carregar el quadre: " + error);
          console.error("loadSavedBracket error:", error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSavedBracket(false);
        }
      }
    };

    loadSavedBracket();
    return () => { isCancelled = true; };
  }, [year, prova.id]);

  // Regenerate final bracket when group winners change (groups_to_final mode)
  useEffect(() => {
    if (!groupStage) return;

    const entrants = createGroupFinalEntrants(groupStage, teams);
    const nextFinalStage = buildFinalStageFromEntrants(entrants);
    if (!nextFinalStage) return;
    setFinalStage({
      ...nextFinalStage,
      bracket: {
        ...nextFinalStage.bracket,
        matches: propagateBracketByes([...nextFinalStage.bracket.matches]),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupWinnersKey, teams]);

  // ─── Save helpers ───────────────────────────────────────────────────────────

  const buildPayload = (fs: FinalStageState, tpm: ThirdPlaceMatch | null): StoredProvaBracketDoc => ({
    schemaVersion: 1,
    challengeType: "Rondes",
    mode: "simple_final",
    teamSnapshot: teams,
    groupStage: null,
    finalStage: { ...fs, thirdPlaceMatch: tpm },
    updatedAt: null,
    updatedBy: user?.uid ?? null,
  });

  const doSave = async (fs: FinalStageState, tpm: ThirdPlaceMatch | null) => {
    if (!prova.id) return;
    setSaveStatus("saving");
    try {
      await saveProvaBracket(year, prova.id, buildPayload(fs, tpm), user?.uid);
      const now = new Date();
      setSavedAt(now);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      toast.error("No s'ha pogut guardar el quadre.");
      console.error(error);
    }
  };

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      if (finalStageRef.current) {
        doSave(finalStageRef.current, thirdPlaceMatchRef.current);
      }
    }, 800);
  };

  // ─── Generate ───────────────────────────────────────────────────────────────

  const doGenerate = () => {
    if (teams.length < 2) {
      toast.error("Calen almenys 2 equips per generar el quadre.");
      return null;
    }
    const entrants = createSimpleFinalEntrants(teams);
    const next = buildFinalStageFromEntrants(entrants);
    return next
      ? {
          ...next,
          bracket: {
            ...next.bracket,
            matches: propagateBracketByes([...next.bracket.matches]),
          },
        }
      : null;
  };

  const onGenerate = async () => {
    if (teams.length < 2) {
      toast.error("Calen almenys 2 equips per generar el quadre.");
      return;
    }
    // Check if bracket already exists in Firestore
    if (prova.id) {
      const existing = await getProvaBracket(year, prova.id);
      if (existing) {
        setShowOverwriteAlert(true);
        return;
      }
    }
    handleConfirmGenerate();
  };

  const handleConfirmGenerate = () => {
    setShowOverwriteAlert(false);
    const next = doGenerate();
    if (!next) return;
    setGroupStage(null);
    setFinalStage(next);
    setThirdPlaceMatch(null);
    // Save immediately
    doSave(next, null);
  };

  // ─── Inline bracket score handler ───────────────────────────────────────────

  const handleBracketScoreUpdate = (
    internalId: string,
    scoreA: number | null,
    scoreB: number | null,
  ) => {
    setFinalStage((prev) => {
      if (!prev) return prev;

      let updatedMatches;
      if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
        updatedMatches = resolveMatchWinner(prev.bracket.matches, internalId, scoreA, scoreB);
      } else if (scoreA === null && scoreB === null) {
        updatedMatches = clearMatchResult(prev.bracket.matches, internalId);
      } else {
        updatedMatches = prev.bracket.matches.map((m) => {
          if (m.id !== internalId) return m;
          return {
            ...m,
            teams: m.teams.map((t, i) => {
              const newScore = i === 0 ? scoreA : scoreB;
              if (newScore === null) return t;
              return { ...t, score: { ...t.score, gamesWon: newScore } };
            }),
          };
        });
      }

      // Sync 3rd-place match participants from updated semifinal results
      const synced = syncThirdPlaceFromSemifinals(updatedMatches, thirdPlaceMatchRef.current);
      setThirdPlaceMatch(synced);

      return { ...prev, bracket: { ...prev.bracket, matches: updatedMatches } };
    });

    scheduleSave();
  };

  // ─── Group match handlers (kept for groups_to_final future use) ─────────────

  const onWinnerChange = (groupId: string, teamId: string | null) => {
    setGroupStage((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        groups: previous.groups.map((group) => {
          if (group.groupId !== groupId) return group;
          const resolved = teamId === "__NONE__" ? null : teamId;
          return { ...group, winnerTeamId: resolved };
        }),
      };
    });
  };

  const onMatchResultChange = (
    groupId: string,
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
  ) => {
    setGroupStage((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        groups: previous.groups.map((group) => {
          if (group.groupId !== groupId) return group;

          const updatedMatches: GroupMatch[] = group.matches.map((match) => {
            if (match.matchId !== matchId) return match;
            if (scoreA === null || scoreB === null) {
              return { ...match, scoreA: null, scoreB: null, winnerTeamId: null, isDraw: false };
            }
            const isDraw = scoreA === scoreB;
            const winnerTeamId = isDraw
              ? null
              : scoreA > scoreB
                ? match.teamAId
                : match.teamBId;
            return { ...match, scoreA, scoreB, isDraw, winnerTeamId };
          });

          const standings = calculateGroupStandings(updatedMatches, group.teamIds);
          const allPlayed = updatedMatches.every(
            (m) => m.scoreA !== null && m.scoreB !== null,
          );
          const suggested = allPlayed ? getSuggestedGroupWinner(standings) : null;
          const winnerTeamId = suggested ?? group.winnerTeamId;

          return { ...group, matches: updatedMatches, winnerTeamId };
        }),
      };
    });
  };

  // ─── 3rd place match handler ────────────────────────────────────────────────

  const handleThirdPlaceScoreUpdate = (scoreA: number | null, scoreB: number | null) => {
    setThirdPlaceMatch((prev) => {
      if (!prev) return prev;
      if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
        const winnerTeamId = scoreA > scoreB ? prev.teamA.teamId : prev.teamB.teamId;
        const loserTeamId = scoreA > scoreB ? prev.teamB.teamId : prev.teamA.teamId;
        return { ...prev, scoreA, scoreB, winnerTeamId, loserTeamId, status: "finished" };
      }
      return { ...prev, scoreA, scoreB, winnerTeamId: null, loserTeamId: null, status: "scheduled" };
    });
    scheduleSave();
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderSaveStatus = () => {
    if (saveStatus === "idle") return null;
    if (saveStatus === "saving") {
      return <Badge variant="outline">Guardant...</Badge>;
    }
    if (saveStatus === "saved" && savedAt) {
      return <Badge variant="secondary">{formatSavedAt(savedAt)}</Badge>;
    }
    if (saveStatus === "error") {
      return <Badge variant="destructive">Error en guardar</Badge>;
    }
    return null;
  };

  const renderFinalBracket = () => {
    if (!finalStage || glootMatches.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Encara no hi ha cap quadre final generat.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {finalStage.entrants.map((entrant) => (
            <Badge
              key={entrant.entryId}
              variant={entrant.isPlaceholder ? "outline" : "secondary"}
            >
              {entrant.name}
            </Badge>
          ))}
        </div>

        <div className="w-full overflow-auto rounded-lg border p-4">
          <BracketViewer
            matches={glootMatches}
            onScoreChange={readOnly ? undefined : handleBracketScoreUpdate}
            readOnly={readOnly}
          />
        </div>
      </div>
    );
  };

  const renderThirdPlaceMatch = () => {
    if (!finalStage || !shouldHaveThirdPlaceMatch(finalStage.bracket.matches)) return null;

    const tpm = thirdPlaceMatch;
    const teamAName = tpm?.teamA.displayName ?? "Pendent de semifinal";
    const teamBName = tpm?.teamB.displayName ?? "Pendent de semifinal";
    const pending = !tpm?.teamA.teamId || !tpm?.teamB.teamId;

    return (
      <div className="rounded-lg border p-4 space-y-3">
        <p className="font-semibold text-sm">Partit pel 3r lloc</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm min-w-[120px]">{teamAName}</span>
          {!readOnly && !pending ? (
            <>
              <input
                type="number"
                min={0}
                className="w-14 rounded border px-2 py-1 text-center text-sm bg-background"
                value={tpm?.scoreA ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  handleThirdPlaceScoreUpdate(val, tpm?.scoreB ?? null);
                }}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="number"
                min={0}
                className="w-14 rounded border px-2 py-1 text-center text-sm bg-background"
                value={tpm?.scoreB ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  handleThirdPlaceScoreUpdate(tpm?.scoreA ?? null, val);
                }}
              />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {tpm?.status === "finished"
                ? `${tpm.scoreA} – ${tpm.scoreB}`
                : "–"}
            </span>
          )}
          <span className="text-sm min-w-[120px]">{teamBName}</span>
          {tpm?.status === "finished" && tpm.winnerTeamId && (
            <Badge variant="secondary">
              Guanyador: {tpm.winnerTeamId === tpm.teamA.teamId ? teamAName : teamBName}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="py-4">
      <CardHeader className="gap-2">
        <CardTitle>Quadre de Rondes</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{`Equips actius: ${teams.length}`}</Badge>
          {!readOnly && renderSaveStatus()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onGenerate} disabled={isLoadingSavedBracket}>
              Generar
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {renderFinalBracket()}
          {renderThirdPlaceMatch()}
        </div>
      </CardContent>

      {/* AlertDialog: confirm overwrite existing bracket */}
      <AlertDialog open={showOverwriteAlert} onOpenChange={setShowOverwriteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ja existeix un quadre</AlertDialogTitle>
            <AlertDialogDescription>
              Si generes un nou quadre, el quadre actual i tots els resultats es perdran. Vols continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate}>
              Generar de nou
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GroupMatchesDialog (groups_to_final mode, future use) */}
      {groupStage && selectedGroupId && (() => {
        const group = groupStage.groups.find((g) => g.groupId === selectedGroupId);
        if (!group) return null;
        return (
          <GroupMatchesDialog
            open={true}
            onOpenChange={(open) => { if (!open) setSelectedGroupId(null); }}
            group={group}
            teamById={teamById}
            onMatchResultChange={(matchId, scoreA, scoreB) =>
              onMatchResultChange(selectedGroupId, matchId, scoreA, scoreB)
            }
            onWinnerChange={onWinnerChange}
          />
        );
      })()}
    </Card>
  );
}
