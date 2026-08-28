import type {
  BracketMode,
  BracketTeamSnapshot,
  FinalStageState,
  GroupMatch,
  GroupStageState,
  GroupState,
  ParticipantRoundUpdate,
  StoredProvaBracketDoc,
} from "@/features/bracket/types";
import type { BracketMutation } from "@/features/bracket/bracketDomain";
import { db } from "@/firebase/firebase";
import {
  Timestamp,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeBracketMode(value: unknown): BracketMode {
  return value === "groups_to_final" ? "groups_to_final" : "simple_final";
}

function sanitizeGroupMatches(value: unknown): GroupMatch[] {
  if (!Array.isArray(value)) return [];
  const matches: GroupMatch[] = [];
  value.forEach((item) => {
    if (!isRecord(item)) return;
    if (typeof item.matchId !== "string") return;
    if (typeof item.teamAId !== "string") return;
    if (typeof item.teamBId !== "string") return;
    matches.push({
      matchId: item.matchId,
      teamAId: item.teamAId,
      teamBId: item.teamBId,
      scoreA: typeof item.scoreA === "number" ? item.scoreA : null,
      scoreB: typeof item.scoreB === "number" ? item.scoreB : null,
      winnerTeamId: typeof item.winnerTeamId === "string" ? item.winnerTeamId : null,
      isDraw: item.isDraw === true,
    });
  });
  return matches;
}

function sanitizeGroupStage(value: unknown): GroupStageState | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.groups)) return null;

  const groups: GroupState[] = [];
  value.groups.forEach((item: unknown) => {
    if (!isRecord(item)) return;
    if (typeof item.groupId !== "string") return;
    if (typeof item.groupName !== "string") return;
    if (!Array.isArray(item.teamIds)) return;
    groups.push({
      groupId: item.groupId,
      groupName: item.groupName,
      teamIds: item.teamIds.filter((id: unknown) => typeof id === "string"),
      matches: sanitizeGroupMatches(item.matches),
      winnerTeamId: typeof item.winnerTeamId === "string" ? item.winnerTeamId : null,
    });
  });

  return {
    assignmentPolicy: "random_balanced_4_6",
    winnerPolicy: "manual_with_placeholders",
    pairingPolicy: "adjacent_groups",
    groups,
  };
}

function sanitizeTeamSnapshot(value: unknown): BracketTeamSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const teams: BracketTeamSnapshot[] = [];

  value.forEach((item) => {
    if (!isRecord(item)) {
      return;
    }

    const teamId = item.teamId;
    const name = item.name;

    if (typeof teamId !== "string" || typeof name !== "string") {
      return;
    }

    teams.push({ teamId, name });
  });

  return teams;
}

/** Legacy documents (written before matchups became configurable) store
 *  slots as the strings "A"/"B" instead of a numeric index. Normalizes
 *  either shape to a number so the rest of the app can always assume
 *  numeric slots. */
function normalizeSlot(value: unknown): number {
  if (typeof value === "number") return value;
  if (value === "A") return 0;
  if (value === "B") return 1;
  return 0;
}

/** Legacy documents stored a single `{ matchId, slot }` object (from before a
 *  match could advance more than one team). Normalizes either shape to the
 *  current array-of-targets-by-rank form. */
function normalizeAdvanceTo(value: unknown): ({ matchId: string; slot: number } | null)[] | null {
  if (Array.isArray(value)) {
    return value.map((t) =>
      isRecord(t) && typeof t.matchId === "string" ? { matchId: t.matchId, slot: normalizeSlot(t.slot) } : null,
    );
  }
  if (isRecord(value) && typeof value.matchId === "string") {
    return [{ matchId: value.matchId, slot: normalizeSlot(value.slot) }];
  }
  return null;
}

/** Legacy documents (from before a match's full ranking was tracked) only
 *  have `winnerSlot`. Backfills `ranking` for a resolved match as
 *  [winnerSlot, ...other real slots], which is exactly what a K=2 match's
 *  ranking already looked like — safe to synthesize for any K since only the
 *  A=1 (classic) case could exist before this field was introduced. */
function normalizeRanking(match: Record<string, unknown>, winnerSlot: number | null, teams: Record<string, unknown>[]): number[] | null {
  if (Array.isArray(match.ranking)) {
    return match.ranking.filter((s): s is number => typeof s === "number");
  }
  if (winnerSlot == null || (match.status !== "finished" && match.status !== "bye")) return null;
  const realSlots = teams
    .map((t, idx) => (isRecord(t.source) && t.source.type !== "bye" && t.teamId ? idx : -1))
    .filter((idx) => idx !== -1);
  if (!realSlots.includes(winnerSlot)) return null;
  return [winnerSlot, ...realSlots.filter((s) => s !== winnerSlot)];
}

/** `finalStage` (bracket matches, entrants, 3rd place match) has never been
 *  schema-validated on read — it's trusted as-is. This normalizes the
 *  concerns introduced by configurable teams-per-match / advance-per-match,
 *  so both legacy and current documents are safe to use as `FinalStageState`:
 *  - `bracket.teamsPerMatch` defaults to 2, `bracket.advancePerMatch` to 1
 *    when missing (all brackets generated before these features existed were
 *    implicitly 2 teams per match, 1 advancing).
 *  - Legacy string slots ("A"/"B") are converted to numeric (0/1).
 *  - Legacy single-object `advanceTo` becomes a 1-length array; missing
 *    `ranking` is backfilled from `winnerSlot` (see normalizeRanking).
 *  Documents are rewritten in the new shape the next time they're saved
 *  (saveProvaBracket always overwrites the full document), so this is a
 *  read-time, self-healing normalization rather than a migration script. */
function normalizeFinalStage(value: unknown): FinalStageState {
  const raw = isRecord(value) ? value : {};
  const rawBracket = isRecord(raw.bracket) ? raw.bracket : {};
  const rawMatches = Array.isArray(rawBracket.matches) ? rawBracket.matches : [];

  const matches = rawMatches.map((item, idx) => {
    const match = isRecord(item) ? item : {};
    const rawTeams = Array.isArray(match.teams) ? match.teams : [];
    const teams = rawTeams.map((t, teamIdx) => {
      const participant = isRecord(t) ? t : {};
      return { ...participant, slot: normalizeSlot(participant.slot ?? teamIdx) };
    });
    const advanceTo = normalizeAdvanceTo(match.advanceTo);
    const winnerSlot = match.winnerSlot == null ? null : normalizeSlot(match.winnerSlot);
    const ranking = normalizeRanking(match, winnerSlot, teams);

    return { ...match, teams, advanceTo, winnerSlot, ranking, id: match.id ?? idx };
  });

  const teamsPerMatch =
    typeof rawBracket.teamsPerMatch === "number" &&
    rawBracket.teamsPerMatch >= 2 &&
    rawBracket.teamsPerMatch <= 8
      ? rawBracket.teamsPerMatch
      : 2;

  const advancePerMatch =
    typeof rawBracket.advancePerMatch === "number" &&
    rawBracket.advancePerMatch >= 1 &&
    rawBracket.advancePerMatch < teamsPerMatch &&
    teamsPerMatch % rawBracket.advancePerMatch === 0
      ? rawBracket.advancePerMatch
      : 1;

  return {
    ...raw,
    bracket: { ...rawBracket, matches, teamsPerMatch, advancePerMatch },
  } as unknown as FinalStageState;
}

function bracketDocPath(year: number, provaId: string, subProvaId?: string): string {
  if (subProvaId) {
    return `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Bracket/current`;
  }
  return `Circuit/${year}/Proves/${provaId}/Bracket/current`;
}

/** Shared by getProvaBracket, subscribeProvaBracket, and runBracketMutation —
 *  every read path must normalize legacy documents (slot/advanceTo/ranking
 *  backfills, see normalizeFinalStage) identically, or a mutation computed
 *  from an un-normalized transaction read would silently misbehave. */
function parseBracketDoc(data: unknown): StoredProvaBracketDoc | null {
  if (!isRecord(data) || !isRecord(data.finalStage)) return null;
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt : null;
  return {
    schemaVersion: 1,
    challengeType: "Rondes",
    mode: sanitizeBracketMode(data.mode),
    teamSnapshot: sanitizeTeamSnapshot(data.teamSnapshot),
    groupStage: sanitizeGroupStage(data.groupStage),
    finalStage: normalizeFinalStage(data.finalStage),
    updatedAt,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    matchDurationMinutes: typeof data.matchDurationMinutes === "number" ? data.matchDurationMinutes : null,
    simultaneousMatches: typeof data.simultaneousMatches === "number" ? data.simultaneousMatches : null,
    matchSchedules: isRecord(data.matchSchedules) ? (data.matchSchedules as Record<string, string>) : null,
  };
}

export async function getProvaBracket(
  year: number,
  provaId: string,
  subProvaId?: string,
): Promise<StoredProvaBracketDoc | null> {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));
  const bracketSnap = await getDoc(bracketRef);
  if (!bracketSnap.exists()) return null;
  return parseBracketDoc(bracketSnap.data());
}

export function subscribeProvaBracket(
  year: number,
  provaId: string,
  onData: (doc: StoredProvaBracketDoc | null) => void,
  onError: (error: Error) => void,
  subProvaId?: string,
): () => void {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));
  return onSnapshot(
    bracketRef,
    (snap) => {
      onData(snap.exists() ? parseBracketDoc(snap.data()) : null);
    },
    onError,
  );
}

export async function saveProvaBracket(
  year: number,
  provaId: string,
  data: StoredProvaBracketDoc,
  userId?: string,
  subProvaId?: string,
  participantUpdates?: ParticipantRoundUpdate[],
): Promise<void> {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));

  // JSON round-trip strips undefined values, which Firestore rejects
  const sanitized = JSON.parse(JSON.stringify(data));

  const batch = writeBatch(db);
  batch.set(bracketRef, {
    ...sanitized,
    updatedAt: serverTimestamp(),
    updatedBy: userId ?? null,
  });

  participantUpdates?.forEach(({ penyaId, lastRoundPlayed, hasWon }) => {
    const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);
    batch.update(participantRef, {
      lastRoundPlayed: lastRoundPlayed === null ? deleteField() : lastRoundPlayed,
      hasWon: hasWon === null ? deleteField() : hasWon,
    });
  });

  await batch.commit();
}

/** Thrown when a bracket mutation can't proceed against the live server
 *  document — either it doesn't exist, or the specific match/group the edit
 *  targets is gone (e.g. another admin regenerated the bracket concurrently). */
export class BracketMutationAbortedError extends Error {}

/** Runs `mutate` inside a Firestore transaction against the CURRENT server
 *  bracket document, instead of saveProvaBracket's full-overwrite-from-local-
 *  state approach. Firestore automatically retries the transaction (re-running
 *  `mutate` against a fresh read) if the document changed between the read and
 *  the commit, so two near-simultaneous edits from different devices serialize
 *  correctly instead of one silently reverting the other — this is the fix for
 *  the concurrent-edit data loss that saveProvaBracket is prone to.
 *
 *  This is the first use of runTransaction in the codebase; treat it as the
 *  reference pattern for any future concurrent-write surface rather than
 *  reaching for writeBatch's "hope nobody collides" approach. */
export async function runBracketMutation(
  year: number,
  provaId: string,
  subProvaId: string | undefined,
  userId: string | undefined,
  mutate: BracketMutation,
): Promise<StoredProvaBracketDoc> {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));
  let result: StoredProvaBracketDoc | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bracketRef);
    const current = snap.exists() ? parseBracketDoc(snap.data()) : null;
    if (!current) throw new BracketMutationAbortedError("Bracket document not found");

    const outcome = mutate(current);
    if (!outcome) throw new BracketMutationAbortedError("Mutation target no longer exists");

    // JSON round-trip strips undefined values, which Firestore rejects
    const sanitized = JSON.parse(JSON.stringify(outcome.next));
    tx.set(bracketRef, { ...sanitized, updatedAt: serverTimestamp(), updatedBy: userId ?? null });

    outcome.participantUpdates?.forEach(({ penyaId, lastRoundPlayed, hasWon }) => {
      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${penyaId}`);
      tx.update(participantRef, {
        lastRoundPlayed: lastRoundPlayed === null ? deleteField() : lastRoundPlayed,
        hasWon: hasWon === null ? deleteField() : hasWon,
      });
    });

    // Not the server-resolved Timestamp (serverTimestamp() resolves async,
    // server-side) — same client-clock approximation the callers already made
    // via setSavedAt(new Date()) before this function existed.
    result = outcome.next;
  });

  return result!;
}
