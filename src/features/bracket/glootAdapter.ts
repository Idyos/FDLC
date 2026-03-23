import type { Slot } from "@/utils/bracketCreator";
import type { GeneratedBracketSerializable } from "@/features/bracket/types";

export interface GlootParticipant {
  id: string;
  name: string;
  score: number | null;
  isWinner: boolean;
  editable: boolean;
  status: null;
  resultText: string | null;
}

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

    const participants = match.teams.map((participant, participantIndex) => {
      const slot: Slot = participantIndex === 0 ? "A" : "B";
      return {
        id:
          participant.teamId ??
          `${match.id}-${participant.slot}-${participantIndex + 1}`,
        name: getParticipantName(participant.source.type, participant.displayName),
        score: participant.score?.gamesWon ?? null,
        isWinner: match.winnerSlot === slot,
        editable: match.status !== "bye" && isResolved(participant.teamId),
        status: null,
        resultText: null,
      };
    });

    const clickable = match.status !== "bye" && participants.some((p) => p.editable);

    return {
      id: index + 1,
      internalId: match.id,
      clickable,
      name: `${match.roundName} ${match.position}`,
      nextMatchId: match.advanceTo
        ? matchIdMap.get(match.advanceTo.matchId) ?? null
        : null,
      tournamentRoundText: String(match.roundNumber),
      startTime: "TBD",
      state: "DONE",
      participants,
    };
  });
}
