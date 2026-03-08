import type {
  BracketMode,
  BracketTeamSnapshot,
  FinalStageState,
  GroupStageState,
  StoredProvaBracketDoc,
} from "@/features/bracket/types";
import { db } from "@/firebase/firebase";
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeBracketMode(value: unknown): BracketMode {
  return value === "groups_to_final" ? "groups_to_final" : "simple_final";
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
    groupStage: (isRecord(data.groupStage)
      ? (data.groupStage as GroupStageState)
      : null),
    finalStage: data.finalStage as FinalStageState,
    updatedAt,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
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

  await setDoc(bracketRef, {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: userId ?? null,
  });
}
