// Ejemplo en TypeScript (opción 1: ajustar tipos al modelo del paquete)
// Torneo single-elimination con 73 equipos para `react-tournament-bracket`.
// Instala:  npm i react-tournament-bracket

import React, { JSX } from "react";
import { Bracket } from "react-tournament-bracket";

// -------------------------------------------------
// Tipos locales que reflejan el modelo esperado
// (incluyen `sourcePool`, `displayName`, `rank` y `score|null`).
// -------------------------------------------------

interface LTeam {
  id: string;
  name: string;
}

interface LScore {
  score: number;
}

interface LGame { // juego local (estructura equivalente a la de la lib)
  id: string;
  name?: string;
  scheduled?: number; // unix timestamp requerido por la lib
  sides: {
    home: LSide;
    visitor: LSide;
  };
}

interface LSeed {
  displayName: string;          // requerido por la lib
  rank: number;                 // requerido por la lib
  sourceGame: LGame | null;     // referencia al partido previo
  sourcePool: object;           // requerido por la lib (usamos {})
}

interface LSide {
  team: LTeam | null;
  seed: LSeed;
  score: LScore | null;         // la lib usa Score | null
}

// Alias útil para equipos con seed obligatorio
type SeededTeam = LTeam & { seed: number };

// -------------------------------------------------
// Utilidades
// -------------------------------------------------
const nextPowerOfTwo = (n: number): number => {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

let GLOBAL_ID = 1;
const newId = (): string => `g-${GLOBAL_ID++}`;

const scheduledStamp = Date.now(); // unix ms

// Crea un partido "hoja" (ronda inicial) entre dos equipos (b puede ser null => BYE)
const createLeafMatch = (
  a: SeededTeam | null,
  b: SeededTeam | null,
  roundLabel: string
): LGame => ({
  id: newId(),
  name: roundLabel,
  scheduled: scheduledStamp,
  sides: {
    home: {
      team: a ? { id: a.id, name: a.name } : null,
      seed: {
        displayName: a ? String(a.seed) : "",
        rank: a ? a.seed : 0,
        sourceGame: null,
        sourcePool: {},
      },
      score: null,
    },
    visitor: {
      team: b ? { id: b.id, name: b.name } : null,
      seed: {
        displayName: b ? String(b.seed) : "",
        rank: b ? b.seed : 0,
        sourceGame: null,
        sourcePool: {},
      },
      score: null,
    },
  },
});

// Crea un partido que referencia dos partidos previos (ganadores se enfrentan)
const createParentMatch = (leftGame: LGame, rightGame: LGame, roundLabel: string): LGame => ({
  id: newId(),
  name: roundLabel,
  scheduled: scheduledStamp,
  sides: {
    home: {
      team: null,
      seed: {
        displayName: "Ganador",
        rank: 0,
        sourceGame: leftGame,
        sourcePool: {},
      },
      score: null,
    },
    visitor: {
      team: null,
      seed: {
        displayName: "Ganador",
        rank: 0,
        sourceGame: rightGame,
        sourcePool: {},
      },
      score: null,
    },
  },
});

// Genera el árbol a partir de N equipos. Si N no es potencia de 2, se rellenan BYEs hasta la siguiente potencia de 2.
function buildBracketFromTeams(teams: LTeam[]): LGame {
  const totalSlots = nextPowerOfTwo(teams.length); // p.ej. 128 para 73

  // 1) Equipos con seed obligatoria
  const seeded: SeededTeam[] = teams.map((t, i) => ({ ...t, seed: i + 1 }));

  // 2) BYEs (nulos) hasta completar la potencia de 2
  const byesCount = totalSlots - teams.length;
  const byes: null[] = Array.from({ length: byesCount }, () => null);

  // 3) Array de *unión* (SeededTeam | null), no unión de arrays
  const padded: Array<SeededTeam | null> = [...seeded, ...byes];

  // Ronda 1 (hojas)
  let current: LGame[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    const a = padded[i];
    const b = padded[i + 1] ?? null;
    current.push(createLeafMatch(a, b, `Ronda 1 (${totalSlots})`));
  }

  let round = 2;
  let size = totalSlots / 2;
  while (current.length > 1) {
    const next: LGame[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(createParentMatch(current[i], current[i + 1], `Ronda ${round} (${size})`));
    }
    current = next;
    round += 1;
    size = size / 2;
  }

  // `current[0]` es el partido final que referencia todo el árbol
  return current[0];
}

// -------------------------------------------------
// Componente de demo (73 equipos)
// -------------------------------------------------
export default function BracketTest(): JSX.Element {
  type LibGame = React.ComponentProps<typeof Bracket>["game"]; // tipo que espera la lib

  const equipos = React.useMemo<LTeam[]>(
    () => Array.from({ length: 73 }, (_, i) => ({ id: `t-${i + 1}`, name: `Equipo ${i + 1}` })),
    []
  );

  const finalGame = React.useMemo<LibGame>(
    () => buildBracketFromTeams(equipos) as unknown as LibGame,
    [equipos]
  );

  return (
    <div className="w-full h-screen p-4">
      <h1 className="text-2xl font-bold mb-3">Torneo de 73 equipos (Single Elimination, TS)</h1>
      <p className="opacity-70 mb-4">
        Como 73 no es potencia de 2, se rellenan huecos con BYEs hasta la siguiente potencia de 2. El componente
        <code> Bracket </code> recibe únicamente el partido final y cada lado referencia su partido previo mediante
        <code> seed.sourceGame </code>.
      </p>
      <div style={{ width: "100%", height: "calc(100% - 96px)", overflowX: "auto", overflowY: "auto" }}>
        <Bracket game={finalGame} />
      </div>
    </div>
  );
}
