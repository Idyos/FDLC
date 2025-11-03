import { ParticipatingPenya } from "@/pages/admin/createProva/createProvaData";

//#region Penyes
export interface PenyaInfo {
  penyaId: string;
  name: string;
  totalPoints: number;
  position: number;
  isSecret?: boolean;
  imageUrl?: string;
  description?: string;
}

export interface PenyaRankingSummary extends PenyaInfo {
  directionChange: "up" | "down" | "same" | null;
}

export class ProvaSummary {
  constructor(){
    this.provaId = "";
    this.name = "";
    this.startDate = new Date(0);
    this.challengeType = "Temps";
  }

  provaId: string;
  imageUrl?: string;
  name: string;
  description?: string;
  startDate: Date;
  finishDate?: Date;
  challengeType: ProvaType;
}

export class PenyaProvaSummary extends ProvaSummary {
  constructor() {
    super();
    this.provaReference = "";
    this.participates = false;
  }

  provaReference: string;
  position?: number;
  result?: number;
  participates: boolean;
}

//#endregion

//#region Proves
export class ProvaInfo {
  constructor() {
    this.provaId = "";
    this.name = "";
    this.challengeType = "Temps";
    this.startDate = new Date(0);
    this.isFinished = false;
    this.pointsRange = [];
    this.results = [];
    this.winDirection = "NONE";
    this.pointsRange = [];
    this.location = undefined;
  }

  provaId: string;
  challengeType: ProvaType; 
  name: string;
  description?: string;
  isSecret?: boolean;
  imageUrl?: string;
  location?: Ubication;
  startDate: Date;
  finishDate?: Date;
  isFinished: boolean;
  winDirection: WinDirection; 
  pointsRange: PointsRange[];
  results: SingleProvaResultData[];
}

export interface ProvaInfoBracket extends ProvaInfo {
  results: BracketProvaResultData[];
} 

export const winDirections = ["NONE", "ASC", "DESC"] as const;
export type WinDirection = (typeof winDirections)[number];

export type Ubication = {
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
};

export const provaTypes = ["Participació", "Temps", "Punts", "Rondes", "MultiProva"] as const;
export type ProvaType = (typeof provaTypes)[number];

export type PointsRange = {
  from: number; // posición inicial (inclusive)
  to: number; // posición final (inclusive)
  points: number; // puntos otorgados a posiciones dentro del rango
};

export interface ChallengeResult {
  penyaId: string;
  name: string;
  position: number;
  pointsAwarded: number;
}

export interface SingleProvaResultData{
  index: number | undefined;
  provaReference: string;
  provaType: ProvaType;
  participates: boolean;
  penyaId: string;
  penyaName: string;
  result: number;
}

export interface BracketProvaResultData{
  index: number | undefined;
  provaReference: string;
  provaType: ProvaType;
  participates: boolean;
  penyaId: string;
  penyaName: string;
  result: number;
}

let points = [
  { from: 1, to: 1, points: 25 },
  { from: 2, to: 3, points: 18 },
  { from: 4, to: 10, points: 10 },
  { from: 11, to: 20, points: 5 },
  { from: 21, to: Infinity, points: 3 },
];

export abstract class BaseChallenge {
  imageUrl?: string;
  name: string;
  description?: string;
  startDate: Date;
  finishDate?: Date;
  challengeType: ProvaType = "Participació";
  location?: Ubication | null;
  pointsRange: PointsRange[];
  penyes: Array<ParticipatingPenya>;
  reference: string | null;
  winDirection: WinDirection;

  constructor() {
    this.name = "";
    this.startDate = new Date();
    this.pointsRange = points;
    this.penyes = [];
    this.reference = null;
    this.winDirection = "NONE";
  }

  isFinished(): boolean {
    return this.finishDate ? new Date() > this.finishDate : false;
  }

  addTeam(penya: ParticipatingPenya): void {
    this.penyes.push(penya);
  }

  getPointsForPosition(position: number): number {
    const range = this.pointsRange.find(
      (r) => position >= r.from && position <= r.to
    );
    return range ? range.points : 0;
  }

  abstract getResults(penyesInfo: PenyaInfo[]): ChallengeResult[];
}

export class ChallengeByParticipation extends BaseChallenge {
  challengeType: ProvaType = "Participació";
  resultados: {
    penyaId: string;
    participation: boolean;
  }[] = [];

    getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
        return this.resultados.map((res, index) => {
        const penya = penyesInfo.find((p) => p.penyaId === res.penyaId);
        return {
            penyaId: res.penyaId,
            name: penya?.name || "Desconegut",
            position: index + 1,
            pointsAwarded: this.getPointsForPosition(index + 1),
        };
        });
    }
}

export class ChallengeByTime extends BaseChallenge {
  challengeType: ProvaType = "Temps";
  resultados: {
    penyaId: string;
    tiempo: number;
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const sorted = [...this.resultados].sort((a, b) =>
      this.winDirection === "ASC"
        ? b.tiempo - a.tiempo
        : a.tiempo - b.tiempo
    );

    return sorted.map((res, index) => {
      const penya = penyesInfo.find((p) => p.penyaId === res.penyaId);
      return {
        penyaId: res.penyaId,
        name: penya?.name || "Desconegut",
        position: index + 1,
        pointsAwarded: this.getPointsForPosition(index + 1),
      };
    });
  }
}

export class ChallengeByPoints extends BaseChallenge {
  challengeType: ProvaType = "Punts";
  resultados: {
    penyaId: string;
    puntos: number;
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const sorted = [...this.resultados].sort((a, b) =>
      this.winDirection === "ASC"
        ? b.puntos - a.puntos
        : a.puntos - b.puntos
    );

    return sorted.map((res, index) => {
      const penya = penyesInfo.find((p) => p.penyaId === res.penyaId);
      return {
        penyaId: res.penyaId,
        name: penya?.name || "Desconegut",
        position: index + 1,
        pointsAwarded: this.getPointsForPosition(index + 1),
      };
    });
  }
}

export class ChallengeByDiscalification extends BaseChallenge {
  challengeType: ProvaType = "Rondes";
  fases: {
    ronda: number;
    partidos: {
      penyaA: string;
      penyaB: string;
      ganador: string;
    }[];
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    console.log(penyesInfo);
    return [];
  }
}

export class MultiChallenge extends BaseChallenge {
  challengeType: ProvaType = "MultiProva";
  subpruebas: BaseChallenge[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    console.log(penyesInfo);
    return [];
  }
}

//#endregion
