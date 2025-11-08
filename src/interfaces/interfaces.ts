//#region 🔹 Tipos y constantes base

export const winDirections = ["NONE", "ASC", "DESC"] as const;
export type WinDirection = (typeof winDirections)[number];

export const provaTypes = [
  "null",
  "Participació",
  "Temps",
  "Punts",
  "Rondes",
  "MultiProva",
] as const;
export type ProvaType = (typeof provaTypes)[number];

export type PointsRange = {
  from: number;
  to: number;
  points: number;
};

export type Ubication = {
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
};

//#endregion

//#region 🧱 Base classes (entidades comunes)

export abstract class BaseEntity {
  id: string;
  name: string;
  description?: string;

  constructor(id: string = "", name: string = "", description?: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }
}

export class PenyaInfo extends BaseEntity {
  position: number;
  isSecret: boolean;
  imageUrl?: string;
  totalPoints?: number;

  constructor(
    penyaId: string = "",
    name: string = "",
    position: number = 0,
    isSecret: boolean = false,
    imageUrl?: string,
    description?: string
  ) {
    super(penyaId, name, description);
    this.position = position;
    this.isSecret = isSecret;
    this.imageUrl = imageUrl;
  }
}

//#endregion

//#region 🧭 Proves base
export interface ParticipatingPenya {
  penyaId: string; 
  name: string;
  index?: number;
  participates: boolean;
  result?: number;
}

export class ProvaSummary extends BaseEntity {

  reference: string;
  imageUrl?: string;
  startDate: Date;
  finishDate?: Date;
  challengeType: ProvaType;
  isFinished: boolean;  
  isSecret: boolean;

  constructor(
    id: string = "",
    reference: string = "",
    name: string = "",
    challengeType: ProvaType = "null",
    startDate: Date = new Date(0),
    finishDate?: Date,
    imageUrl?: string,
    description?: string,
    isFinished: boolean = false,
    isSecret: boolean = false,
  ) {
    super(id, name, description);
    this.reference = reference;
    this.imageUrl = imageUrl;
    this.startDate = startDate;
    this.finishDate = finishDate;
    this.challengeType = challengeType;
    this.isFinished = isFinished;
    this.isSecret = isSecret;
  }
}

export class PenyaProvaSummary extends ProvaSummary {
  position?: number;
  result?: number;
  participates: boolean;

  constructor() {
    super();
    this.participates = false;
  }
}

//#endregion

//#region 🧩 Datos de resultados

export class PenyaProvaResultData {
  index?: number;
  provaReference: string;
  provaType: ProvaType;
  participates: boolean;
  penyaId: string;
  penyaName: string;
  result: number;

  constructor(
    provaReference: string,
    provaType: ProvaType,
    penyaId: string,
    penyaName: string,
    result: number,
    participates: boolean = true,
    index?: number
  ) {
    this.index = index;
    this.provaReference = provaReference;
    this.provaType = provaType;
    this.penyaId = penyaId;
    this.penyaName = penyaName;
    this.result = result;
    this.participates = participates;
  }
}

export class PenyaProvaFinalResultData {
    penyaId: string;
    name: string;
    position?: number;
    pointsAwarded?: number;
    result: number;

  constructor() {
    this.penyaId = "";
    this.name = "";
    this.result = -1;
    this.pointsAwarded = -1;
    this.position = -1;
  }
}

export class ChallengeResult extends PenyaProvaResultData {
  pointsAwarded: number;

  constructor(
    base: PenyaProvaResultData,
    pointsAwarded: number
  ) {
    super(
      base.provaReference,
      base.provaType,
      base.penyaId,
      base.penyaName,
      base.result,
      base.participates,
      base.index
    );
    this.pointsAwarded = pointsAwarded;
  }
}

//#endregion

//#region ⚙️ Clase base Challenge

export abstract class Prova extends ProvaSummary {
  location?: Ubication;
  winDirection: WinDirection;
  pointsRange: PointsRange[];
  penyes: ParticipatingPenya[];

  constructor(
    reference: string = "",
    name: string = "",
    challengeType: ProvaType = "Participació",
    startDate: Date = new Date(),
    finishDate?: Date,
    pointsRange: PointsRange[] = [],
    penyes: ParticipatingPenya[] = [],
    winDirection: WinDirection = "NONE",
    location?: Ubication,
    imageUrl?: string,
    description?: string
  ) {
    super("", reference, name, challengeType, startDate, finishDate, imageUrl, description);
    this.location = location;
    this.pointsRange = pointsRange;
    this.penyes = penyes;
    this.reference = reference;
    this.winDirection = winDirection;
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

//#endregion

//#region 🧮 Implementaciones específicas de Challenge
export class EmptyProva extends Prova {
  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    console.log(penyesInfo,"EmptyProva no implementada");
    return [];
  }
}
export class ChallengeByParticipation extends Prova {
  resultados: { penyaId: string; participation: boolean }[] = [];

  constructor() {
    super("Participació", "Participació");
  }

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    return this.resultados.map((res, index) => {
      const penya = penyesInfo.find((p) => p.id === res.penyaId);
      const base = new PenyaProvaResultData(
        this.id,
        this.challengeType,
        res.penyaId,
        penya?.name || "Desconegut",
        res.participation ? 1 : 0
      );
      return new ChallengeResult(base, this.getPointsForPosition(index + 1));
    });
  }
}

export abstract class SortedChallenge extends Prova {
  abstract sortResults(
    a: { penyaId: string; value: number },
    b: { penyaId: string; value: number }
  ): number;

  computeResults(
    penyesInfo: PenyaInfo[],
    resultados: { penyaId: string; value: number }[]
  ): ChallengeResult[] {
    const sorted = [...resultados].sort((a, b) => this.sortResults(a, b));

    return sorted.map((res, index) => {
      const penya = penyesInfo.find((p) => p.id === res.penyaId);
      const base = new PenyaProvaResultData(
        this.id,
        this.challengeType,
        res.penyaId,
        penya?.name || "Desconegut",
        res.value
      );
      return new ChallengeResult(base, this.getPointsForPosition(index + 1));
    });
  }
}

export class ChallengeByTime extends SortedChallenge {
  resultados: { penyaId: string; tiempo: number }[] = [];

  constructor() {
    super("Temps", "Temps");
  }

  sortResults(a: any, b: any): number {
    return this.winDirection === "ASC"
      ? b.tiempo - a.tiempo
      : a.tiempo - b.tiempo;
  }

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const results = this.resultados.map((r) => ({
      penyaId: r.penyaId,
      value: r.tiempo,
    }));
    return this.computeResults(penyesInfo, results);
  }
}

export class ChallengeByPoints extends SortedChallenge {
  resultados: { penyaId: string; puntos: number }[] = [];

  constructor() {
    super("Punts", "Punts");
  }

  sortResults(a: any, b: any): number {
    return this.winDirection === "ASC"
      ? b.value - a.value
      : a.value - b.value;
  }

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    const results = this.resultados.map((r) => ({
      penyaId: r.penyaId,
      value: r.puntos,
    }));
    return this.computeResults(penyesInfo, results);
  }
}

export class ChallengeByDiscalification extends Prova {
  fases: {
    ronda: number;
    partidos: {
      penyaA: string;
      penyaB: string;
      ganador: string;
    }[];
  }[] = [];

  constructor() {
    super("Rondes", "Rondes");
  }

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    console.log(penyesInfo,"Fase eliminatòria no implementada");

    return [];
  }
}

export class MultiChallenge extends Prova {
  subproves: Prova[] = [];

  constructor() {
    super("MultiProva", "MultiProva");
  }

  getResults(penyesInfo: PenyaInfo[]): ChallengeResult[] {
    console.log(penyesInfo,"MultiProva no implementada");
    return [];
  }
}

//#endregion
