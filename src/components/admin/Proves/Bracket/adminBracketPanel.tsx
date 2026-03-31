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
  allGroupMatchesPlayed,
  buildFinalStageFromEntrants,
  calculateGroupStandings,
  clearMatchResult,
  createGroupFinalEntrants,
  createRandomBalancedGroupStage,
  createSimpleFinalEntrants,
  getSuggestedGroupWinner,
  MIN_TEAMS_FOR_GROUP_STAGE,
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
  subProvaId?: string;
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

function buildPropagatedFinal(fs: FinalStageState): FinalStageState {
  return {
    ...fs,
    bracket: {
      ...fs.bracket,
      matches: propagateBracketByes([...fs.bracket.matches]),
    },
  };
}

export default function AdminBracketPanel({ year, prova, readOnly = false, subProvaId }: AdminBracketPanelProps) {
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

  // Refs for reading latest state in async/event handlers without stale closures
  const finalStageRef = useRef<FinalStageState | null>(null);
  const thirdPlaceMatchRef = useRef<ThirdPlaceMatch | null>(null);
  const groupStageRef = useRef<GroupStageState | null>(null);

  // Local input state for 3rd place match (allows typing without triggering save on each keystroke)
  const [localTpmA, setLocalTpmA] = useState<string>("");
  const [localTpmB, setLocalTpmB] = useState<string>("");

  // Dialog state
  const [showOverwriteAlert, setShowOverwriteAlert] = useState(false);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<"simple" | "groups">("simple");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { finalStageRef.current = finalStage; }, [finalStage]);
  useEffect(() => { thirdPlaceMatchRef.current = thirdPlaceMatch; }, [thirdPlaceMatch]);
  useEffect(() => { groupStageRef.current = groupStage; }, [groupStage]);

  // Sync local 3rd-place input values when thirdPlaceMatch changes externally (e.g. Firebase revert)
  useEffect(() => {
    setLocalTpmA(thirdPlaceMatch?.scoreA != null ? String(thirdPlaceMatch.scoreA) : "");
    setLocalTpmB(thirdPlaceMatch?.scoreB != null ? String(thirdPlaceMatch.scoreB) : "");
  }, [thirdPlaceMatch]);

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
        const saved = await getProvaBracket(year, prova.id, subProvaId);
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

  // ─── Save helpers ────────────────────────────────────────────────────────────

  const buildPayload = (
    fs: FinalStageState,
    tpm: ThirdPlaceMatch | null,
    gs: GroupStageState | null,
  ): StoredProvaBracketDoc => ({
    schemaVersion: 1,
    challengeType: "Rondes",
    mode: gs ? "groups_to_final" : "simple_final",
    teamSnapshot: teams,
    groupStage: gs,
    finalStage: { ...fs, thirdPlaceMatch: tpm },
    updatedAt: null,
    updatedBy: user?.uid ?? null,
  });

  const revertToFirebase = async () => {
    if (!prova.id) return;
    try {
      const saved = await getProvaBracket(year, prova.id, subProvaId);
      if (!saved) return;
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
    } catch {
      // Si tampoc podem revertir, mantenim l'estat d'error
    }
  };

  const doSave = async (
    fs: FinalStageState,
    tpm: ThirdPlaceMatch | null,
    gs: GroupStageState | null,
  ) => {
    if (!prova.id) return;
    setSaveStatus("saving");
    try {
      await saveProvaBracket(year, prova.id, buildPayload(fs, tpm, gs), user?.uid, subProvaId);
      const now = new Date();
      setSavedAt(now);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      toast.error("No s'ha pogut guardar el quadre. Revertint al valor anterior...");
      console.error(error);
      await revertToFirebase();
    }
  };

  // ─── Generate helpers ─────────────────────────────────────────────────────────

  const doGenerateSimple = () => {
    if (teams.length < 2) {
      toast.error("Calen almenys 2 equips per generar el quadre.");
      return;
    }
    const entrants = createSimpleFinalEntrants(teams);
    const next = buildFinalStageFromEntrants(entrants);
    if (!next) return;
    const propagated = buildPropagatedFinal(next);
    setGroupStage(null);
    groupStageRef.current = null;
    setFinalStage(propagated);
    finalStageRef.current = propagated;
    setThirdPlaceMatch(null);
    thirdPlaceMatchRef.current = null;
    doSave(propagated, null, null);
  };

  const doGenerateGroups = () => {
    if (teams.length < MIN_TEAMS_FOR_GROUP_STAGE) {
      toast.error(`Calen almenys ${MIN_TEAMS_FOR_GROUP_STAGE} equips per a la fase de grups.`);
      return;
    }
    const nextGroupStage = createRandomBalancedGroupStage(teams);
    if (!nextGroupStage) {
      toast.error("No es pot crear una fase de grups amb el nombre d'equips actual.");
      return;
    }
    const entrants = createGroupFinalEntrants(nextGroupStage, teams);
    const nextFinal = buildFinalStageFromEntrants(entrants);
    if (!nextFinal) return;
    const propagated = buildPropagatedFinal(nextFinal);
    setGroupStage(nextGroupStage);
    groupStageRef.current = nextGroupStage;
    setFinalStage(propagated);
    finalStageRef.current = propagated;
    setThirdPlaceMatch(null);
    thirdPlaceMatchRef.current = null;
    doSave(propagated, null, nextGroupStage);
  };

  const onGenerateSimple = async () => {
    if (teams.length < 2) {
      toast.error("Calen almenys 2 equips per generar el quadre.");
      return;
    }
    if (prova.id) {
      const existing = await getProvaBracket(year, prova.id, subProvaId);
      if (existing) {
        setPendingGenerateMode("simple");
        setShowOverwriteAlert(true);
        return;
      }
    }
    doGenerateSimple();
  };

  const onGenerateGroups = async () => {
    if (teams.length < MIN_TEAMS_FOR_GROUP_STAGE) {
      toast.error(`Calen almenys ${MIN_TEAMS_FOR_GROUP_STAGE} equips per a la fase de grups.`);
      return;
    }
    if (prova.id) {
      const existing = await getProvaBracket(year, prova.id, subProvaId);
      if (existing) {
        setPendingGenerateMode("groups");
        setShowOverwriteAlert(true);
        return;
      }
    }
    doGenerateGroups();
  };

  const handleConfirmGenerate = () => {
    setShowOverwriteAlert(false);
    if (pendingGenerateMode === "groups") {
      doGenerateGroups();
    } else {
      doGenerateSimple();
    }
  };

  // ─── Inline bracket score handler ────────────────────────────────────────────

  const handleBracketScoreUpdate = (
    internalId: string,
    scoreA: number | null,
    scoreB: number | null,
  ) => {
    let newFinalStage: FinalStageState | null = null;
    let newThirdPlace: ThirdPlaceMatch | null = null;

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

      const synced = syncThirdPlaceFromSemifinals(updatedMatches, thirdPlaceMatchRef.current);
      newThirdPlace = synced;
      setThirdPlaceMatch(synced);

      const next = { ...prev, bracket: { ...prev.bracket, matches: updatedMatches } };
      newFinalStage = next;
      return next;
    });

    if (newFinalStage) doSave(newFinalStage, newThirdPlace, groupStageRef.current);
  };

  // ─── Group match handlers ─────────────────────────────────────────────────────

  const rebuildFinalFromGroups = (gs: GroupStageState): FinalStageState | null => {
    const entrants = createGroupFinalEntrants(gs, teams);
    const next = buildFinalStageFromEntrants(entrants);
    if (!next) return null;
    return buildPropagatedFinal(next);
  };

  const onWinnerChange = (groupId: string, teamId: string | null) => {
    const prev = groupStageRef.current;
    if (!prev) return;

    const resolved = teamId === "__NONE__" ? null : teamId;
    const next: GroupStageState = {
      ...prev,
      groups: prev.groups.map((g) =>
        g.groupId !== groupId ? g : { ...g, winnerTeamId: resolved },
      ),
    };

    groupStageRef.current = next;
    setGroupStage(next);

    const nextFinal = rebuildFinalFromGroups(next);
    if (nextFinal) {
      finalStageRef.current = nextFinal;
      thirdPlaceMatchRef.current = null;
      setFinalStage(nextFinal);
      setThirdPlaceMatch(null);
      doSave(nextFinal, null, next);
    } else if (finalStageRef.current) {
      doSave(finalStageRef.current, thirdPlaceMatchRef.current, next);
    }
  };

  const onMatchResultChange = (
    groupId: string,
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
  ) => {
    const prev = groupStageRef.current;
    if (!prev) return;
    const prevGroup = prev.groups.find((g) => g.groupId === groupId);
    if (!prevGroup) return;

    const updatedMatches: GroupMatch[] = prevGroup.matches.map((match) => {
      if (match.matchId !== matchId) return match;
      if (scoreA === null && scoreB === null) {
        // Explicit clear (✕ button)
        return { ...match, scoreA: null, scoreB: null, winnerTeamId: null, isDraw: false };
      }
      // Allow partial input (one side filled, other still null)
      const isDraw = scoreA !== null && scoreB !== null && scoreA === scoreB;
      const winnerTeamId =
        scoreA !== null && scoreB !== null && !isDraw
          ? scoreA > scoreB ? match.teamAId : match.teamBId
          : null;
      return { ...match, scoreA, scoreB, isDraw, winnerTeamId };
    });

    const standings = calculateGroupStandings(updatedMatches, prevGroup.teamIds);
    const allPlayed = updatedMatches.every((m) => m.scoreA !== null && m.scoreB !== null);
    const suggested = allPlayed ? getSuggestedGroupWinner(standings) : null;
    const newWinnerId = suggested ?? prevGroup.winnerTeamId;
    const winnersChanged = prevGroup.winnerTeamId !== newWinnerId;

    const next: GroupStageState = {
      ...prev,
      groups: prev.groups.map((g) =>
        g.groupId !== groupId ? g : { ...g, matches: updatedMatches, winnerTeamId: newWinnerId },
      ),
    };

    groupStageRef.current = next;
    setGroupStage(next);

    if (winnersChanged) {
      const nextFinal = rebuildFinalFromGroups(next);
      if (nextFinal) {
        finalStageRef.current = nextFinal;
        thirdPlaceMatchRef.current = null;
        setFinalStage(nextFinal);
        setThirdPlaceMatch(null);
        doSave(nextFinal, null, next);
        return;
      }
    }
    if (finalStageRef.current) {
      doSave(finalStageRef.current, thirdPlaceMatchRef.current, next);
    }
  };

  // ─── 3rd place match handler ──────────────────────────────────────────────────

  const handleThirdPlaceScoreUpdate = (scoreA: number | null, scoreB: number | null) => {
    let newTpm: ThirdPlaceMatch | null = null;

    setThirdPlaceMatch((prev) => {
      if (!prev) return prev;
      let next: ThirdPlaceMatch;
      if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
        const winnerTeamId = scoreA > scoreB ? prev.teamA.teamId : prev.teamB.teamId;
        const loserTeamId = scoreA > scoreB ? prev.teamB.teamId : prev.teamA.teamId;
        next = { ...prev, scoreA, scoreB, winnerTeamId, loserTeamId, status: "finished" };
      } else {
        next = { ...prev, scoreA, scoreB, winnerTeamId: null, loserTeamId: null, status: "scheduled" };
      }
      newTpm = next;
      return next;
    });

    if (finalStageRef.current) doSave(finalStageRef.current, newTpm, groupStageRef.current);
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const renderSaveStatus = () => {
    if (saveStatus === "idle") return null;
    if (saveStatus === "saving") return <Badge variant="outline">Guardant...</Badge>;
    if (saveStatus === "saved" && savedAt) return <Badge variant="secondary">{formatSavedAt(savedAt)}</Badge>;
    if (saveStatus === "error") return <Badge variant="destructive">Error en guardar</Badge>;
    return null;
  };

  const renderGroupStage = () => {
    if (!groupStage) return null;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">Fase de Grups</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {groupStage.groups.map((group) => {
            const allPlayed = allGroupMatchesPlayed(group.matches);
            const standings = calculateGroupStandings(group.matches, group.teamIds);
            const hasWinner = group.winnerTeamId !== null;
            return (
              <div
                key={group.groupId}
                className={`rounded-lg border p-3 transition-colors ${
                  !readOnly ? "hover:bg-muted/50 cursor-pointer" : ""
                }`}
                onClick={readOnly ? undefined : () => setSelectedGroupId(group.groupId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{group.groupName}</p>
                  <div className="flex gap-1">
                    {allPlayed && <Badge variant="secondary" className="text-xs">Complet</Badge>}
                    {hasWinner && <Badge className="text-xs">✓</Badge>}
                  </div>
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
                      <span className="truncate">{teamById.get(s.teamId)?.name ?? s.teamId}</span>
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

  const renderFinalBracket = () => {
    if (!finalStage || glootMatches.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Encara no hi ha cap quadre final generat.
        </p>
      );
    }
    return (
      <div className="w-full overflow-auto rounded-lg border p-4">
        <BracketViewer
          matches={glootMatches}
          onScoreChange={readOnly ? undefined : handleBracketScoreUpdate}
          readOnly={readOnly}
        />
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
                type="text"
                inputMode="numeric"
                min={0}
                className="w-14 rounded border px-2 py-1 text-center text-sm bg-background"
                value={localTpmA}
                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setLocalTpmA(e.target.value); }}
                onBlur={() => {
                  const val = localTpmA === "" ? null : Number(localTpmA);
                  handleThirdPlaceScoreUpdate(val, localTpmB === "" ? null : Number(localTpmB));
                }}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="text"
                inputMode="numeric"
                min={0}
                className="w-14 rounded border px-2 py-1 text-center text-sm bg-background"
                value={localTpmB}
                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setLocalTpmB(e.target.value); }}
                onBlur={() => {
                  const val = localTpmB === "" ? null : Number(localTpmB);
                  handleThirdPlaceScoreUpdate(localTpmA === "" ? null : Number(localTpmA), val);
                }}
              />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {tpm?.status === "finished" ? `${tpm.scoreA} – ${tpm.scoreB}` : "–"}
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

      <CardContent className="space-y-6">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onGenerateSimple} disabled={isLoadingSavedBracket}>
              Generar quadre
            </Button>
            {teams.length >= MIN_TEAMS_FOR_GROUP_STAGE && (
              <Button variant="outline" onClick={onGenerateGroups} disabled={isLoadingSavedBracket}>
                Generar amb grups
              </Button>
            )}
          </div>
        )}

        <div className="space-y-6">
          {renderGroupStage()}
          {groupStage && (
            <p className="text-sm font-semibold">Quadre Final</p>
          )}
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

      {/* GroupMatchesDialog */}
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
