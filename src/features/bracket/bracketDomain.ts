import {
  generateSingleElimBracket,
  type Match,
  type Slot,
  type Team,
} from "@/utils/bracketCreator";
import type {
  BracketTeamSnapshot,
  FinalEntrant,
  FinalStageState,
  GroupMatch,
  GroupStageState,
  GroupStanding,
  ThirdPlaceMatch,
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

function generateGroupMatches(groupId: string, teamIds: string[]): GroupMatch[] {
  const matches: GroupMatch[] = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      matches.push({
        matchId: `G${groupId}_${i}v${j}`,
        teamAId: teamIds[i],
        teamBId: teamIds[j],
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
        isDraw: false,
      });
    }
  }
  return matches;
}

export function calculateGroupStandings(
  matches: GroupMatch[],
  teamIds: string[],
): GroupStanding[] {
  const map = new Map<string, GroupStanding>();
  for (const teamId of teamIds) {
    map.set(teamId, {
      teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
    });
  }

  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) continue;
    const a = map.get(match.teamAId);
    const b = map.get(match.teamBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.goalsFor += match.scoreA;
    a.goalsAgainst += match.scoreB;
    b.goalsFor += match.scoreB;
    b.goalsAgainst += match.scoreA;

    if (match.isDraw) {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    } else if (match.winnerTeamId === match.teamAId) {
      a.wins += 1;
      b.losses += 1;
      a.points += 3;
    } else if (match.winnerTeamId === match.teamBId) {
      b.wins += 1;
      a.losses += 1;
      b.points += 3;
    }
  }

  const standings = Array.from(map.values());
  standings.forEach((s) => {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

export function allGroupMatchesPlayed(matches: GroupMatch[]): boolean {
  return matches.length > 0 && matches.every((m) => m.scoreA !== null && m.scoreB !== null);
}

export function getSuggestedGroupWinner(standings: GroupStanding[]): string | null {
  if (standings.length < 2) return standings[0]?.teamId ?? null;
  if (standings[0].points > standings[1].points) return standings[0].teamId;
  return null;
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
      matches: [] as GroupMatch[],
      winnerTeamId: null,
    };
  });

  shuffledTeams.forEach((team, index) => {
    const groupIndex = index % groupCount;
    groups[groupIndex].teamIds.push(team.teamId);
  });

  groups.forEach((group) => {
    group.matches = generateGroupMatches(group.groupId, group.teamIds);
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

// ---------------------------------------------------------------------------
// Bracket match resolution helpers
// ---------------------------------------------------------------------------

/** Propagates known winners (from BYE or finished matches) to the next match's
 *  participant slot, so subsequent matches show the real team name.
 *  Runs iteratively until no more slots can be filled. */
export function propagateBracketByes(matches: Match[]): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const byId = new Map(updated.map((m) => [m.id, m]));

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of updated) {
      if (!match.winnerTeamId || !match.advanceTo) continue;
      const next = byId.get(match.advanceTo.matchId);
      if (!next) continue;
      const slotIdx: number = match.advanceTo.slot === "A" ? 0 : 1;
      if (next.teams[slotIdx].teamId == null) {
        const winner = match.teams.find((t) => t.teamId === match.winnerTeamId);
        next.teams = [...next.teams];
        next.teams[slotIdx] = {
          ...next.teams[slotIdx],
          teamId: match.winnerTeamId,
          displayName: winner?.displayName ?? match.winnerTeamId,
        };
        changed = true;
      }
    }
  }

  return updated;
}

/** Propagates a team identity change through subsequent rounds without altering
 *  existing scores. If the updated slot is the winning slot of a finished match,
 *  the winner identity is updated and propagation continues up the tree. */
function propagateTeamToSlot(
  matches: Match[],
  matchId: string,
  slot: Slot,
  teamId: string,
  displayName: string,
): void {
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx === -1) return;

  const slotIdx = slot === "A" ? 0 : 1;
  if (matches[idx].teams[slotIdx].teamId === teamId) return;

  const match = matches[idx];
  const updatedInWinnerSlot = match.winnerSlot === slot;

  matches[idx] = {
    ...match,
    winnerTeamId: updatedInWinnerSlot ? teamId : match.winnerTeamId,
    teams: match.teams.map((t, i) =>
      i === slotIdx ? { ...t, teamId, displayName } : t,
    ),
  };

  if (updatedInWinnerSlot && match.advanceTo) {
    propagateTeamToSlot(matches, match.advanceTo.matchId, match.advanceTo.slot, teamId, displayName);
  }
}

/** Records the result of a bracket match and propagates the winner to the next
 *  match slot. scoreA / scoreB must differ (no draws in knockout).
 *  If the winner changes, the new team is propagated through subsequent rounds
 *  while preserving their existing scores and results. */
export function resolveMatchWinner(
  matches: Match[],
  matchId: string,
  scoreA: number,
  scoreB: number,
): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const idx = updated.findIndex((m) => m.id === matchId);
  if (idx === -1) return updated;

  const winnerSlot: Slot = scoreA > scoreB ? "A" : "B";
  const winnerIdx = winnerSlot === "A" ? 0 : 1;
  const newWinnerId = updated[idx].teams[winnerIdx].teamId ?? null;

  updated[idx] = {
    ...updated[idx],
    status: "finished",
    winnerSlot,
    winnerTeamId: newWinnerId,
    teams: updated[idx].teams.map((t, i) => ({
      ...t,
      score: { ...t.score, gamesWon: i === 0 ? scoreA : scoreB },
    })),
  };

  const advanceTo = updated[idx].advanceTo;
  if (advanceTo && newWinnerId) {
    const winnerTeam = updated[idx].teams[winnerIdx];
    propagateTeamToSlot(updated, advanceTo.matchId, advanceTo.slot, newWinnerId, winnerTeam.displayName ?? newWinnerId);
  }

  return propagateBracketByes(updated);
}

// ---------------------------------------------------------------------------
// 3rd-place match helpers
// ---------------------------------------------------------------------------

/** Returns true when the bracket has enough rounds to have a semifinal,
 *  meaning a 3rd-place playoff makes sense (≥4 teams, ≥2 rounds). */
export function shouldHaveThirdPlaceMatch(matches: Match[]): boolean {
  if (matches.length === 0) return false;
  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  return totalRounds >= 2;
}

/** Derives the 3rd-place match from the two semifinal losers.
 *  Preserves existing scores if the participants haven't changed.
 *  Returns null if no semifinal has been played yet. */
export function syncThirdPlaceFromSemifinals(
  matches: Match[],
  current: ThirdPlaceMatch | null | undefined,
): ThirdPlaceMatch | null {
  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  if (totalRounds < 2) return null;

  const semifinalRound = totalRounds - 1;
  const semifinals = matches
    .filter((m) => m.roundNumber === semifinalRound)
    .sort((a, b) => a.position - b.position);

  if (semifinals.length < 2) return null;

  const getLoser = (m: Match): { teamId: string | null; displayName: string | null } | null => {
    if (!m.winnerSlot || !m.winnerTeamId) return null;
    const loserIdx = m.winnerSlot === "A" ? 1 : 0;
    const loserTeam = m.teams[loserIdx];
    return {
      teamId: loserTeam?.teamId ?? null,
      displayName: loserTeam?.displayName ?? null,
    };
  };

  const loserA = getLoser(semifinals[0]);
  const loserB = getLoser(semifinals[1]);

  if (!loserA && !loserB) return null;

  const teamA = loserA ?? { teamId: null, displayName: null };
  const teamB = loserB ?? { teamId: null, displayName: null };

  // Preserve scores if participants are unchanged
  if (
    current &&
    current.teamA.teamId === teamA.teamId &&
    current.teamB.teamId === teamB.teamId
  ) {
    return { ...current, teamA, teamB };
  }

  return {
    id: "M_3RD",
    teamA,
    teamB,
    scoreA: null,
    scoreB: null,
    winnerTeamId: null,
    loserTeamId: null,
    status: "scheduled",
  };
}

/** Resets a finished match back to 'scheduled' and clears the winner from the
 *  next match slot. If the next match was also finished, it is reset too
 *  (one level of cascading). */
export function clearMatchResult(matches: Match[], matchId: string): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const idx = updated.findIndex((m) => m.id === matchId);
  if (idx === -1) return updated;

  const match = updated[idx];

  // Clear the next match's participant slot that came from this match
  if (match.advanceTo) {
    const nextIdx = updated.findIndex((m) => m.id === match.advanceTo!.matchId);
    if (nextIdx !== -1) {
      const slotIdx = match.advanceTo.slot === "A" ? 0 : 1;
      updated[nextIdx] = {
        ...updated[nextIdx],
        status: updated[nextIdx].status === "finished" ? "scheduled" : updated[nextIdx].status,
        winnerSlot: updated[nextIdx].status === "finished" ? null : updated[nextIdx].winnerSlot,
        winnerTeamId: updated[nextIdx].status === "finished" ? null : updated[nextIdx].winnerTeamId,
        teams: updated[nextIdx].teams.map((t, i) =>
          i === slotIdx ? { ...t, teamId: undefined, displayName: undefined, score: undefined } : t,
        ),
      };
    }
  }

  // Reset the match itself
  updated[idx] = {
    ...match,
    status: "scheduled",
    winnerSlot: null,
    winnerTeamId: null,
    teams: match.teams.map((t) => ({ ...t, score: undefined })),
  };

  return updated;
}
