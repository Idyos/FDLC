import {
  generateSingleElimBracket,
  type GeneratedBracket,
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
  ParticipantRoundUpdate,
  StoredProvaBracketDoc,
  ThirdPlaceMatch,
} from "@/features/bracket/types";
import type { WinDirection } from "@/interfaces/interfaces";

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
  teamsPerMatch: number = 2,
  advancePerMatch: number = 1,
): FinalStageState | null {
  if (entrants.length < 2) {
    return null;
  }

  const bracket = generateSingleElimBracket({
    tournamentId: "admin-rondes",
    bracketId: "final",
    teams: toBracketTeams(entrants),
    pairingMode: "sequential",
    teamsPerMatch,
    advancePerMatch,
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

/** Propagates known advancers (from BYE or finished matches) to their target
 *  matches' participant slots, so subsequent matches show the real team name.
 *  Runs iteratively until no more slots can be filled. */
export function propagateBracketByes(matches: Match[]): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const byId = new Map(updated.map((m) => [m.id, m]));

  let changed = true;
  while (changed) {
    changed = false;
    for (const match of updated) {
      const ranking = match.ranking;
      if (!ranking || !match.advanceTo) continue;
      match.advanceTo.forEach((target, rank) => {
        if (!target) return;
        const advancerSlot = ranking[rank];
        if (advancerSlot == null) return;
        const advancer = match.teams[advancerSlot];
        if (!advancer?.teamId) return;
        const next = byId.get(target.matchId);
        if (!next) return;
        if (next.teams[target.slot].teamId == null) {
          next.teams = [...next.teams];
          next.teams[target.slot] = {
            ...next.teams[target.slot],
            teamId: advancer.teamId,
            displayName: advancer.displayName ?? advancer.teamId,
          };
          changed = true;
        }
      });
    }
  }

  return updated;
}

/** Applies propagateBracketByes to a freshly-generated/rebuilt FinalStageState
 *  (fills in any immediately-known BYE advancers before it's ever shown). */
export function buildPropagatedFinal(fs: FinalStageState): FinalStageState {
  return { ...fs, bracket: { ...fs.bracket, matches: propagateBracketByes([...fs.bracket.matches]) } };
}

/** Propagates a team identity change through subsequent rounds without altering
 *  existing scores. If the updated slot is one of the ranked slots of a finished
 *  match, the corresponding advanceTo target (matched by rank) is updated too
 *  and propagation continues up the tree. */
function propagateTeamToSlot(
  matches: Match[],
  matchId: string,
  slot: Slot,
  teamId: string,
  displayName: string,
): void {
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx === -1) return;

  if (matches[idx].teams[slot].teamId === teamId) return;

  const match = matches[idx];
  const rank = match.ranking?.indexOf(slot) ?? -1;

  matches[idx] = {
    ...match,
    winnerTeamId: match.winnerSlot === slot ? teamId : match.winnerTeamId,
    teams: match.teams.map((t, i) =>
      i === slot ? { ...t, teamId, displayName } : t,
    ),
  };

  const target = rank !== -1 ? match.advanceTo?.[rank] : null;
  if (target) {
    propagateTeamToSlot(matches, target.matchId, target.slot, teamId, displayName);
  }
}

/** Clears the team identity (and any score) that `match` had already
 *  propagated into its advanceTo target's slot(s), resetting that next match
 *  too if it had already been resolved from it — used whenever `match` stops
 *  being resolved, whether via a full clear (clearMatchResult) or a partial
 *  de-scoring edit that drops it below allRealScored (resolveMatchResult). */
function clearAdvanceTargetSlots(matches: Match[], match: Match): Match[] {
  const targets = (match.advanceTo ?? []).filter(
    (t): t is { matchId: string; slot: Slot } => t != null,
  );
  if (targets.length === 0) return matches;
  const nextIdx = matches.findIndex((m) => m.id === targets[0].matchId);
  if (nextIdx === -1) return matches;

  const slotIdxs = new Set(targets.map((t) => t.slot));
  const wasFinished = matches[nextIdx].status === "finished";
  const updated = [...matches];
  updated[nextIdx] = {
    ...updated[nextIdx],
    status: wasFinished ? "scheduled" : updated[nextIdx].status,
    winnerSlot: wasFinished ? null : updated[nextIdx].winnerSlot,
    winnerTeamId: wasFinished ? null : updated[nextIdx].winnerTeamId,
    ranking: wasFinished ? null : updated[nextIdx].ranking,
    teams: updated[nextIdx].teams.map((t, i) =>
      slotIdxs.has(i) ? { ...t, teamId: undefined, displayName: undefined, score: undefined } : t,
    ),
  };
  return updated;
}

/** Records the result of a bracket match (up to K scores, one per team.length
 *  slot, null for slots without an entered score yet) and propagates every
 *  advancing team (there may be more than one, see advancePerMatch) to its
 *  target slot in the next match.
 *  - If any real (non-BYE, resolved) participant is still missing a score,
 *    the entered scores are stored but nothing is resolved.
 *  - Once every real participant has a score, they're ranked best-to-worst
 *    (per winDirection: lowest wins for "ASC", highest wins otherwise).
 *  - A tie straddling the advance cut-off (the boundary between who advances
 *    and who doesn't) is ambiguous and leaves the match unresolved. For the
 *    final match (no advanceTo — every slot gets its own placement 1..K
 *    directly from this ranking) any tie anywhere blocks resolution.
 *  If the ranking changes, the affected advancing teams are propagated
 *  through subsequent rounds while preserving their existing scores. */
export function resolveMatchResult(
  matches: Match[],
  matchId: string,
  scores: (number | null)[],
  winDirection: WinDirection,
): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const idx = updated.findIndex((m) => m.id === matchId);
  if (idx === -1) return updated;

  const match = updated[idx];
  // Always reflects `scores` as given — a null entry means "this slot is
  // currently blank," not "leave whatever score it had before." (Previously
  // `s == null` returned `t` unchanged, which meant clearing a single score
  // field silently did nothing: the very next render re-synced the input
  // back to the old value with no error, no feedback, and no actual change.)
  const teamsWithScores = match.teams.map((t, i) => {
    const s = scores[i];
    return { ...t, score: s == null ? undefined : { ...t.score, gamesWon: s } };
  });

  const realSlots = match.teams
    .map((t, i) => (t.source.type !== "bye" && t.teamId ? i : -1))
    .filter((i) => i !== -1);
  const allRealScored = realSlots.length > 0 && realSlots.every((i) => scores[i] != null);

  if (!allRealScored) {
    // A previously-finished match losing a score (whether one field or all
    // of them got blanked) is no longer resolved — reset it and undo
    // whatever it had already propagated forward, the same way a full clear
    // does. Callers only reach this de-resolving path once
    // canApplyBracketScore/canClearBracketMatch has confirmed the next match
    // hasn't been played, so this one-level undo can't strand anything.
    const wasFinished = match.status === "finished";
    const withClearedTarget = wasFinished ? clearAdvanceTargetSlots(updated, match) : updated;
    withClearedTarget[idx] = {
      ...match,
      teams: teamsWithScores,
      status: wasFinished ? "scheduled" : match.status,
      winnerSlot: wasFinished ? null : match.winnerSlot,
      winnerTeamId: wasFinished ? null : match.winnerTeamId,
      ranking: wasFinished ? null : match.ranking,
    };
    return withClearedTarget;
  }

  const ascending = winDirection === "ASC";
  const orderedSlots = [...realSlots].sort((a, b) =>
    ascending ? scores[a]! - scores[b]! : scores[b]! - scores[a]!,
  );

  const cutoff = match.advanceTo ? match.advanceTo.length : orderedSlots.length;
  const tieAtCutoff =
    cutoff < orderedSlots.length && scores[orderedSlots[cutoff - 1]] === scores[orderedSlots[cutoff]];
  const finalHasTie =
    !match.advanceTo && orderedSlots.some((s, i) => i > 0 && scores[s] === scores[orderedSlots[i - 1]]);

  if (tieAtCutoff || finalHasTie) {
    updated[idx] = { ...match, status: "scheduled", winnerSlot: null, winnerTeamId: null, ranking: null, teams: teamsWithScores };
    return updated;
  }

  const winnerSlot = orderedSlots[0];
  const newWinnerId = match.teams[winnerSlot].teamId ?? null;

  updated[idx] = {
    ...match,
    status: "finished",
    winnerSlot,
    winnerTeamId: newWinnerId,
    ranking: orderedSlots,
    teams: teamsWithScores,
  };

  match.advanceTo?.forEach((target, rank) => {
    if (!target) return;
    const advancerSlot = orderedSlots[rank];
    const advancer = match.teams[advancerSlot];
    if (!advancer?.teamId) return;
    propagateTeamToSlot(updated, target.matchId, target.slot, advancer.teamId, advancer.displayName ?? advancer.teamId);
  });

  return propagateBracketByes(updated);
}

// ---------------------------------------------------------------------------
// 3rd-place match helpers
// ---------------------------------------------------------------------------

/** Returns true when the bracket has enough rounds to have a semifinal
 *  (≥4 teams, ≥2 rounds) AND is a classic 2-teams-per-match bracket. A 3rd
 *  place playoff has no clean generalization when K>2 (the round before the
 *  final has K matches, not 2, so there's no single pair of semifinal losers
 *  to seed it from), so it's intentionally not offered for K≠2 brackets. */
export function shouldHaveThirdPlaceMatch(matches: Match[]): boolean {
  if (matches.length === 0) return false;
  const teamsPerMatch = matches[0].teams.length;
  if (teamsPerMatch !== 2) return false;
  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  return totalRounds >= 2;
}

/** Derives the 3rd-place match from the two semifinal losers.
 *  Preserves existing scores if the participants haven't changed.
 *  Returns null if no semifinal has been played yet, or if the bracket
 *  doesn't have a 3rd place match (see shouldHaveThirdPlaceMatch). */
export function syncThirdPlaceFromSemifinals(
  matches: Match[],
  current: ThirdPlaceMatch | null | undefined,
): ThirdPlaceMatch | null {
  if (!shouldHaveThirdPlaceMatch(matches)) return null;

  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  const semifinalRound = totalRounds - 1;
  const semifinals = matches
    .filter((m) => m.roundNumber === semifinalRound)
    .sort((a, b) => a.position - b.position);

  if (semifinals.length < 2) return null;

  const getLoser = (m: Match): { teamId: string | null; displayName: string | null } | null => {
    if (m.winnerSlot == null || !m.winnerTeamId) return null;
    const loserIdx = 1 - m.winnerSlot;
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

/** Resets a finished match back to 'scheduled' and clears the advancing teams
 *  from their target slots in the next match (all of a match's advanceTo
 *  targets always point at the same next match, see bracketCreator.ts). If
 *  the next match was also finished, it is reset too (one level of cascading). */
export function clearMatchResult(matches: Match[], matchId: string): Match[] {
  const updated = matches.map((m) => ({ ...m, teams: [...m.teams] }));
  const idx = updated.findIndex((m) => m.id === matchId);
  if (idx === -1) return updated;

  const match = updated[idx];
  const cleared = clearAdvanceTargetSlots(updated, match);

  // Reset the match itself
  cleared[idx] = {
    ...match,
    status: "scheduled",
    winnerSlot: null,
    winnerTeamId: null,
    ranking: null,
    teams: match.teams.map((t) => ({ ...t, score: undefined })),
  };

  return cleared;
}

/** Whether `matchId`'s currently-finished result can be deleted without
 *  needing to cascade a reset into any OTHER already-recorded result: true
 *  only when none of the match(es) it feeds into (its `advanceTo` targets)
 *  has already been played, and — if it's a semifinal — the 3r lloc match
 *  hasn't been played either (deleting would silently reset that too, since
 *  syncThirdPlaceFromSemifinals re-derives it from the semifinals' current
 *  losers). clearMatchResult itself only cascades ONE level forward (see its
 *  own doc comment above), so anything beyond that would leave a downstream
 *  match's own advancement stale — this keeps "delete a result" restricted to
 *  the safe, no-cascade case: the latest completed matches only. */
export function canClearBracketMatch(
  matches: Match[],
  thirdPlaceMatch: ThirdPlaceMatch | null | undefined,
  matchId: string,
): boolean {
  const match = matches.find((m) => m.id === matchId);
  if (!match || match.status !== "finished") return false;

  const feedsAPlayedMatch = (match.advanceTo ?? []).some((target) => {
    if (!target) return false;
    return matches.find((m) => m.id === target.matchId)?.status === "finished";
  });
  if (feedsAPlayedMatch) return false;

  if (shouldHaveThirdPlaceMatch(matches)) {
    const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
    if (match.roundNumber === totalRounds - 1 && thirdPlaceMatch?.status === "finished") {
      return false;
    }
  }

  return true;
}

/** Whether applying `scores` to `matchId` is safe to persist as-is: true
 *  unless it would de-resolve a currently-finished match (partially or fully
 *  clearing its score) in a way that needs canClearBracketMatch's no-cascade
 *  check. A match that isn't currently finished, or an edit that keeps a
 *  match fully scored (e.g. correcting a typo), is always fine — nothing
 *  downstream depends on it changing. This is the single check both the
 *  client-side pre-check (adminBracketPanel.tsx) and the transactional
 *  mutation (applyBracketScoreMutation) call, so they can never disagree. */
export function canApplyBracketScore(
  matches: Match[],
  thirdPlaceMatch: ThirdPlaceMatch | null | undefined,
  matchId: string,
  scores: (number | null)[],
): boolean {
  const match = matches.find((m) => m.id === matchId);
  if (!match || match.status !== "finished") return true;

  const realSlots = match.teams
    .map((t, i) => (t.source.type !== "bye" && t.teamId ? i : -1))
    .filter((i) => i !== -1);
  const willBeFullyScored = realSlots.length > 0 && realSlots.every((i) => scores[i] != null);
  if (willBeFullyScored) return true;

  return canClearBracketMatch(matches, thirdPlaceMatch, matchId);
}

// ---------------------------------------------------------------------------
// Final standings / positions
// ---------------------------------------------------------------------------

/** Computes teamId → final position for a finished (or partially finished)
 *  elimination bracket.
 *  - The final match's own `ranking` gives every one of its participants a
 *    distinct placement 1..K directly — this is what makes a 4+ team final
 *    resolve 1st/2nd/3rd/4th automatically without a separate playoff.
 *  - When the 3rd place match has been played (offered for K=2 only, see
 *    shouldHaveThirdPlaceMatch), it overrides the final's own 2-way ranking
 *    for positions 3/4 with the dedicated semifinal-losers playoff.
 *  - Every earlier round's non-advancing participants (all but the top
 *    advancePerMatch of `ranking`) tie for the same position tier:
 *    bracketSize / (teamsPerMatch/advancePerMatch)^round + 1. This
 *    reproduces the classic K=2/A=1 tiers (semifinal loser → 3, etc.). */
export function computeBracketPositions(
  bracket: Pick<GeneratedBracket, "matches" | "bracketSize" | "teamsPerMatch" | "advancePerMatch">,
  thirdPlaceMatch: ThirdPlaceMatch | null | undefined,
): Map<string, number> {
  const { matches, bracketSize, teamsPerMatch, advancePerMatch } = bracket;
  const positionMap = new Map<string, number>();
  if (matches.length === 0) return positionMap;

  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  const finalMatch = matches.find((m) => m.roundNumber === totalRounds);
  if (!finalMatch?.ranking?.length) return positionMap;

  finalMatch.ranking.forEach((slotIdx, i) => {
    const teamId = finalMatch.teams[slotIdx]?.teamId;
    if (teamId) positionMap.set(teamId, i + 1);
  });

  if (teamsPerMatch === 2 && thirdPlaceMatch?.status === "finished" && thirdPlaceMatch.winnerTeamId) {
    positionMap.set(thirdPlaceMatch.winnerTeamId, 3);
    if (thirdPlaceMatch.loserTeamId) positionMap.set(thirdPlaceMatch.loserTeamId, 4);
  }

  const A = advancePerMatch ?? 1;
  const S = teamsPerMatch / A;
  for (let r = totalRounds - 1; r >= 1; r -= 1) {
    const tier = bracketSize / Math.pow(S, r) + 1;
    const roundMatches = matches.filter((m) => m.roundNumber === r && m.ranking?.length);
    for (const m of roundMatches) {
      m.ranking!.slice(A).forEach((slotIdx) => {
        const teamId = m.teams[slotIdx]?.teamId;
        if (!teamId || positionMap.has(teamId)) return;
        positionMap.set(teamId, tier);
      });
    }
  }

  return positionMap;
}

/** Per-team "last round played" + whether they won it, derived purely from the
 *  bracket state (no totalRounds needed by the caller: distance-to-final is
 *  self-contained, see distToFinalRoundName in bracketCreator.ts). Byes are not
 *  a played round on purpose — only 'finished' matches count. Teams eliminated
 *  in a decided group without reaching the final bracket get the -1 sentinel
 *  ("Fase de grups"). Teams with nothing playable yet are simply absent from
 *  the map — callers diff this against a previous snapshot to know what to
 *  write/delete on the corresponding Participants doc. */
export function computeTeamRoundInfo(
  matches: Match[],
  groupStage: GroupStageState | null,
): Map<string, { lastRoundPlayed: number; hasWon: boolean }> {
  const info = new Map<string, { lastRoundPlayed: number; hasWon: boolean }>();
  if (matches.length === 0) {
    if (!groupStage) return info;
  } else {
    const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
    const finished = matches.filter((m) => m.status === "finished");

    finished.forEach((m) => {
      const distToFinal = totalRounds - m.roundNumber;
      m.teams.forEach((participant, slotIdx) => {
        const teamId = participant.teamId;
        if (!teamId) return;
        const current = info.get(teamId);
        if (current && current.lastRoundPlayed <= distToFinal) return; // keep the most advanced (lowest dist) round
        info.set(teamId, { lastRoundPlayed: distToFinal, hasWon: slotIdx === m.winnerSlot });
      });
    });
  }

  if (groupStage) {
    groupStage.groups.forEach((group) => {
      if (!group.winnerTeamId) return; // group not decided yet
      group.teamIds.forEach((teamId) => {
        if (teamId === group.winnerTeamId) return;
        if (info.has(teamId)) return; // already reached the final bracket
        info.set(teamId, { lastRoundPlayed: -1, hasWon: false });
      });
    });
  }

  return info;
}

type RoundInfo = ReturnType<typeof computeTeamRoundInfo>;

/** Diffs two computeTeamRoundInfo() snapshots into the minimal set of
 *  Participants writes needed to bring Firestore from `prev` to `next` —
 *  including explicit clears (null) for penyes that had progress before and
 *  don't anymore (e.g. the bracket got regenerated). */
export function computeRoundUpdates(prev: RoundInfo, next: RoundInfo): ParticipantRoundUpdate[] {
  const updates: ParticipantRoundUpdate[] = [];
  const allPenyaIds = new Set([...prev.keys(), ...next.keys()]);
  allPenyaIds.forEach((penyaId) => {
    const before = prev.get(penyaId);
    const after = next.get(penyaId);
    if (before?.lastRoundPlayed === after?.lastRoundPlayed && before?.hasWon === after?.hasWon) return;
    updates.push({
      penyaId,
      lastRoundPlayed: after ? after.lastRoundPlayed : null,
      hasWon: after ? after.hasWon : null,
    });
  });
  return updates;
}

// ---------------------------------------------------------------------------
// Transactional mutation builders
//
// Each `apply*Mutation` below is a pure function of (current server document,
// this edit's own inputs) that returns the next document to persist — used as
// the callback passed to `runBracketMutation` (adminBracketsDbServices.ts),
// which re-invokes it against a fresh `tx.get()` read on every Firestore
// transaction retry. They MUST stay pure and deterministic (no Math.random(),
// Date.now(), or reads of component/ref state) — that's what makes it safe
// for Firestore to call one more than once per logical edit. Returning null
// aborts the transaction (the thing being edited no longer exists server-side,
// e.g. another admin regenerated the bracket concurrently).
// ---------------------------------------------------------------------------

export type BracketMutationResult = {
  next: StoredProvaBracketDoc;
  participantUpdates?: ParticipantRoundUpdate[];
};

export type BracketMutation = (current: StoredProvaBracketDoc) => BracketMutationResult | null;

function withRoundInfo(
  current: StoredProvaBracketDoc,
  next: StoredProvaBracketDoc,
  subProvaId: string | undefined,
): BracketMutationResult {
  // Rondes progress is only ever read from the top-level Prova's Participants
  // docs, never from a MultiProva subprova's — so skip it entirely there.
  if (subProvaId) return { next };
  const prevInfo = computeTeamRoundInfo(current.finalStage.bracket.matches, current.groupStage);
  const nextInfo = computeTeamRoundInfo(next.finalStage.bracket.matches, next.groupStage);
  return { next, participantUpdates: computeRoundUpdates(prevInfo, nextInfo) };
}

/** A final-bracket (or 3rd place, via syncThirdPlaceFromSemifinals) match
 *  score entry/clear. Mirrors handleBracketScoreUpdate's logic, but resolved
 *  against the live server `current` document instead of local state. */
export function applyBracketScoreMutation(
  current: StoredProvaBracketDoc,
  internalId: string,
  scores: (number | null)[],
  winDirection: WinDirection,
  subProvaId: string | undefined,
): BracketMutationResult | null {
  const matches = current.finalStage.bracket.matches;
  if (!matches.some((m) => m.id === internalId)) return null;
  if (!canApplyBracketScore(matches, current.finalStage.thirdPlaceMatch, internalId, scores)) {
    return null;
  }

  const allNull = scores.every((s) => s === null);
  const updatedMatches = allNull
    ? clearMatchResult(matches, internalId)
    : resolveMatchResult(matches, internalId, scores, winDirection);
  const thirdPlaceMatch = syncThirdPlaceFromSemifinals(updatedMatches, current.finalStage.thirdPlaceMatch ?? null);

  const next: StoredProvaBracketDoc = {
    ...current,
    finalStage: {
      ...current.finalStage,
      bracket: { ...current.finalStage.bracket, matches: updatedMatches },
      thirdPlaceMatch,
    },
  };
  return withRoundInfo(current, next, subProvaId);
}

/** A single match's scheduled time. Trivial disjoint-key merge. */
export function applyMatchTimeMutation(
  current: StoredProvaBracketDoc,
  internalId: string,
  time: string,
  subProvaId: string | undefined,
): BracketMutationResult | null {
  if (!current.finalStage.bracket.matches.some((m) => m.id === internalId)) return null;
  const next: StoredProvaBracketDoc = {
    ...current,
    matchSchedules: { ...(current.matchSchedules ?? {}), [internalId]: time },
  };
  return withRoundInfo(current, next, subProvaId);
}

/** The 3rd-place match's score. Aborts if the semifinal-derived matchup has
 *  changed since this edit was started (e.g. a concurrent semifinal result
 *  changed who's playing for 3rd) rather than writing a score for a stale
 *  pairing. */
export function applyThirdPlaceScoreMutation(
  current: StoredProvaBracketDoc,
  teamAId: string | null,
  teamBId: string | null,
  scoreA: number | null,
  scoreB: number | null,
  subProvaId: string | undefined,
): BracketMutationResult | null {
  const tpm = current.finalStage.thirdPlaceMatch;
  if (!tpm) return null;
  if (tpm.teamA.teamId !== teamAId || tpm.teamB.teamId !== teamBId) return null;

  let nextTpm: ThirdPlaceMatch;
  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    const winnerTeamId = scoreA > scoreB ? tpm.teamA.teamId : tpm.teamB.teamId;
    const loserTeamId = scoreA > scoreB ? tpm.teamB.teamId : tpm.teamA.teamId;
    nextTpm = { ...tpm, scoreA, scoreB, winnerTeamId, loserTeamId, status: "finished" };
  } else {
    nextTpm = { ...tpm, scoreA, scoreB, winnerTeamId: null, loserTeamId: null, status: "scheduled" };
  }

  const next: StoredProvaBracketDoc = {
    ...current,
    finalStage: { ...current.finalStage, thirdPlaceMatch: nextTpm },
  };
  return withRoundInfo(current, next, subProvaId);
}

/** Rebuilds the final-stage bracket from ALL of the server's current groups
 *  (not just the one this edit targets) with `groupId`'s winner overridden —
 *  this is what makes onWinnerChange safe to run inside a transaction: two
 *  devices confirming different groups' winners concurrently each layer their
 *  own group onto the other's already-committed result instead of one
 *  clobbering the other's view of the groups it didn't touch. */
export function applyGroupWinnerMutation(
  current: StoredProvaBracketDoc,
  groupId: string,
  teamId: string | null,
  teams: BracketTeamSnapshot[],
  subProvaId: string | undefined,
): BracketMutationResult | null {
  if (!current.groupStage) return null;
  if (!current.groupStage.groups.some((g) => g.groupId === groupId)) return null;

  const nextGroupStage: GroupStageState = {
    ...current.groupStage,
    groups: current.groupStage.groups.map((g) =>
      g.groupId !== groupId ? g : { ...g, winnerTeamId: teamId },
    ),
  };

  const entrants = createGroupFinalEntrants(nextGroupStage, teams);
  const rebuilt = buildFinalStageFromEntrants(entrants);
  const nextFinal = rebuilt ? buildPropagatedFinal(rebuilt) : current.finalStage;

  const next: StoredProvaBracketDoc = {
    ...current,
    mode: "groups_to_final",
    groupStage: nextGroupStage,
    finalStage: { ...nextFinal, thirdPlaceMatch: rebuilt ? null : current.finalStage.thirdPlaceMatch },
  };
  return withRoundInfo(current, next, subProvaId);
}

/** A group-stage match's score. If the suggested winner changes as a result,
 *  cascades into the same server-side full-groups rebuild as
 *  applyGroupWinnerMutation — reading every other group's winner from
 *  `current`, never from a caller's possibly-stale copy. */
export function applyGroupMatchResultMutation(
  current: StoredProvaBracketDoc,
  groupId: string,
  matchId: string,
  scoreA: number | null,
  scoreB: number | null,
  teams: BracketTeamSnapshot[],
  subProvaId: string | undefined,
): BracketMutationResult | null {
  if (!current.groupStage) return null;
  const group = current.groupStage.groups.find((g) => g.groupId === groupId);
  if (!group) return null;
  if (!group.matches.some((m) => m.matchId === matchId)) return null;

  const updatedMatches: GroupMatch[] = group.matches.map((match) => {
    if (match.matchId !== matchId) return match;
    if (scoreA === null && scoreB === null) {
      return { ...match, scoreA: null, scoreB: null, winnerTeamId: null, isDraw: false };
    }
    const isDraw = scoreA !== null && scoreB !== null && scoreA === scoreB;
    const winnerTeamId =
      scoreA !== null && scoreB !== null && !isDraw ? (scoreA > scoreB ? match.teamAId : match.teamBId) : null;
    return { ...match, scoreA, scoreB, isDraw, winnerTeamId };
  });

  const standings = calculateGroupStandings(updatedMatches, group.teamIds);
  const allPlayed = updatedMatches.every((m) => m.scoreA !== null && m.scoreB !== null);
  const suggested = allPlayed ? getSuggestedGroupWinner(standings) : null;
  const newWinnerId = suggested ?? group.winnerTeamId;
  const winnersChanged = group.winnerTeamId !== newWinnerId;

  const nextGroupStage: GroupStageState = {
    ...current.groupStage,
    groups: current.groupStage.groups.map((g) =>
      g.groupId !== groupId ? g : { ...g, matches: updatedMatches, winnerTeamId: newWinnerId },
    ),
  };

  if (winnersChanged) {
    const entrants = createGroupFinalEntrants(nextGroupStage, teams);
    const rebuilt = buildFinalStageFromEntrants(entrants);
    const nextFinal = rebuilt ? buildPropagatedFinal(rebuilt) : current.finalStage;
    const next: StoredProvaBracketDoc = {
      ...current,
      mode: "groups_to_final",
      groupStage: nextGroupStage,
      finalStage: { ...nextFinal, thirdPlaceMatch: rebuilt ? null : current.finalStage.thirdPlaceMatch },
    };
    return withRoundInfo(current, next, subProvaId);
  }

  const next: StoredProvaBracketDoc = { ...current, groupStage: nextGroupStage };
  return withRoundInfo(current, next, subProvaId);
}
