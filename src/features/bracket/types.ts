import type { Timestamp } from "firebase/firestore";
import type { GeneratedBracket } from "@/utils/bracketCreator";

export type BracketMode = "simple_final" | "groups_to_final";

export interface BracketTeamSnapshot {
  teamId: string;
  name: string;
}

export interface GroupState {
  groupId: string;
  groupName: string;
  teamIds: string[];
  winnerTeamId: string | null;
}

export interface GroupStageState {
  assignmentPolicy: "random_balanced_4_6";
  winnerPolicy: "manual_with_placeholders";
  pairingPolicy: "adjacent_groups";
  groups: GroupState[];
}

export interface FinalEntrant {
  entryId: string;
  teamId: string | null;
  name: string;
  sourceGroupId: string | null;
  isPlaceholder: boolean;
}

export type GeneratedBracketSerializable = GeneratedBracket;

export interface FinalStageState {
  seedingPolicy: "random";
  entrants: FinalEntrant[];
  bracket: GeneratedBracketSerializable;
}

export interface StoredProvaBracketDoc {
  schemaVersion: 1;
  challengeType: "Rondes";
  mode: BracketMode;
  teamSnapshot: BracketTeamSnapshot[];
  groupStage: GroupStageState | null;
  finalStage: FinalStageState;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
}
