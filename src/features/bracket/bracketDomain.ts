import {
  generateSingleElimBracket,
  type Team,
} from "@/utils/bracketCreator";
import type {
  BracketTeamSnapshot,
  FinalEntrant,
  FinalStageState,
  GroupStageState,
} from "@/features/bracket/types";

const MIN_GROUP_SIZE = 4;
const MAX_GROUP_SIZE = 6;
const TARGET_GROUP_SIZE = 5;

export const MIN_TEAMS_FOR_GROUP_STAGE = 8;

type GroupCandidate = {
  groupCount: number;
  size: number;
  sizeDistance: number;
  remainder: number;
};

function groupLabelFromIndex(index: number): string {
  let value = index;
  let label = "";

  do {
    const letterCode = 65 + (value % 26);
    label = String.fromCharCode(letterCode) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

export function sanitizeTeamSnapshot(
  teams: BracketTeamSnapshot[],
): BracketTeamSnapshot[] {
  const seen = new Set<string>();
  const sanitized: BracketTeamSnapshot[] = [];

  for (const team of teams) {
    const id = team.teamId.trim();
    const name = team.name.trim();

    if (id.length === 0 || name.length === 0 || seen.has(id)) {
      continue;
    }

    seen.add(id);
    sanitized.push({ teamId: id, name });
  }

  return sanitized;
}

export function fisherYatesShuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled;
}

export function chooseGroupCount(teamCount: number): number | null {
  if (teamCount < MIN_TEAMS_FOR_GROUP_STAGE) {
    return null;
  }

  const candidates: GroupCandidate[] = [];

  for (let groupCount = 2; groupCount <= teamCount; groupCount += 1) {
    const size = teamCount / groupCount;
    if (size < MIN_GROUP_SIZE || size > MAX_GROUP_SIZE) {
      continue;
    }

    candidates.push({
      groupCount,
      size,
      sizeDistance: Math.abs(size - TARGET_GROUP_SIZE),
      remainder: teamCount % groupCount,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.sizeDistance !== b.sizeDistance) {
      return a.sizeDistance - b.sizeDistance;
    }

    if (a.remainder !== b.remainder) {
      return a.remainder - b.remainder;
    }

    return b.groupCount - a.groupCount;
  });

  return candidates[0].groupCount;
}

export function createRandomBalancedGroupStage(
  teams: BracketTeamSnapshot[],
): GroupStageState | null {
  const sanitizedTeams = sanitizeTeamSnapshot(teams);
  const groupCount = chooseGroupCount(sanitizedTeams.length);

  if (!groupCount) {
    return null;
  }

  const shuffledTeams = fisherYatesShuffle(sanitizedTeams);
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const groupId = groupLabelFromIndex(index);
    return {
      groupId,
      groupName: `Grup ${groupId}`,
      teamIds: [] as string[],
      winnerTeamId: null,
    };
  });

  shuffledTeams.forEach((team, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].teamIds.push(team.teamId);
  });

  return {
    assignmentPolicy: "random_balanced_4_6",
    winnerPolicy: "manual_with_placeholders",
    pairingPolicy: "adjacent_groups",
    groups,
  };
}

function toBracketTeams(entrants: FinalEntrant[]): Team[] {
  return entrants.map((entrant, index) => ({
    teamId: entrant.teamId ?? `placeholder-${entrant.entryId}-${index + 1}`,
    displayName: entrant.name,
    seed: index + 1,
  }));
}

export function createSimpleFinalEntrants(
  teams: BracketTeamSnapshot[],
): FinalEntrant[] {
  const shuffledTeams = fisherYatesShuffle(sanitizeTeamSnapshot(teams));

  return shuffledTeams.map((team, index) => ({
    entryId: `SIMPLE-${index + 1}`,
    teamId: team.teamId,
    name: team.name,
    sourceGroupId: null,
    isPlaceholder: false,
  }));
}

export function createGroupFinalEntrants(
  groupStage: GroupStageState,
  teams: BracketTeamSnapshot[],
): FinalEntrant[] {
  const teamById = new Map<string, BracketTeamSnapshot>();
  sanitizeTeamSnapshot(teams).forEach((team) => {
    teamById.set(team.teamId, team);
  });

  return groupStage.groups.map((group, index) => {
    const winnerTeam = group.winnerTeamId
      ? teamById.get(group.winnerTeamId) ?? null
      : null;

    if (winnerTeam) {
      return {
        entryId: `GROUP-${index + 1}`,
        teamId: winnerTeam.teamId,
        name: winnerTeam.name,
        sourceGroupId: group.groupId,
        isPlaceholder: false,
      };
    }

    return {
      entryId: `GROUP-${index + 1}`,
      teamId: null,
      name: `Guanyador Grup ${group.groupId}`,
      sourceGroupId: group.groupId,
      isPlaceholder: true,
    };
  });
}

export function buildFinalStageFromEntrants(
  entrants: FinalEntrant[],
): FinalStageState | null {
  if (entrants.length < 2) {
    return null;
  }

  const bracket = generateSingleElimBracket({
    tournamentId: "admin-rondes",
    bracketId: "final",
    teams: toBracketTeams(entrants),
    pairingMode: "sequential",
  });

  return {
    seedingPolicy: "random",
    entrants,
    bracket,
  };
}
