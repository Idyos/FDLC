/**
 * Single-Elimination Bracket Generator (TypeScript)
 * -------------------------------------------------
 * - Admite N equipos (no potencia de K) ⇒ pone BYEs para que los mejores seeds empiecen más tarde.
 * - Admite de 2 a 8 equipos por enfrentamiento (teamsPerMatch / K), fijo para todo el cuadro.
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
  winnerSlot?: Slot | null;
  winnerTeamId?: string | null;
  advanceTo?: { matchId: string; slot: Slot } | null;
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
}


export interface GeneratedBracket {
  matches: Match[];
  rounds: { roundNumber: number; roundName: string; matchCount: number }[];
  bracketSize: number; // potencia de K utilizada
  byes: number; // cuántos huecos quedaron como bye
  teamsPerMatch: number; // K resuelto para este cuadro
}


// ---------------------- Utilidades ----------------------


/** Menor potencia de K que es ≥ n, junto con el exponente (número de rondas). */
function nextPowerOfK(n: number, k: number): { value: number; exponent: number } {
  if (n < 1) return { value: 1, exponent: 0 };
  let p = 1;
  let exponent = 0;
  while (p < n) {
    p *= k;
    exponent += 1;
  }
  return { value: p, exponent };
}


function roundName(roundIndex: number, totalRounds: number): string {
  const distToFinal = totalRounds - roundIndex;
  if (distToFinal === 0) return 'Final';
  if (distToFinal === 1) return 'Semifinal';
  if (distToFinal === 2) return 'Cuartos';
  if (distToFinal === 3) return 'Octavos';
  if (distToFinal === 4) return 'Dieciseisavos';
  return `Ronda ${roundIndex}`; // genérico
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
 * equipos reales, rellenando el resto del grupo con BYE. Como P es la menor
 * potencia de K ≥ N, totalGroups siempre es ≤ N, así que ningún grupo queda
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


/** Mapea posición 1..P → team o BYE según N */
// function assignTeamsToPositions(sortedTeams: Team[], P: number): (Team | 'BYE')[] {
//   const N = sortedTeams.length;
//   const seedPositions = generateSeedPositions(P); // orden donde van 1..P
//   const board: (Team | 'BYE')[] = new Array(P).fill('BYE');
//   for (let i = 0; i < N; i++) {
//     const seed = sortedTeams[i].seed!; // 1..N (asumimos seed compacto)
//     // Coloca seed en la posición correspondiente. Si seed>N pero P más grande, seguimos igual.
//     const idx = seedPositions.indexOf(seed);
//     if (idx >= 0) {
//       board[idx] = sortedTeams[i];
//     } else {
//       // Si por cualquier razón el seed no está en seedPositions (p.ej. seeds no consecutivos),
//       // rellena en el primer hueco BYE disponible en orden lógico.
//       const free = board.findIndex(x => x === 'BYE');
//       board[free] = sortedTeams[i];
//     }
//   }
//   return board;
// }


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


  // 1) Normalizamos segun modo de emparejamiento
  const sorted = pairingMode === 'sequential'
    ? teams.map((team, index) => ({ ...team, seed: team.seed ?? index + 1 }))
    : normalizeAndSortTeams(teams);
  const N = sorted.length;


  // 2) Tamaño de cuadro y BYEs
  const { value: P, exponent: totalRounds } = nextPowerOfK(N, K); // bracketSize
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


  // Round 1: modo clásico por seeds (K=2) o secuencial por orden de entrada (grupos de K)
  const r1Groups: number[][] = pairingMode === 'sequential'
    ? sequentialGroups(P, K)
    : firstRoundPairs(P); // firstRoundPairs solo se alcanza con K=2, ver guarda arriba


  // Crea todos los matches vacíos por cada ronda y posición (IDs primero)
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = P / Math.pow(K, r);
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
      advanceTo: null, // se rellenará tras crear la ronda siguiente
      comesFrom,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };


    matches.push(m);
  });


  // Crea rondas 2..R con placeholders que se alimentan de ganadores anteriores
  for (let r = 2; r <= totalRounds; r++) {
    const currCount = P / Math.pow(K, r);

    for (let pos = 1; pos <= currCount; pos++) {
      const id = matchIdGrid[r - 1][pos - 1];

      // Los K partidos previos que alimentan este match
      const participants: Participant[] = [];
      const comesFrom: SourceRef[] = [];
      for (let slot = 0; slot < K; slot += 1) {
        const prevIndex = (pos - 1) * K + slot; // 0-based en la ronda anterior
        const prevMatchId = matchIdGrid[r - 2][prevIndex];
        const ref: SourceRef = { type: 'match', matchId: prevMatchId, take: 'winner' };
        participants.push({ slot, source: ref });
        comesFrom.push({ ...ref });
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
    const currCount = P / Math.pow(K, r);
    for (let pos = 1; pos <= currCount; pos++) {
      const pos0 = pos - 1; // 0-based
      const thisId = matchIdGrid[r - 1][pos0];
      const nextId = matchIdGrid[r][Math.floor(pos0 / K)];
      const slot: Slot = pos0 % K;
      const m = matches.find(mm => mm.id === thisId)!;
      m.advanceTo = { matchId: nextId, slot };
    }
  }


  // Auto-resolución de BYEs en ronda 1: si en un match solo queda 1 participante
  // real (el resto son BYE), ese participante gana automáticamente.
  matches.forEach(m => {
    if (m.roundNumber === 1) {
      const realSlots = m.teams
        .map((t, idx) => (t.source.type !== 'bye' ? idx : -1))
        .filter((idx) => idx !== -1);
      if (realSlots.length === 1) {
        const winnerSlot = realSlots[0];
        m.status = 'bye';
        m.winnerSlot = winnerSlot;
        m.winnerTeamId = m.teams[winnerSlot].teamId ?? null;
      }
    }
  });


  // Rondas resumen
  const rounds = Array.from({ length: totalRounds }, (_, i) => ({
    roundNumber: i + 1,
    roundName: roundName(i + 1, totalRounds),
    matchCount: P / Math.pow(K, i + 1),
  }));


  return { matches, rounds, bracketSize: P, byes, teamsPerMatch: K };
}


// ---------------------- Ejemplo rápido ----------------------


function tryCreateMatch(){
const sampleTeams: Team[] = Array.from({ length: 73 }, (_, i) => ({
    teamId: `pena-${i + 1}`,
    displayName: `Peña ${i + 1}`,
    seed: i + 1,
  }));


  const res = generateSingleElimBracket({
    tournamentId: 't-2025',
    bracketId: 'b-masculino-A',
    teams: sampleTeams,
    bestOfSets: 3,
  });


  console.log(res);


  console.log({ rounds: res.rounds, bracketSize: res.bracketSize, byes: res.byes });
  console.log(res.matches
    .sort((a, b) => a.roundNumber - b.roundNumber || a.position - b.position)
    .map(m => ({ id: m.id, round: m.roundName, pos: m.position, advanceTo: m.advanceTo }))
  );


  return res;
}


export default tryCreateMatch;
