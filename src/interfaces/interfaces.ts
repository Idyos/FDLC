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

export interface PenyaProvaSummary {
  provaId: string;
  name: string;
  provaReference: string;
  position: number;
  points: number;
  resultsDate: Date;
  imageUrl?: string;
}

//#endregion

//#region Proves
export enum WinDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export type Ubication = {
  lat: number;
  lng: number;
  name?: string;
};

export const provaTypes = ["Ninguna", "Participació", "Temps", "Punts", "Rondes", "MultiProva"] as const;
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

let points = [
  { from: 1, to: 1, points: 25 },
  { from: 2, to: 3, points: 18 },
  { from: 4, to: 10, points: 10 },
  { from: 11, to: 20, points: 5 },
  { from: 21, to: Infinity, points: 3 },
];

export abstract class BaseChallenge {
  name: string;
  description: string;
  startDate: Date;
  finishDate: Date;
  type: ProvaType = "Ninguna";
  location: Ubication | null;
  points: PointsRange[];
  penyes: Array<PenyaInfo>;
  reference: string | null;
  winDirection: WinDirection;

  constructor(
    name: string,
    creationDate: Date,
    points: PointsRange[],
    description: string,
    endingDate: Date,
    location?: Ubication,
    winDirection: WinDirection = WinDirection.DESC
  ) {
    this.name = name;
    this.startDate = creationDate;
    this.points = points;
    this.description = description;
    this.finishDate = endingDate;
    this.location = location || null;
    this.penyes = [];
    this.reference = "";
    this.winDirection = winDirection;
  }

  isFinished(): boolean {
    return this.finishDate ? new Date() > this.finishDate : false;
  }

  addTeam(penya: PenyaInfo): void {
    this.penyes.push(penya);
  }

  getPointsForPosition(position: number): number {
    const range = this.points.find(
      (r) => position >= r.from && position <= r.to
    );
    return range ? range.points : 0;
  }

  abstract getResults(penyesInfo: PenyaInfo[]): ChallengeResult[];
}

export class ChallengeByParticipation extends BaseChallenge {
  type: ProvaType = "Participació";
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
  type: ProvaType = "Temps";
  resultados: {
    penyaId: string;
    tiempo: number;
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const sorted = [...this.resultados].sort((a, b) =>
      this.winDirection === WinDirection.ASC
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
  type: ProvaType = "Punts";
  resultados: {
    penyaId: string;
    puntos: number;
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const sorted = [...this.resultados].sort((a, b) =>
      this.winDirection === WinDirection.ASC
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
  type: ProvaType = "Rondes";
  fases: {
    ronda: number;
    partidos: {
      penyaA: string;
      penyaB: string;
      ganador: string;
    }[];
  }[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    return [];
  }
}

export class MultiChallenge extends BaseChallenge {
  type: ProvaType = "MultiProva";
  subpruebas: BaseChallenge[] = [];

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    return [];
  }
}

//#endregion
