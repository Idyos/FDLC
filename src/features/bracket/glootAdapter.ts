import type { Slot } from "@/utils/bracketCreator";
import type { GeneratedBracketSerializable } from "@/features/bracket/types";

export interface GlootParticipant {
  id: string;
  name: string;
  score: number | null;
  isWinner: boolean;
  /** True when this participant is one of the ones advancing to the next
   *  match (top `advancePerMatch` of the match's ranking). Always false for
   *  the final match, which has no next match to advance to. */
  isAdvancing: boolean;
  /** Ordinal placement label (e.g. "1r", "3r"), only set on the final match
   *  once resolved and only when it has more than 2 participants — with
   *  exactly 2, the plain winner/loser highlight already conveys it. */
  positionLabel: string | null;
  editable: boolean;
  status: null;
  resultText: string | null;
}

const CATALAN_ORDINALS = ["1r", "2n", "3r", "4t", "5è", "6è", "7è", "8è"];

export interface GlootMatchData {
  id: number;
  internalId: string;
  clickable: boolean;
  name: string;
  nextMatchId: number | null;
  tournamentRoundText: string;
  startTime: string;
  state: "DONE";
  participants: GlootParticipant[];
}

function getParticipantName(sourceType: string, providedName?: string): string {
  if (providedName) {
    return providedName;
  }

  if (sourceType === "bye") {
    return "BYE";
  }

  return "Guanyador anterior";
}

export function toGlootMatches(
  bracket: GeneratedBracketSerializable,
): GlootMatchData[] {
  const orderedMatches = [...bracket.matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.position - b.position,
  );

  const matchIdMap = new Map<string, number>();
  orderedMatches.forEach((match, index) => {
    matchIdMap.set(match.id, index + 1);
  });

  return orderedMatches.map((match, index) => {
    const isResolved = (teamId: string | null | undefined) =>
      teamId != null && !teamId.startsWith("placeholder-");

    const advanceCount = match.advanceTo?.length ?? 0;
    const isFinal = !match.advanceTo;
    const showPositionLabels = isFinal && match.teams.length > 2 && !!match.ranking?.length;

    const participants = match.teams.map((participant, participantIndex) => {
      const slot: Slot = participantIndex;
      const rank = match.ranking?.indexOf(slot) ?? -1;
      return {
        id:
          participant.teamId ??
          `${match.id}-${participant.slot}-${participantIndex + 1}`,
        name: getParticipantName(participant.source.type, participant.displayName),
        score: participant.score?.gamesWon ?? null,
        isWinner: match.winnerSlot === slot,
        isAdvancing: rank !== -1 && rank < advanceCount,
        positionLabel: showPositionLabels && rank !== -1 ? CATALAN_ORDINALS[rank] ?? `${rank + 1}è` : null,
        editable: match.status !== "bye" && isResolved(participant.teamId),
        status: null,
        resultText: null,
      };
    });

    const clickable = match.status !== "bye" && participants.some((p) => p.editable);

    const nextMatchId = match.advanceTo?.find((t) => t)?.matchId;

    return {
      id: index + 1,
      internalId: match.id,
      clickable,
      name: `${match.roundName} ${match.position}`,
      nextMatchId: nextMatchId ? matchIdMap.get(nextMatchId) ?? null : null,
      tournamentRoundText: String(match.roundNumber),
      startTime: "TBD",
      state: "DONE",
      participants,
    };
  });
}
