// pages/admin/createProva/challengeFactory.ts
import {
  BaseChallenge,
  ChallengeByDiscalification,
  ChallengeByParticipation,
  ChallengeByPoints,
  ChallengeByTime,
  MultiChallenge,
  Ubication,
  PointsRange,
} from "@/interfaces/interfaces";
import { CreateChallenge } from "./createProvaData";

function normalizeLocation(
  loc: CreateChallenge["location"]
): Ubication | undefined {
  if (!loc) return undefined;
  return {
    lat: loc.lat ?? null,
    lng: loc.lng ?? null,
    name: loc.name ?? null,
  };
}

function normalizePointsRange(ranges: CreateChallenge["pointsRange"]): PointsRange[] {
  return (ranges ?? []).map(r => ({
    from: r.from ?? 0,
    to: r.to ?? 0,
    points: r.points ?? 0,
  }));
}

export function buildChallenge(data: CreateChallenge): BaseChallenge {
  let challenge: BaseChallenge;
  switch (data.challengeType) {
    case "Participació":
      challenge = new ChallengeByParticipation(); break;
    case "Temps":
      challenge = new ChallengeByTime(); break;
    case "Punts":
      challenge = new ChallengeByPoints(); break;
    case "Rondes":
      challenge = new ChallengeByDiscalification(); break;
    case "MultiProva":
      challenge = new MultiChallenge(); break;
    default:
      // nunca debería pasar tras Zod, pero por si acaso:
      challenge = new ChallengeByParticipation();
  }

  challenge.name = data.name;
  challenge.description = data.description;
  challenge.location = normalizeLocation(data.location);
  challenge.startDate = data.startDate;
  challenge.finishDate = data.endDate;
  challenge.challengeType = data.challengeType;
  challenge.winDirection = data.winDirection!;
  challenge.penyes = (data.penyes ?? []).map(p => ({
    penya: { penyaId: p.penya.id, name: p.penya.name },
    participates: p.participates,
  }));
  challenge.pointsRange = normalizePointsRange(data.pointsRange);

  return challenge;
}
