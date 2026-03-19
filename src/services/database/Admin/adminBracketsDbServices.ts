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

export async function getProvaBracket(
  year: number,
  provaId: string,
): Promise<StoredProvaBracketDoc | null> {
  const bracketRef = doc(
    db,
    `Circuit/${year}/Proves/${provaId}/Bracket/current`,
  );
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
    finalStage: data.finalStage as unknown as FinalStageState,
    updatedAt,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

export function subscribeProvaBracket(
  year: number,
  provaId: string,
  onData: (doc: StoredProvaBracketDoc | null) => void,
  onError: (error: Error) => void,
): () => void {
  const bracketRef = doc(db, `Circuit/${year}/Proves/${provaId}/Bracket/current`);
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
        finalStage: data.finalStage as unknown as FinalStageState,
        updatedAt,
        updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
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
): Promise<void> {
  const bracketRef = doc(
    db,
    `Circuit/${year}/Proves/${provaId}/Bracket/current`,
  );

  // JSON round-trip strips undefined values, which Firestore rejects
  const sanitized = JSON.parse(JSON.stringify(data));

  await setDoc(bracketRef, {
    ...sanitized,
    updatedAt: serverTimestamp(),
    updatedBy: userId ?? null,
  });
}
