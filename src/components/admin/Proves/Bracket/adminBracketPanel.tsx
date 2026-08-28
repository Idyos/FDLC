import { useEffect, useMemo, useRef, useState } from "react";
import { BracketViewer } from "./BracketViewer";
import { GroupMatchesDialog } from "./GroupMatchesDialog";
import { useAuth } from "@/routes/admin/AuthContext";
import type { Prova } from "@/interfaces/interfaces";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  applyBracketScoreMutation,
  applyGroupMatchResultMutation,
  applyGroupWinnerMutation,
  applyMatchTimeMutation,
  applyThirdPlaceScoreMutation,
  buildFinalStageFromEntrants,
  buildPropagatedFinal,
  calculateGroupStandings,
  canApplyBracketScore,
  computeRoundUpdates,
  computeTeamRoundInfo,
  createGroupFinalEntrants,
  createRandomBalancedGroupStage,
  createSimpleFinalEntrants,
  MIN_TEAMS_FOR_GROUP_STAGE,
  propagateBracketByes,
  sanitizeTeamSnapshot,
  shouldHaveThirdPlaceMatch,
  syncThirdPlaceFromSemifinals,
  type BracketMutation,
} from "@/features/bracket/bracketDomain";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type {
  BracketTeamSnapshot,
  FinalStageState,
  GroupStageState,
  StoredProvaBracketDoc,
  ThirdPlaceMatch,
} from "@/features/bracket/types";
import {
  BracketMutationAbortedError,
  getProvaBracket,
  runBracketMutation,
  saveProvaBracket,
  subscribeProvaBracket,
} from "@/services/database/Admin/adminBracketsDbServices";
import { validAdvanceOptions } from "@/utils/bracketCreator";
import { formatTime, computeSlotStatuses } from "@/utils/scheduleFormatting";
import { scheduleItemsAvoidingBusy, BusyInterval, ScheduleItem } from "@/utils/multiProvaScheduler";
import { fillRoundsSequentially } from "@/utils/bracketRoundScheduler";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AdminBracketPanelProps {
  year: number;
  prova: Prova;
  readOnly?: boolean;
  subProvaId?: string;
  /** When provided (only inside a MultiProva), used by "Generar horaris" to try
   *  to avoid overlapping Round 1 with times already assigned to sibling sub-proves. */
  fetchExternalBusyIntervals?: () => Promise<Map<string, BusyInterval[]>>;
}

function buildTeamSnapshot(prova: Prova): BracketTeamSnapshot[] {
  return sanitizeTeamSnapshot(
    prova.penyes
      .filter((penya) => penya.participates)
      .map((penya) => ({ teamId: penya.penyaId, name: penya.name })),
  );
}

function formatSavedAt(date: Date): string {
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `Guardat: ${hh}:${mm}`;
}

type RoundInfo = Map<string, { lastRoundPlayed: number; hasWon: boolean }>;

const SCHEDULE_LEGEND = [
  { color: "border-yellow-400", label: "Sense hora" },
  { color: "border-blue-400", label: "Pocs" },
  { color: "border-green-500", label: "Òptim" },
  { color: "border-red-500", label: "Excés" },
] as const;

export default function AdminBracketPanel({ year, prova, readOnly = false, subProvaId, fetchExternalBusyIntervals }: AdminBracketPanelProps) {
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
  const [teamsPerMatch, setTeamsPerMatch] = useState<number>(2);
  const [advancePerMatch, setAdvancePerMatch] = useState<number>(1);
  const advanceOptions = useMemo(() => validAdvanceOptions(teamsPerMatch), [teamsPerMatch]);

  // Schedule state (committed values synced with Firebase)
  const [matchDurationMinutes, setMatchDurationMinutes] = useState<number>(0);
  const [simultaneousMatches, setSimultaneousMatches] = useState<number>(1);
  const [matchSchedules, setMatchSchedules] = useState<Record<string, string>>({});

  // Local inputs for schedule config (not yet committed)
  const [localDuration, setLocalDuration] = useState<number>(0);
  const [localSimultaneous, setLocalSimultaneous] = useState<number>(1);
  const pendingDuration = useRef<number>(0);
  const pendingSimultaneous = useRef<number>(1);

  // Dialog state for schedule config changes
  const [schedConfigDialog, setSchedConfigDialog] = useState(false);
  const [schedGenerateDialog, setSchedGenerateDialog] = useState(false);

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Refs to avoid stale closures in async handlers
  const finalStageRef = useRef<FinalStageState | null>(null);
  const thirdPlaceMatchRef = useRef<ThirdPlaceMatch | null>(null);
  const groupStageRef = useRef<GroupStageState | null>(null);
  const matchDurationMinutesRef = useRef<number>(0);
  const simultaneousMatchesRef = useRef<number>(1);
  const matchSchedulesRef = useRef<Record<string, string>>({});
  // Last round-progress snapshot successfully persisted to Participants docs;
  // diffed against on every save so only the penyes that actually changed get
  // written (see computeRoundUpdates). Never touched for subprova brackets.
  const lastPersistedRoundInfoRef = useRef<RoundInfo>(new Map());

  const [localTpmA, setLocalTpmA] = useState<string>("");
  const [localTpmB, setLocalTpmB] = useState<string>("");

  const [showOverwriteAlert, setShowOverwriteAlert] = useState(false);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<"simple" | "groups">("simple");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Sync refs
  useEffect(() => { finalStageRef.current = finalStage; }, [finalStage]);
  useEffect(() => { thirdPlaceMatchRef.current = thirdPlaceMatch; }, [thirdPlaceMatch]);
  useEffect(() => { groupStageRef.current = groupStage; }, [groupStage]);
  useEffect(() => { matchDurationMinutesRef.current = matchDurationMinutes; }, [matchDurationMinutes]);
  useEffect(() => { simultaneousMatchesRef.current = simultaneousMatches; }, [simultaneousMatches]);
  useEffect(() => { matchSchedulesRef.current = matchSchedules; }, [matchSchedules]);

  useEffect(() => {
    setLocalTpmA(thirdPlaceMatch?.scoreA != null ? String(thirdPlaceMatch.scoreA) : "");
    setLocalTpmB(thirdPlaceMatch?.scoreB != null ? String(thirdPlaceMatch.scoreB) : "");
  }, [thirdPlaceMatch]);

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  const slotStatuses = useMemo(
    () => computeSlotStatuses(matchSchedules, localDuration, localSimultaneous, prova.startDate),
    [matchSchedules, localDuration, localSimultaneous, prova.startDate],
  );

  const hasAnySchedule = Object.values(matchSchedules).some((t) => !!t);

  // ─── Load from Firestore ─────────────────────────────────────────────────────

  // Live-subscribed rather than a one-time fetch: saveProvaBracket always
  // overwrites the full bracket document, so two devices editing different
  // matches of the same (sub-)prova would otherwise each hold a stale local
  // snapshot and silently stomp on each other's saves. Subscribing keeps both
  // devices' local state converged on the latest server document between
  // edits, closing (though not perfectly eliminating) that window.
  useEffect(() => {
    if (!prova.id) { setGroupStage(null); setFinalStage(null); setIsLoadingSavedBracket(false); lastPersistedRoundInfoRef.current = new Map(); return; }
    setIsLoadingSavedBracket(true);
    const unsubscribe = subscribeProvaBracket(
      year,
      prova.id,
      (saved) => {
        if (!saved) {
          setGroupStage(null);
          setFinalStage(null);
          lastPersistedRoundInfoRef.current = new Map();
          setIsLoadingSavedBracket(false);
          return;
        }

        const propagated = propagateBracketByes([...saved.finalStage.bracket.matches]);
        setGroupStage(saved.groupStage);
        setFinalStage({ ...saved.finalStage, bracket: { ...saved.finalStage.bracket, matches: propagated } });
        setThirdPlaceMatch(saved.finalStage.thirdPlaceMatch ?? syncThirdPlaceFromSemifinals(propagated, null));
        setTeamsPerMatch(saved.finalStage.bracket.teamsPerMatch ?? 2);
        setAdvancePerMatch(saved.finalStage.bracket.advancePerMatch ?? 1);
        lastPersistedRoundInfoRef.current = subProvaId
          ? new Map()
          : computeTeamRoundInfo(propagated, saved.groupStage);
        setSavedAt(saved.updatedAt ? saved.updatedAt.toDate() : null);
        setSaveStatus("saved");

        const dur = saved.matchDurationMinutes ?? 0;
        const sim = saved.simultaneousMatches ?? 1;
        const sched = saved.matchSchedules ?? {};
        setMatchDurationMinutes(dur); matchDurationMinutesRef.current = dur;
        setSimultaneousMatches(sim); simultaneousMatchesRef.current = sim;
        setMatchSchedules(sched); matchSchedulesRef.current = sched;
        setLocalDuration(dur); pendingDuration.current = dur;
        setLocalSimultaneous(sim); pendingSimultaneous.current = sim;
        setIsLoadingSavedBracket(false);
      },
      (err) => {
        toast.error("Error al carregar el quadre: " + err.message);
        setIsLoadingSavedBracket(false);
      },
      subProvaId,
    );
    return unsubscribe;
  }, [year, prova.id, subProvaId]);

  // ─── Save helpers ─────────────────────────────────────────────────────────────

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
    matchDurationMinutes: matchDurationMinutesRef.current || null,
    simultaneousMatches: simultaneousMatchesRef.current || null,
    matchSchedules: Object.keys(matchSchedulesRef.current).length > 0 ? matchSchedulesRef.current : null,
  });

  const revertToFirebase = async () => {
    if (!prova.id) return;
    try {
      const saved = await getProvaBracket(year, prova.id, subProvaId);
      if (!saved) return;
      const propagated = propagateBracketByes([...saved.finalStage.bracket.matches]);
      setGroupStage(saved.groupStage);
      setFinalStage({ ...saved.finalStage, bracket: { ...saved.finalStage.bracket, matches: propagated } });
      setThirdPlaceMatch(saved.finalStage.thirdPlaceMatch ?? syncThirdPlaceFromSemifinals(propagated, null));
      setTeamsPerMatch(saved.finalStage.bracket.teamsPerMatch ?? 2);
      setAdvancePerMatch(saved.finalStage.bracket.advancePerMatch ?? 1);
      setSavedAt(saved.updatedAt ? saved.updatedAt.toDate() : null);
      setSaveStatus("saved");
      const sched = saved.matchSchedules ?? {};
      setMatchSchedules(sched); matchSchedulesRef.current = sched;
    } catch { /* keep error state */ }
  };

  const doSave = async (fs: FinalStageState, tpm: ThirdPlaceMatch | null, gs: GroupStageState | null) => {
    if (!prova.id) return;
    setSaveStatus("saving");
    // Rondes progress is only ever read from the top-level Prova's Participants
    // docs (see publicDbService.getPenyaProves), never from a MultiProva subprova's
    // — so skip computing/writing it there entirely.
    const nextRoundInfo = subProvaId ? null : computeTeamRoundInfo(fs.bracket.matches, gs);
    const participantUpdates = nextRoundInfo
      ? computeRoundUpdates(lastPersistedRoundInfoRef.current, nextRoundInfo)
      : undefined;
    try {
      await saveProvaBracket(year, prova.id, buildPayload(fs, tpm, gs), user?.uid, subProvaId, participantUpdates);
      if (nextRoundInfo) lastPersistedRoundInfoRef.current = nextRoundInfo;
      setSavedAt(new Date());
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      toast.error("No s'ha pogut guardar el quadre. Revertint...");
      console.error(err);
      await revertToFirebase();
    }
  };

  // Transactional counterpart to doSave, used for match-result-style edits
  // (score entry, group winner override, 3r lloc, match time) — see
  // runBracketMutation. Unlike doSave, the write is computed against the
  // CURRENT server document (read inside the Firestore transaction), not
  // against local state, so two devices editing different matches/groups of
  // the same bracket concurrently no longer silently revert each other.
  const doTransactionalSave = async (mutate: BracketMutation) => {
    if (!prova.id) return;
    setSaveStatus("saving");
    try {
      const committed = await runBracketMutation(year, prova.id, subProvaId, user?.uid, mutate);
      const tpm = committed.finalStage.thirdPlaceMatch ?? null;
      const sched = committed.matchSchedules ?? {};
      setFinalStage(committed.finalStage); finalStageRef.current = committed.finalStage;
      setThirdPlaceMatch(tpm); thirdPlaceMatchRef.current = tpm;
      setGroupStage(committed.groupStage); groupStageRef.current = committed.groupStage;
      setMatchSchedules(sched); matchSchedulesRef.current = sched;
      if (!subProvaId) {
        lastPersistedRoundInfoRef.current = computeTeamRoundInfo(committed.finalStage.bracket.matches, committed.groupStage);
      }
      setSavedAt(new Date());
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      toast.error(
        err instanceof BracketMutationAbortedError
          ? "Un altre dispositiu ha modificat aquest quadre. Es recarreguen les dades."
          : "No s'ha pogut guardar el quadre. Revertint..."
      );
      console.error(err);
      await revertToFirebase();
    }
  };

  /** Applies `mutate` optimistically to local state (using the exact same pure
   *  function the transaction will run server-side, so the two can't drift
   *  apart) and fires the transactional save. If the local optimistic apply
   *  is a no-op (e.g. the match/group was somehow already gone locally), the
   *  transaction still runs and its own abort/error handling takes over. */
  const applyLocalAndSave = (mutate: BracketMutation) => {
    if (!finalStageRef.current) return;
    const localDoc = buildPayload(finalStageRef.current, thirdPlaceMatchRef.current, groupStageRef.current);
    const optimistic = mutate(localDoc);
    if (optimistic) {
      const tpm = optimistic.next.finalStage.thirdPlaceMatch ?? null;
      const sched = optimistic.next.matchSchedules ?? {};
      setFinalStage(optimistic.next.finalStage); finalStageRef.current = optimistic.next.finalStage;
      setThirdPlaceMatch(tpm); thirdPlaceMatchRef.current = tpm;
      setGroupStage(optimistic.next.groupStage); groupStageRef.current = optimistic.next.groupStage;
      setMatchSchedules(sched); matchSchedulesRef.current = sched;
    }
    doTransactionalSave(mutate);
  };

  // ─── Schedule handlers ────────────────────────────────────────────────────────

  const handleMatchTimeChange = (internalId: string, time: string) => {
    applyLocalAndSave((current) => applyMatchTimeMutation(current, internalId, time, subProvaId));
  };

  const applyScheduleConfigUpdate = async () => {
    const cleared: Record<string, string> = {};
    setMatchSchedules(cleared); matchSchedulesRef.current = cleared;
    setMatchDurationMinutes(localDuration); matchDurationMinutesRef.current = localDuration;
    setSimultaneousMatches(localSimultaneous); simultaneousMatchesRef.current = localSimultaneous;
    pendingDuration.current = localDuration;
    pendingSimultaneous.current = localSimultaneous;
    if (finalStageRef.current) {
      await doSave(finalStageRef.current, thirdPlaceMatchRef.current, groupStageRef.current);
    }
  };

  const handleScheduleConfigBlur = () => {
    if (pendingDuration.current === localDuration && pendingSimultaneous.current === localSimultaneous) return;
    if (hasAnySchedule) {
      setSchedConfigDialog(true);
    } else {
      applyScheduleConfigUpdate();
    }
  };

  const offsetToTime = (offsetMinutes: number): string => {
    const d = new Date(prova.startDate);
    d.setMinutes(d.getMinutes() + offsetMinutes);
    d.setSeconds(0, 0);
    return formatTime(d);
  };

  const doGenerateSchedule = async () => {
    if (!localDuration || !localSimultaneous || !finalStageRef.current) {
      toast.error("Cal configurar la durada i el nombre de partits simultanis");
      return;
    }
    const schedulableMatches = [...finalStageRef.current.bracket.matches]
      .filter((m) => m.status !== "bye")
      .sort((a, b) => a.roundNumber - b.roundNumber || a.position - b.position);

    // A team's identity can be known ahead of time even past Round 1, when a
    // bye advances it straight into a later round (see propagateBracketByes).
    // Any match with at least one resolved teamId is checked against sibling
    // sub-proves; matches where every slot is still TBD (pending a live
    // Round 1 result) are scheduled freely, with no sibling-conflict check.
    const knownMatches = schedulableMatches.filter((m) => m.teams.some((t) => t.teamId));
    const unknownMatches = schedulableMatches.filter((m) => !m.teams.some((t) => t.teamId));

    const externalBusy = fetchExternalBusyIntervals
      ? await fetchExternalBusyIntervals()
      : new Map<string, BusyInterval[]>();

    const knownItems: ScheduleItem[] = knownMatches.map((m) => ({
      itemId: m.id,
      teamIds: m.teams.map((t) => t.teamId).filter((id): id is string => !!id),
    }));

    const { assignments: knownAssignments, relaxed } = scheduleItemsAvoidingBusy(
      knownItems,
      localDuration,
      localSimultaneous,
      externalBusy,
      { shuffle: false }
    );

    const newSchedules: Record<string, string> = {};
    let knownEndMins = 0;
    knownMatches.forEach((m) => {
      const offset = knownAssignments.get(m.id) ?? 0;
      newSchedules[m.id] = offsetToTime(offset);
      knownEndMins = Math.max(knownEndMins, offset + localDuration);
    });

    if (unknownMatches.length > 0) {
      const { schedules: laterSchedules } = fillRoundsSequentially(
        unknownMatches,
        localDuration,
        localSimultaneous,
        knownEndMins
      );
      Object.entries(laterSchedules).forEach(([matchId, offset]) => {
        newSchedules[matchId] = offsetToTime(offset);
      });
    }

    setMatchSchedules(newSchedules); matchSchedulesRef.current = newSchedules;
    setMatchDurationMinutes(localDuration); matchDurationMinutesRef.current = localDuration;
    setSimultaneousMatches(localSimultaneous); simultaneousMatchesRef.current = localSimultaneous;
    pendingDuration.current = localDuration;
    pendingSimultaneous.current = localSimultaneous;

    if (finalStageRef.current) {
      await doSave(finalStageRef.current, thirdPlaceMatchRef.current, groupStageRef.current);
    }
    if (relaxed.length > 0) {
      toast.warning(
        `No s'ha pogut evitar el solapament amb altres subproves per a ${relaxed.length} partit(s) amb equip ja conegut.`
      );
    }
    toast.success("Horaris generats correctament");
  };

  // ─── Bracket generate helpers ─────────────────────────────────────────────────

  const doGenerateSimple = () => {
    if (teams.length < 2) { toast.error("Calen almenys 2 equips per generar el quadre."); return; }
    const entrants = createSimpleFinalEntrants(teams);
    const next = buildFinalStageFromEntrants(entrants, teamsPerMatch, advancePerMatch);
    if (!next) return;
    const propagated = buildPropagatedFinal(next);
    setGroupStage(null); groupStageRef.current = null;
    setFinalStage(propagated); finalStageRef.current = propagated;
    setThirdPlaceMatch(null); thirdPlaceMatchRef.current = null;
    setMatchSchedules({}); matchSchedulesRef.current = {};
    doSave(propagated, null, null);
  };

  const doGenerateGroups = () => {
    if (teams.length < MIN_TEAMS_FOR_GROUP_STAGE) {
      toast.error(`Calen almenys ${MIN_TEAMS_FOR_GROUP_STAGE} equips per a la fase de grups.`);
      return;
    }
    const nextGroupStage = createRandomBalancedGroupStage(teams);
    if (!nextGroupStage) { toast.error("No es pot crear una fase de grups amb el nombre d'equips actual."); return; }
    const entrants = createGroupFinalEntrants(nextGroupStage, teams);
    const nextFinal = buildFinalStageFromEntrants(entrants, teamsPerMatch, advancePerMatch);
    if (!nextFinal) return;
    const propagated = buildPropagatedFinal(nextFinal);
    setGroupStage(nextGroupStage); groupStageRef.current = nextGroupStage;
    setFinalStage(propagated); finalStageRef.current = propagated;
    setThirdPlaceMatch(null); thirdPlaceMatchRef.current = null;
    setMatchSchedules({}); matchSchedulesRef.current = {};
    doSave(propagated, null, nextGroupStage);
  };

  const onGenerateSimple = async () => {
    if (teams.length < 2) { toast.error("Calen almenys 2 equips per generar el quadre."); return; }
    if (prova.id) {
      const existing = await getProvaBracket(year, prova.id, subProvaId);
      if (existing) { setPendingGenerateMode("simple"); setShowOverwriteAlert(true); return; }
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
      if (existing) { setPendingGenerateMode("groups"); setShowOverwriteAlert(true); return; }
    }
    doGenerateGroups();
  };

  const handleConfirmGenerate = () => {
    setShowOverwriteAlert(false);
    pendingGenerateMode === "groups" ? doGenerateGroups() : doGenerateSimple();
  };

  // ─── Score handlers ───────────────────────────────────────────────────────────
  //
  // These five (final-bracket score, group-winner override, group-match score,
  // 3r lloc score, match time — handleMatchTimeChange above) all go through
  // applyLocalAndSave/doTransactionalSave: they're incremental, deterministic
  // edits that can safely be recomputed against the live server document under
  // a Firestore transaction retry. Bracket generation and schedule config
  // below intentionally stay on the plain-overwrite doSave path — they're
  // deliberate whole-bracket-replacing actions (already gated by their own
  // confirmation dialogs), and bracket generation specifically uses
  // Math.random() (fisherYatesShuffle), which must never run inside a
  // transaction body that Firestore might silently re-invoke on retry.

  const handleBracketScoreUpdate = (internalId: string, scores: (number | null)[]) => {
    const current = finalStageRef.current;
    if (
      current &&
      !canApplyBracketScore(current.bracket.matches, thirdPlaceMatchRef.current, internalId, scores)
    ) {
      toast.error("No es pot eliminar aquest resultat: ja s'ha jugat una ronda posterior.");
      // Nothing in `finalStage` actually changed, but a fresh reference makes
      // glootMatches recompute new participant objects, which re-triggers
      // BracketMatchCard's rawScores sync effect — snapping the input the
      // user just blanked back to the real, still-stored score.
      setFinalStage((prev) => (prev ? { ...prev } : prev));
      return;
    }

    applyLocalAndSave((doc) =>
      applyBracketScoreMutation(doc, internalId, scores, prova.winDirection, subProvaId)
    );
  };

  // ─── Group handlers ───────────────────────────────────────────────────────────

  const onWinnerChange = (groupId: string, teamId: string | null) => {
    const resolved = teamId === "__NONE__" ? null : teamId;
    applyLocalAndSave((current) => applyGroupWinnerMutation(current, groupId, resolved, teams, subProvaId));
  };

  const onMatchResultChange = (groupId: string, matchId: string, scoreA: number | null, scoreB: number | null) => {
    applyLocalAndSave((current) =>
      applyGroupMatchResultMutation(current, groupId, matchId, scoreA, scoreB, teams, subProvaId)
    );
  };

  // ─── 3rd place ────────────────────────────────────────────────────────────────

  const handleThirdPlaceScoreUpdate = (scoreA: number | null, scoreB: number | null) => {
    const tpm = thirdPlaceMatchRef.current;
    if (!tpm) return;
    applyLocalAndSave((current) =>
      applyThirdPlaceScoreMutation(current, tpm.teamA.teamId, tpm.teamB.teamId, scoreA, scoreB, subProvaId)
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const renderSaveStatus = () => {
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
                className={`rounded-lg border p-3 transition-colors ${!readOnly ? "hover:bg-muted/50 cursor-pointer" : ""}`}
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
                    <div key={s.teamId} className={`flex justify-between gap-2 ${s.teamId === group.winnerTeamId ? "text-primary font-semibold" : i === 0 && s.played > 0 ? "font-medium text-foreground" : ""}`}>
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
      return <p className="text-sm text-muted-foreground">Encara no hi ha cap quadre final generat.</p>;
    }
    return (
      <div className="w-full overflow-auto rounded-lg border p-4">
        <BracketViewer
          matches={glootMatches}
          onScoreChange={readOnly ? undefined : handleBracketScoreUpdate}
          readOnly={readOnly}
          matchSchedules={hasAnySchedule ? matchSchedules : undefined}
          onTimeChange={readOnly ? undefined : handleMatchTimeChange}
          slotStatuses={readOnly ? undefined : slotStatuses}
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
              <input type="text" inputMode="numeric" min={0} className="w-14 rounded border px-2 py-1 text-center text-sm bg-background" value={localTpmA} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setLocalTpmA(e.target.value); }} onBlur={() => { const val = localTpmA === "" ? null : Number(localTpmA); handleThirdPlaceScoreUpdate(val, localTpmB === "" ? null : Number(localTpmB)); }} />
              <span className="text-muted-foreground text-sm">–</span>
              <input type="text" inputMode="numeric" min={0} className="w-14 rounded border px-2 py-1 text-center text-sm bg-background" value={localTpmB} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setLocalTpmB(e.target.value); }} onBlur={() => { const val = localTpmB === "" ? null : Number(localTpmB); handleThirdPlaceScoreUpdate(localTpmA === "" ? null : Number(localTpmA), val); }} />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{tpm?.status === "finished" ? `${tpm.scoreA} – ${tpm.scoreB}` : "–"}</span>
          )}
          <span className="text-sm min-w-[120px]">{teamBName}</span>
          {tpm?.status === "finished" && tpm.winnerTeamId && (
            <Badge variant="secondary">Guanyador: {tpm.winnerTeamId === tpm.teamA.teamId ? teamAName : teamBName}</Badge>
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
          <>
            {/* Bracket generation buttons */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Equips per enfrontament</label>
                <Select
                  value={String(teamsPerMatch)}
                  onValueChange={(v) => {
                    const k = Number(v);
                    setTeamsPerMatch(k);
                    if (!validAdvanceOptions(k).includes(advancePerMatch)) setAdvancePerMatch(1);
                  }}
                  disabled={isLoadingSavedBracket}
                >
                  <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    {[2, 3, 4, 5, 6, 7, 8].map((k) => (
                      <SelectItem key={k} value={String(k)}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {advanceOptions.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Equips que avancen</label>
                  <Select
                    value={String(advancePerMatch)}
                    onValueChange={(v) => setAdvancePerMatch(Number(v))}
                    disabled={isLoadingSavedBracket}
                  >
                    <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">
                      {advanceOptions.map((a) => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={onGenerateSimple} disabled={isLoadingSavedBracket}>Generar quadre</Button>
              {teams.length >= MIN_TEAMS_FOR_GROUP_STAGE && (
                <Button variant="outline" onClick={onGenerateGroups} disabled={isLoadingSavedBracket}>Generar amb grups</Button>
              )}
            </div>

            <Separator />

            {/* Schedule config */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Durada per enfrontament (min)</label>
                  <Input
                    type="number"
                    min={1}
                    className="w-28 h-8 text-sm"
                    value={localDuration || ""}
                    onChange={(e) => setLocalDuration(e.target.value ? Number(e.target.value) : 0)}
                    onBlur={handleScheduleConfigBlur}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Enfrontaments simultanis màxims</label>
                  <Input
                    type="number"
                    min={1}
                    className="w-28 h-8 text-sm"
                    value={localSimultaneous || ""}
                    onChange={(e) => setLocalSimultaneous(e.target.value ? Number(e.target.value) : 1)}
                    onBlur={handleScheduleConfigBlur}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!localDuration || !localSimultaneous || !finalStage || isLoadingSavedBracket}
                  onClick={() => hasAnySchedule ? setSchedGenerateDialog(true) : doGenerateSchedule()}
                >
                  Generar horaris
                </Button>
              </div>

              {/* Color legend */}
              {(hasAnySchedule || localDuration > 0) && (
                <div className="flex flex-wrap gap-4 items-center">
                  {SCHEDULE_LEGEND.map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`w-3 h-3 rounded border-2 ${color} inline-block`} />
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Separator />
          </>
        )}

        {/* Bracket content */}
        <div className="space-y-6">
          {renderGroupStage()}
          {groupStage && <p className="text-sm font-semibold">Quadre Final</p>}
          {renderFinalBracket()}
          {renderThirdPlaceMatch()}
        </div>
      </CardContent>

      {/* Overwrite bracket dialog */}
      <AlertDialog open={showOverwriteAlert} onOpenChange={setShowOverwriteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ja existeix un quadre</AlertDialogTitle>
            <AlertDialogDescription>Si generes un nou quadre, el quadre actual i tots els resultats es perdran. Vols continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate}>Generar de nou</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule config change dialog */}
      <AlertDialog open={schedConfigDialog} onOpenChange={setSchedConfigDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modificar configuració d'horaris</AlertDialogTitle>
            <AlertDialogDescription>Ja hi ha partits amb horari assignat. Si continues, tots els horaris s'esborren. Vols continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSchedConfigDialog(false); setLocalDuration(pendingDuration.current); setLocalSimultaneous(pendingSimultaneous.current); }}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setSchedConfigDialog(false); applyScheduleConfigUpdate(); }}>Continuar i esborrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule regenerate dialog */}
      <AlertDialog open={schedGenerateDialog} onOpenChange={setSchedGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar horaris</AlertDialogTitle>
            <AlertDialogDescription>Ja hi ha partits amb horari assignat. Si continues, tots els horaris actuals s'esborraran i es generaran de nou. Vols continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setSchedGenerateDialog(false); doGenerateSchedule(); }}>Regenerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group matches dialog */}
      {groupStage && selectedGroupId && (() => {
        const group = groupStage.groups.find((g) => g.groupId === selectedGroupId);
        if (!group) return null;
        return (
          <GroupMatchesDialog
            open={true}
            onOpenChange={(open) => { if (!open) setSelectedGroupId(null); }}
            group={group}
            teamById={teamById}
            onMatchResultChange={(matchId, scoreA, scoreB) => onMatchResultChange(selectedGroupId, matchId, scoreA, scoreB)}
            onWinnerChange={onWinnerChange}
          />
        );
      })()}
    </Card>
  );
}
