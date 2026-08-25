/**
 * Single-Elimination Bracket Generator (TypeScript)
 * -------------------------------------------------
 * - Admite N equipos (no potencia de K) ⇒ pone BYEs para que los mejores seeds empiecen más tarde.
 * - Admite de 2 a 8 equipos por enfrentamiento (teamsPerMatch / K), fijo para todo el cuadro.
 * - Admite que avance más de 1 equipo por enfrentamiento (advancePerMatch / A), también fijo para
 *   todo el cuadro. A debe ser un divisor de K (A=1 ⇒ comportamiento clásico de 1 ganador).
 *   Con S = K/A, cada grupo de S partidos de una ronda alimenta los A mejores de cada uno
 *   (S·A = K) en un único partido de la ronda siguiente. El partido final no tiene advanceTo:
 *   una vez resuelto sin empates, sus K participantes quedan ordenados 1..K directamente.
 * - Genera rondas, posiciones, conexiones (advanceTo / comesFrom) y participantes por match.
 * - Pensado para persistir en Firestore con el modelo que comentamos.
 *
 * Uso básico:
 * const teams = [
 *   { teamId: 'pena-1', displayName: 'Peña 1', seed: 1, players: [...] },
 *   { teamId: 'pena-2', displayName: 'Peña 2', seed: 2 },
 *   ...
 * ];
 * const bracket = generateSingleElimBracket({
 *   tournamentId: 't-2025',
 *   bracketId: 'b-masculino-A',
 *   teams,
 *   bestOfSets: 3,
 *   teamsPerMatch: 4,
 *   advancePerMatch: 2,
 * });
 * // bracket.matches ⇒ array listo para guardar/renderizar
 */


// ---------------------- Tipos ----------------------


export type Slot = number; // 0..K-1


export type SourceType = 'seed' | 'match' | 'bye' | 'manual';


export interface Team {
  teamId: string;
  displayName: string;
  seed?: number; // si no se da, se asigna por orden
  players?: { id: string; name: string }[];
}


export interface SourceRef {
  type: SourceType;
  matchId?: string | null;
  take?: 'winner' | 'loser' | null;
  /** Cuando advancePerMatch > 1, qué puesto (0 = mejor) del partido origen alimenta este slot. */
  rank?: number | null;
}


export interface Participant {
  slot: Slot;
  teamId?: string;
  displayName?: string;
  seed?: number;
  players?: { id: string; name: string }[];
  source: SourceRef;
  score?: { sets?: number[]; tiebreaks?: (number | null)[]; gamesWon?: number };
  wo?: boolean;
}


export interface Match {
  id: string; // p. ej. M_R16_1, M_QF_2, etc.
  tournamentId: string;
  bracketId: string;
  roundNumber: number; // 1..R
  roundName: string; // "Octavos", "Cuartos", "Semifinal", "Final"...
  position: number; // 1..N dentro de la ronda
  status: 'scheduled' | 'in_progress' | 'finished' | 'bye' | 'walkover';
  scheduledAt?: number; // opcional
  court?: string; // opcional
  format?: { bestOfSets?: number; tiebreakAt6All?: boolean; finalSetTiebreak?: boolean };
  teams: Participant[]; // K slots (0..K-1)
  winnerSlot?: Slot | null; // alias de ranking[0] una vez resuelto
  winnerTeamId?: string | null; // alias de ranking[0] una vez resuelto
  /** Slots reales (0..K-1) ordenados de mejor a peor, una vez el partido está resuelto sin
   *  empates ambiguos. null/undefined mientras no está resuelto. */
  ranking?: Slot[] | null;
  /** Un elemento por puesto que avanza (0 = mejor .. A-1), null si ese partido es la final
   *  (no hay ronda siguiente) o mientras no se ha generado la ronda siguiente. */
  advanceTo?: ({ matchId: string; slot: Slot } | null)[] | null;
  comesFrom?: SourceRef[]; // paralelo a teams[], por índice de slot
  createdAt?: number;
  updatedAt?: number;
}


export interface GenerateOptions {
  tournamentId: string;
  bracketId: string;
  teams: Team[]; // longitud N, N puede no ser potencia de K
  bestOfSets?: number; // por defecto 3
  tiebreakAt6All?: boolean; // por defecto true
  finalSetTiebreak?: boolean; // por defecto true
  pairingMode?: 'balanced_seeded' | 'sequential';
  // Si prefieres orden de semillas custom, pásalo aquí (array de seeds en orden de colocación)
  customSeedOrder?: number[];
  teamsPerMatch?: number; // equipos por enfrentamiento, 2..8. Por defecto 2.
  advancePerMatch?: number; // equipos que avanzan por enfrentamiento. Debe dividir a teamsPerMatch. Por defecto 1.
}


export interface GeneratedBracket {
  matches: Match[];
  rounds: { roundNumber: number; roundName: string; matchCount: number }[];
  bracketSize: number; // tamaño de cuadro utilizado (K · S^(rondas-1))
  byes: number; // cuántos huecos quedaron como bye
  teamsPerMatch: number; // K resuelto para este cuadro
  advancePerMatch: number; // A resuelto para este cuadro
}


// ---------------------- Utilidades ----------------------


/** Divisores propios de K (excluyendo K), siempre incluye 1. Son los únicos valores válidos
 *  de advancePerMatch: garantizan S=K/A entero y por tanto que las byes solo hagan falta en
 *  la Ronda 1 (ver cabecera del archivo). */
export function validAdvanceOptions(K: number): number[] {
  const options: number[] = [];
  for (let a = 1; a < K; a += 1) {
    if (K % a === 0) options.push(a);
  }
  return options;
}


/** Menor tamaño de cuadro Q = K · S^(t-1) (t ≥ 1) que es ≥ n, junto con el número de rondas t. */
function computeBracketSize(n: number, K: number, S: number): { value: number; totalRounds: number } {
  let value = K;
  let totalRounds = 1;
  while (value < n) {
    value *= S;
    totalRounds += 1;
  }
  return { value, totalRounds };
}


/** Nombre de ronda a partir de la distancia a la final (0 = Final, 1 = Semifinal...),
 *  sin necesitar conocer totalRounds. Usado tanto por roundName() (etiquetas de
 *  partido del propio bracket) como por el badge de "última ronda jugada" de
 *  penyaProvaResult, que solo dispone de esa distancia (persistida per equip). */
export function distToFinalRoundName(distToFinal: number): string {
  if (distToFinal === 0) return 'Final';
  if (distToFinal === 1) return 'Semifinal';
  if (distToFinal === 2) return 'Quarts';
  if (distToFinal === 3) return 'Vuitens';
  if (distToFinal === 4) return 'Setzens';
  if (distToFinal === 5) return 'Ronda de 32';
  if (distToFinal === 6) return 'Ronda de 64';
  return `Ronda prèvia`;
}

function roundName(roundIndex: number, totalRounds: number): string {
  const distToFinal = totalRounds - roundIndex;
  if (distToFinal <= 6) return distToFinalRoundName(distToFinal);
  return `Ronda ${roundIndex}`; // genérico, mismo fallback de siempre para brackets enormes
}


/**
 * Genera el orden de colocación de seeds en un cuadro de tamaño P (potencia de 2)
 * usando el patrón clásico de "balanced/fixed seeding". Solo válido para K=2
 * (pairingMode 'balanced_seeded' no está generalizado a K>2, ver guarda en
 * generateSingleElimBracket).
 *
 * Ejemplo P=8 → [1,8,5,4,3,6,7,2]
 */
function generateSeedPositions(P: number): number[] {
  // Algoritmo recursivo clásico
  const place = (size: number, start: number, end: number, arr: number[]) => {
    if (size === 2) {
      arr.push(start, end);
      return;
    }
    const half = size / 2;
    place(half, start, end - half + 1, arr);
    place(half, start + half, end, arr);
  };
  const arr: number[] = [];
  place(P, 1, P, arr);
  return arr;
}


/**
 * A partir de P (potencia de 2), devuelve las parejas de posiciones que se enfrentan
 * en la primera ronda (roundNumber=1). Cada par es [posA, posB]. Solo K=2.
 */
function firstRoundPairs(P: number): [number, number][] {
  const pos = generateSeedPositions(P);
  const pairs: [number, number][] = [];
  for (let i = 0; i < pos.length; i += 2) {
    pairs.push([pos[i], pos[i + 1]]);
  }
  return pairs;
}


/**
 * A partir de P (potencia de K), devuelve los grupos de K posiciones que se
 * enfrentan en la primera ronda (roundNumber=1), en orden secuencial de entrada.
 */
function sequentialGroups(P: number, K: number): number[][] {
  const groups: number[][] = [];
  for (let i = 1; i <= P; i += K) {
    const group: number[] = [];
    for (let j = 0; j < K; j += 1) group.push(i + j);
    groups.push(group);
  }
  return groups;
}


/**
 * Construye un tablero secuencial de tamaño P repartiendo los N equipos reales
 * lo más uniformemente posible entre P/K grupos de K posiciones (evitando BYE vs
 * BYE en ronda 1): cada grupo recibe floor(N/totalGroups) o floor(N/totalGroups)+1
 * equipos reales, rellenando el resto del grupo con BYE. Como P es el menor
 * tamaño de cuadro ≥ N, totalGroups siempre es ≤ N, así que ningún grupo queda
 * completamente vacío.
 */
function buildSequentialByeSafeBoard(sortedTeams: Team[], P: number, K: number): (Team | 'BYE')[] {
  const N = sortedTeams.length;
  const totalGroups = P / K;
  const baseline = Math.floor(N / totalGroups);
  const extra = N % totalGroups;

  const board: (Team | 'BYE')[] = [];
  let cursor = 0;

  for (let g = 0; g < totalGroups; g += 1) {
    const realCount = g < extra ? baseline + 1 : baseline;
    const byeCount = K - realCount;
    const reals = sortedTeams.slice(cursor, cursor + realCount);
    cursor += realCount;
    const byes: 'BYE'[] = new Array(byeCount).fill('BYE');
    // Alterna si los BYE van al principio o al final del grupo (puramente cosmético).
    const byesFirst = byeCount > 0 && g % 2 === 1;
    board.push(...(byesFirst ? [...byes, ...reals] : [...reals, ...byes]));
  }

  // Fallback defensivo por si se dan inputs fuera de contrato.
  while (board.length < P) {
    board.push('BYE');
  }

  return board.slice(0, P);
}


/** Ordena equipos por seed ascendente (1 es mejor). Si faltan seeds, asigna por orden. */
function normalizeAndSortTeams(teams: Team[]): Team[] {
  const withSeed = teams.map((t, i) => ({ ...t, seed: t.seed ?? i + 1 }));
  return withSeed.sort((a, b) => (a.seed! - b.seed!));
}


function idFor(roundNumber: number, position: number, totalRounds: number): string {
  const name = roundName(roundNumber, totalRounds);
  const short = name === 'Final' ? 'F' :
                name === 'Semifinal' ? 'SF' :
                name === 'Cuartos' ? 'QF' :
                name === 'Octavos' ? 'R16' :
                name === 'Dieciseisavos' ? 'R32' : `R${roundNumber}`;
  return `M_${short}_${position}`;
}


// ---------------------- Generador principal ----------------------


export function generateSingleElimBracket(opts: GenerateOptions): GeneratedBracket {
  const {
    tournamentId,
    bracketId,
    teams,
    bestOfSets = 3,
    tiebreakAt6All = true,
    finalSetTiebreak = true,
    pairingMode = 'balanced_seeded',
    customSeedOrder,
    teamsPerMatch = 2,
    advancePerMatch = 1,
  } = opts;


  if (!teams || teams.length < 2) {
    throw new Error('Se requieren al menos 2 parejas.');
  }


  const K = Math.round(teamsPerMatch);
  if (!Number.isFinite(K) || K < 2 || K > 8) {
    throw new Error('teamsPerMatch debe ser un número entero entre 2 y 8.');
  }
  if (pairingMode === 'balanced_seeded' && K !== 2) {
    throw new Error('El modo de emparejamiento "balanced_seeded" solo admite 2 equipos por enfrentamiento.');
  }

  const A = Math.round(advancePerMatch);
  if (!Number.isFinite(A) || A < 1 || A >= K || K % A !== 0) {
    throw new Error('advancePerMatch debe ser un divisor de teamsPerMatch, entre 1 y teamsPerMatch-1.');
  }
  const S = K / A; // ritmo de reducción de una ronda a la siguiente


  // 1) Normalizamos segun modo de emparejamiento
  const sorted = pairingMode === 'sequential'
    ? teams.map((team, index) => ({ ...team, seed: team.seed ?? index + 1 }))
    : normalizeAndSortTeams(teams);
  const N = sorted.length;


  // 2) Tamaño de cuadro y BYEs (solo hacen falta en Ronda 1, ver cabecera del archivo)
  const { value: P, totalRounds } = computeBracketSize(N, K, S);
  const byes = P - N;


  // 3) Tablero: posiciones 1..P con teams o BYE
  let board: (Team | 'BYE')[] = new Array(P).fill('BYE');

  if (pairingMode === 'sequential') {
    board = buildSequentialByeSafeBoard(sorted, P, K);
  } else {
    const basePositions = customSeedOrder && customSeedOrder.length === P
      ? customSeedOrder.slice()
      : generateSeedPositions(P);

    for (let i = 0; i < N; i++) {
      const team = sorted[i]; // seed i+1 en orden
      const seedPos = basePositions.indexOf(team.seed ?? (i + 1));
      const placeIdx = seedPos >= 0 ? seedPos : board.findIndex(x => x === 'BYE');
      board[placeIdx] = team;
    }
  }


  // 4) Construimos rondas
  // Matriz con los IDs de match por ronda/posición para enlazar advanceTo fácilmente
  const matchIdGrid: string[][] = [];
  const matches: Match[] = [];

  /** Nº de partidos en la ronda r (1-indexada). r=1 ⇒ P/K; cada ronda siguiente reduce por S. */
  const matchCountForRound = (r: number): number => P / (K * Math.pow(S, r - 1));


  // Round 1: modo clásico por seeds (K=2) o secuencial por orden de entrada (grupos de K)
  const r1Groups: number[][] = pairingMode === 'sequential'
    ? sequentialGroups(P, K)
    : firstRoundPairs(P); // firstRoundPairs solo se alcanza con K=2, ver guarda arriba


  // Crea todos los matches vacíos por cada ronda y posición (IDs primero)
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = matchCountForRound(r);
    matchIdGrid[r - 1] = [];
    for (let pos = 1; pos <= matchCount; pos++) {
      const id = idFor(r, pos, totalRounds);
      matchIdGrid[r - 1][pos - 1] = id;
    }
  }


  // Construye Round 1 con participantes y BYEs
  r1Groups.forEach((positions, i) => {
    const matchId = matchIdGrid[0][i];

    const participants: Participant[] = positions.map((pos, slot) => {
      const team = board[pos - 1];
      return team === 'BYE'
        ? { slot, source: { type: 'bye' as SourceType, matchId: null, take: null } }
        : {
            slot,
            teamId: team.teamId,
            displayName: team.displayName,
            seed: team.seed,
            players: team.players,
            source: { type: 'seed' as SourceType, matchId: null, take: null },
          };
    });

    const comesFrom: SourceRef[] = participants.map((p) => ({ ...p.source }));

    const m: Match = {
      id: matchId,
      tournamentId,
      bracketId,
      roundNumber: 1,
      roundName: roundName(1, totalRounds),
      position: i + 1,
      status: 'scheduled',
      format: { bestOfSets, tiebreakAt6All, finalSetTiebreak },
      teams: participants,
      winnerSlot: null,
      winnerTeamId: null,
      ranking: null,
      advanceTo: null, // se rellenará tras crear la ronda siguiente
      comesFrom,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };


    matches.push(m);
  });


  // Crea rondas 2..R con placeholders que se alimentan de los A mejores de cada uno de los
  // S partidos previos que le corresponden (S·A = K).
  for (let r = 2; r <= totalRounds; r++) {
    const currCount = matchCountForRound(r);

    for (let pos = 1; pos <= currCount; pos++) {
      const id = matchIdGrid[r - 1][pos - 1];

      const participants: Participant[] = [];
      const comesFrom: SourceRef[] = [];
      for (let g = 0; g < S; g += 1) {
        const prevIndex = (pos - 1) * S + g; // 0-based en la ronda anterior
        const prevMatchId = matchIdGrid[r - 2][prevIndex];
        for (let rank = 0; rank < A; rank += 1) {
          const slot = g * A + rank;
          const ref: SourceRef = { type: 'match', matchId: prevMatchId, take: 'winner', rank };
          participants.push({ slot, source: ref });
          comesFrom.push({ ...ref });
        }
      }


      const m: Match = {
        id,
        tournamentId,
        bracketId,
        roundNumber: r,
        roundName: roundName(r, totalRounds),
        position: pos,
        status: 'scheduled',
        format: { bestOfSets, tiebreakAt6All, finalSetTiebreak },
        teams: participants,
        winnerSlot: null,
        winnerTeamId: null,
        ranking: null,
        advanceTo: null, // se rellena salvo que sea la final
        comesFrom,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };


      matches.push(m);
    }
  }


  // Rellenar advanceTo en todas las rondas excepto la final
  for (let r = 1; r < totalRounds; r++) {
    const currCount = matchCountForRound(r);
    for (let pos = 1; pos <= currCount; pos++) {
      const pos0 = pos - 1; // 0-based
      const thisId = matchIdGrid[r - 1][pos0];
      const nextIndex = Math.floor(pos0 / S);
      const nextId = matchIdGrid[r][nextIndex];
      const base = (pos0 % S) * A;
      const m = matches.find(mm => mm.id === thisId)!;
      m.advanceTo = Array.from({ length: A }, (_, rank) => ({ matchId: nextId, slot: base + rank }));
    }
  }


  // Auto-resolución de BYEs en ronda 1: si el nº de participantes reales cabe entero
  // dentro de los que avanzan (≤ A), todos avanzan automáticamente sin necesidad de jugar.
  matches.forEach(m => {
    if (m.roundNumber === 1) {
      const realSlots = m.teams
        .map((t, idx) => (t.source.type !== 'bye' ? idx : -1))
        .filter((idx) => idx !== -1);
      if (realSlots.length > 0 && realSlots.length <= A) {
        m.status = 'bye';
        m.ranking = realSlots;
        m.winnerSlot = realSlots[0];
        m.winnerTeamId = m.teams[realSlots[0]].teamId ?? null;
      }
    }
  });


  // Rondas resumen
  const rounds = Array.from({ length: totalRounds }, (_, i) => ({
    roundNumber: i + 1,
    roundName: roundName(i + 1, totalRounds),
    matchCount: matchCountForRound(i + 1),
  }));


  return { matches, rounds, bracketSize: P, byes, teamsPerMatch: K, advancePerMatch: A };
}
