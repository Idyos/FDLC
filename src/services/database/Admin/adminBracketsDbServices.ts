import type {
  BracketMode,
  BracketTeamSnapshot,
  FinalStageState,
  GroupMatch,
  GroupStageState,
  GroupState,
  StoredProvaBracketDoc,
} from "@/features/bracket/types";
import { db } from "@/firebase/firebase";
import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
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

/** `finalStage` (bracket matches, entrants, 3rd place match) has never been
 *  schema-validated on read — it's trusted as-is. This normalizes the two
 *  concerns introduced by configurable teams-per-match, so both legacy and
 *  current documents are safe to use as `FinalStageState`:
 *  - `bracket.teamsPerMatch` defaults to 2 when missing (all brackets
 *    generated before this feature were implicitly 2 teams per match).
 *  - Legacy string slots ("A"/"B") are converted to numeric (0/1).
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
    const advanceTo = isRecord(match.advanceTo)
      ? { ...match.advanceTo, slot: normalizeSlot(match.advanceTo.slot) }
      : (match.advanceTo as null | undefined) ?? null;
    const winnerSlot = match.winnerSlot == null ? null : normalizeSlot(match.winnerSlot);

    return { ...match, teams, advanceTo, winnerSlot, id: match.id ?? idx };
  });

  const teamsPerMatch =
    typeof rawBracket.teamsPerMatch === "number" &&
    rawBracket.teamsPerMatch >= 2 &&
    rawBracket.teamsPerMatch <= 8
      ? rawBracket.teamsPerMatch
      : 2;

  return {
    ...raw,
    bracket: { ...rawBracket, matches, teamsPerMatch },
  } as unknown as FinalStageState;
}

function bracketDocPath(year: number, provaId: string, subProvaId?: string): string {
  if (subProvaId) {
    return `Circuit/${year}/Proves/${provaId}/SubProves/${subProvaId}/Bracket/current`;
  }
  return `Circuit/${year}/Proves/${provaId}/Bracket/current`;
}

export async function getProvaBracket(
  year: number,
  provaId: string,
  subProvaId?: string,
): Promise<StoredProvaBracketDoc | null> {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));
  const bracketSnap = await getDoc(bracketRef);

  if (!bracketSnap.exists()) {
    return null;
  }

  const data = bracketSnap.data();
  if (!isRecord(data) || !isRecord(data.finalStage)) {
    return null;
  }

  const updatedAt =
    data.updatedAt instanceof Timestamp ? data.updatedAt : null;

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
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      if (!isRecord(data) || !isRecord(data.finalStage)) {
        onData(null);
        return;
      }
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt : null;
      onData({
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
      });
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
): Promise<void> {
  const bracketRef = doc(db, bracketDocPath(year, provaId, subProvaId));

  // JSON round-trip strips undefined values, which Firestore rejects
  const sanitized = JSON.parse(JSON.stringify(data));

  await setDoc(bracketRef, {
    ...sanitized,
    updatedAt: serverTimestamp(),
    updatedBy: userId ?? null,
  });
}
