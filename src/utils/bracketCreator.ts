/**
 * Sing/**
 * Single-Elimination Bracket Generator (TypeScript)
 * -------------------------------------------------
 * - Admite N parejas (no potencia de 2) ⇒ pone BYEs para que los mejores seeds empiecen más tarde.
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
 * });
 * // bracket.matches ⇒ array listo para guardar/renderizar
 */


// ---------------------- Tipos ----------------------


export type Slot = 'A' | 'B';


export type SourceType = 'seed' | 'match' | 'bye' | 'manual';


export interface Team {
  teamId: string;
  displayName: string;
  seed?: number; // si no se da, se asigna por orden
  players?: { id: string; name: string }[];
}


export interface Participant {
  slot: Slot;
  teamId?: string;
  displayName?: string;
  seed?: number;
  players?: { id: string; name: string }[];
  source: {
    type: SourceType;
    matchId?: string | null;
    take?: 'winner' | 'loser' | null;
  };
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
  teams: Participant[]; // dos slots A/B
  winnerSlot?: Slot | null;
  winnerTeamId?: string | null;
  advanceTo?: { matchId: string; slot: Slot } | null;
  comesFrom?: Record<Slot, { type: SourceType; matchId?: string | null; take?: 'winner' | 'loser' | null } | undefined>;
  createdAt?: number;
  updatedAt?: number;
}


export interface GenerateOptions {
  tournamentId: string;
  bracketId: string;
  teams: Team[]; // longitud N, N puede no ser potencia de 2
  bestOfSets?: number; // por defecto 3
  tiebreakAt6All?: boolean; // por defecto true
  finalSetTiebreak?: boolean; // por defecto true
  // Si prefieres orden de semillas custom, pásalo aquí (array de seeds en orden de colocación)
  customSeedOrder?: number[];
}


export interface GeneratedBracket {
  matches: Match[];
  rounds: { roundNumber: number; roundName: string; matchCount: number }[];
  bracketSize: number; // potencia de 2 utilizada
  byes: number; // cuántos huecos quedaron como bye
}


// ---------------------- Utilidades ----------------------


function nextPowerOfTwo(n: number): number {
  if (n < 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
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
 * usando el patrón clásico de "balanced/fixed seeding".
 * Devuelve un array de posiciones 1..P donde va cada seed.
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
 * en la primera ronda (roundNumber=1). Cada par es [posA, posB].
 */
function firstRoundPairs(P: number): [number, number][] {
  const pos = generateSeedPositions(P);
  const pairs: [number, number][] = [];
  for (let i = 0; i < pos.length; i += 2) {
    pairs.push([pos[i], pos[i + 1]]);
  }
  return pairs;
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
    customSeedOrder,
  } = opts;


  if (!teams || teams.length < 2) {
    throw new Error('Se requieren al menos 2 parejas.');
  }


  // 1) Normalizamos seeds y ordenamos (1 mejor)
  const sorted = normalizeAndSortTeams(teams);
  const N = sorted.length;


  // 2) Tamaño de cuadro y BYEs
  const P = nextPowerOfTwo(N); // bracketSize
  const byes = P - N;


  // 3) Posiciones de seedado (si el usuario da orden custom, lo respetamos)
  const basePositions = customSeedOrder && customSeedOrder.length === P
    ? customSeedOrder.slice()
    : generateSeedPositions(P);


  // 4) Tablero: posiciones 1..P con teams o BYE
  //    Si hay customSeedOrder, colocamos por ese orden; si no, por seeds naturales 1..N
  const board: (Team | 'BYE')[] = new Array(P).fill('BYE');
  for (let i = 0; i < N; i++) {
    const team = sorted[i]; // seed i+1 en orden
    const seedPos = basePositions.indexOf(team.seed ?? (i + 1));
    const placeIdx = seedPos >= 0 ? seedPos : board.findIndex(x => x === 'BYE');
    board[placeIdx] = team;
  }


  // 5) Construimos rondas
  const totalRounds = Math.log2(P);


  // Matriz con los IDs de match por ronda/posición para enlazar advanceTo fácilmente
  const matchIdGrid: string[][] = [];
  const matches: Match[] = [];


  // Round 1 empareja según firstRoundPairs(P), que ya respeta seedado clásico
  const r1Pairs = firstRoundPairs(P); // pares de posiciones (índices 1..P)


  // Crea todos los matches vacíos por cada ronda y posición (IDs primero)
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = P / Math.pow(2, r);
    matchIdGrid[r - 1] = [];
    for (let pos = 1; pos <= matchCount; pos++) {
      const id = idFor(r, pos, totalRounds);
      matchIdGrid[r - 1][pos - 1] = id;
    }
  }


  // Construye Round 1 con participantes y BYEs
  r1Pairs.forEach(([posA, posB], i) => {
    const teamA = board[posA - 1];
    const teamB = board[posB - 1];


    const matchId = matchIdGrid[0][i];


    const participants: Participant[] = [
      teamA === 'BYE'
        ? { slot: 'A', source: { type: 'bye', matchId: null, take: null } }
        : {
            slot: 'A',
            teamId: teamA.teamId,
            displayName: teamA.displayName,
            seed: teamA.seed,
            players: teamA.players,
            source: { type: 'seed', matchId: null, take: null },
          },
      teamB === 'BYE'
        ? { slot: 'B', source: { type: 'bye', matchId: null, take: null } }
        : {
            slot: 'B',
            teamId: teamB.teamId,
            displayName: teamB.displayName,
            seed: teamB.seed,
            players: teamB.players,
            source: { type: 'seed', matchId: null, take: null },
          },
    ];


    const m: Match = {
      id: matchId,
      tournamentId,
      bracketId,
      roundNumber: 1,
      roundName: roundName(1, totalRounds),
      position: i + 1,
      status: participants.some(p => p.source.type === 'bye') && participants.every(p => p.source.type !== 'seed')
        ? 'bye'
        : 'scheduled',
      format: { bestOfSets, tiebreakAt6All, finalSetTiebreak },
      teams: participants,
      winnerSlot: null,
      winnerTeamId: null,
      advanceTo: null, // se rellenará tras crear la ronda 2
      comesFrom: {
        A: participants[0].source.type === 'seed' ? { type: 'seed', matchId: null, take: null } : { type: 'bye', matchId: null, take: null },
        B: participants[1].source.type === 'seed' ? { type: 'seed', matchId: null, take: null } : { type: 'bye', matchId: null, take: null },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };


    matches.push(m);
  });


  // Crea rondas 2..R con placeholders que se alimentan de ganadores anteriores
  for (let r = 2; r <= totalRounds; r++) {
    // const prevCount = P / Math.pow(2, r - 1);
    const currCount = P / Math.pow(2, r);


    for (let pos = 1; pos <= currCount; pos++) {
      const id = matchIdGrid[r - 1][pos - 1];
      // Los dos partidos previos que alimentan este match
      const prevAIndex = (pos - 1) * 2; // 0-based
      const prevBIndex = prevAIndex + 1;
      const prevMatchA = matchIdGrid[r - 2][prevAIndex];
      const prevMatchB = matchIdGrid[r - 2][prevBIndex];


      const participants: Participant[] = [
        {
          slot: 'A',
          source: { type: 'match', matchId: prevMatchA, take: 'winner' },
        },
        {
          slot: 'B',
          source: { type: 'match', matchId: prevMatchB, take: 'winner' },
        },
      ];


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
        comesFrom: {
          A: { type: 'match', matchId: prevMatchA, take: 'winner' },
          B: { type: 'match', matchId: prevMatchB, take: 'winner' },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };


      matches.push(m);
    }
  }


  // Rellenar advanceTo en todas las rondas excepto la final
  for (let r = 1; r < totalRounds; r++) {
    const currCount = P / Math.pow(2, r);
    for (let pos = 1; pos <= currCount; pos++) {
      const thisId = matchIdGrid[r - 1][pos - 1];
      const nextId = matchIdGrid[r][Math.ceil(pos / 2) - 1];
      // El ganador ocupa A si pos impar, B si pos par
      const slot: Slot = (pos % 2 === 1) ? 'A' : 'B';
      const m = matches.find(mm => mm.id === thisId)!;
      m.advanceTo = { matchId: nextId, slot };
    }
  }


  // Auto-resolución de BYEs en ronda 1 (opcional):
  // si un match tiene un BYE real (uno de los slots BYE y el otro seed), puedes marcar ganadorSlot automáticamente.
  matches.forEach(m => {
    if (m.roundNumber === 1) {
      const aBye = m.teams[0].source.type === 'bye';
      const bBye = m.teams[1].source.type === 'bye';
      if (aBye !== bBye) {
        // ganador es el que NO es bye
        const winnerSlot: Slot = aBye ? 'B' : 'A';
        m.status = 'bye';
        m.winnerSlot = winnerSlot;
        m.winnerTeamId = m.teams[winnerSlot === 'A' ? 0 : 1].teamId ?? null;
      }
    }
  });


  // Rondas resumen
  const rounds = Array.from({ length: totalRounds }, (_, i) => ({
    roundNumber: i + 1,
    roundName: roundName(i + 1, totalRounds),
    matchCount: P / Math.pow(2, i + 1),
  }));


  return { matches, rounds, bracketSize: P, byes };
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