import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { GlootMatchData } from "@/features/bracket/glootAdapter";

type SlotStatus = "under" | "ok" | "overflow";

interface BracketViewerProps {
  matches: GlootMatchData[];
  onScoreChange?: (internalId: string, scores: (number | null)[]) => void;
  readOnly?: boolean;
  matchSchedules?: Record<string, string>;
  onTimeChange?: (internalId: string, time: string) => void;
  slotStatuses?: Record<string, SlotStatus>;
}

const ROW_H = 30; // altura per fila d'equip dins una targeta
const SCHED_ROW_H = 22;
const CARD_GAP = 20; // separació vertical entre targetes de la ronda 1
const MW = 220;
const CG = 40;
const HDR = 28;

function getRoundLabel(m: GlootMatchData): string {
  const parts = m.name.split(" ");
  return parts.slice(0, -1).join(" ") || m.name;
}

/** Calcula, per a cada ronda i posició dins la ronda, la coordenada Y superior
 *  de la targeta. La ronda 1 es reparteix uniformement cada S; a partir d'aquí,
 *  cada partit se centra a la mitjana dels centres dels seus K fills. Evita
 *  fórmules tancades basades en K^ronda, que resulten fràgils de mantenir. */
function computeTops(roundsMatches: GlootMatchData[][], K: number, MH: number, S: number): number[][] {
  const tops: number[][] = [];
  if (roundsMatches.length === 0) return tops;

  tops[0] = roundsMatches[0].map((_, i) => HDR + i * S);

  for (let col = 1; col < roundsMatches.length; col += 1) {
    tops[col] = roundsMatches[col].map((_, i) => {
      let sum = 0;
      let count = 0;
      for (let s = 0; s < K; s += 1) {
        const childTop = tops[col - 1][i * K + s];
        if (childTop !== undefined) {
          sum += childTop + MH / 2;
          count += 1;
        }
      }
      return count > 0 ? sum / count - MH / 2 : HDR;
    });
  }

  return tops;
}

interface BracketMatchCardProps {
  match: GlootMatchData;
  top: number;
  readOnly?: boolean;
  onScoreChange?: (internalId: string, scores: (number | null)[]) => void;
  scheduledTime?: string;
  onTimeChange?: (internalId: string, time: string) => void;
  slotStatus?: SlotStatus;
  showTimeRow: boolean;
  matchHeight: number;
}

function BracketMatchCard({
  match,
  top,
  readOnly,
  onScoreChange,
  scheduledTime,
  onTimeChange,
  slotStatus,
  showTimeRow,
  matchHeight,
}: BracketMatchCardProps) {
  const [rawScores, setRawScores] = useState<string[]>(
    () => match.participants.map((p) => (p.score != null ? String(p.score) : "")),
  );
  const [localTime, setLocalTime] = useState(scheduledTime ?? "");

  useEffect(() => {
    setRawScores(match.participants.map((p) => (p.score != null ? String(p.score) : "")));
  }, [match.participants]);
  useEffect(() => { setLocalTime(scheduledTime ?? ""); }, [scheduledTime]);

  const parsedScores = rawScores.map((raw) => (raw === "" ? null : parseInt(raw, 10)));

  const tiedValueCounts = new Map<number, number>();
  parsedScores.forEach((v) => {
    if (v !== null) tiedValueCounts.set(v, (tiedValueCounts.get(v) ?? 0) + 1);
  });
  const isTiedValue = (v: number | null) => v !== null && (tiedValueCounts.get(v) ?? 0) > 1;

  const handleScoreInputChange = (idx: number, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setRawScores((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const isFinished = match.participants.some((p) => p.isWinner);

  // Border: slot status (admin) takes priority over finished state
  const borderClass = onTimeChange
    ? slotStatus === "overflow"
      ? "border-red-500"
      : slotStatus === "under"
      ? "border-blue-400"
      : slotStatus === "ok"
      ? "border-green-500"
      : !localTime
      ? "border-yellow-400"
      : "border-border"
    : isFinished
    ? "border-green-500/40"
    : "border-border";

  return (
    <div
      className={cn("absolute border rounded-md overflow-hidden bg-card shadow-sm", borderClass)}
      style={{ top, left: 0, width: MW, height: matchHeight }}
    >
      {showTimeRow && (
        <div
          className="flex items-center px-2 border-b bg-muted/30"
          style={{ height: SCHED_ROW_H }}
        >
          {onTimeChange ? (
            <input
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              onBlur={() => onTimeChange(match.internalId, localTime)}
              className="w-full text-[10px] font-mono bg-transparent border-0 focus:outline-none text-muted-foreground cursor-pointer"
              style={{ height: SCHED_ROW_H - 2 }}
            />
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">
              {localTime || ""}
            </span>
          )}
        </div>
      )}

      {match.participants.map((p, idx) => {
        const raw = rawScores[idx] ?? "";
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center px-2 text-xs border-b last:border-b-0 gap-1",
              p.isWinner ? "bg-primary/10 font-semibold text-primary" : "text-foreground/60",
            )}
            style={{ height: ROW_H }}
          >
            <span className="truncate flex-1">{p.name}</span>
            {p.editable && !readOnly && (
              <div className="w-8 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={raw}
                  placeholder="—"
                  onChange={(e) => handleScoreInputChange(idx, e.target.value)}
                  onBlur={() => onScoreChange?.(match.internalId, parsedScores)}
                  className={cn(
                    "w-full h-5 text-center text-xs rounded border bg-background px-0",
                    "focus:outline-none focus:ring-1 focus:ring-primary",
                    isTiedValue(parsedScores[idx]) && "border-destructive",
                  )}
                />
              </div>
            )}
            {readOnly && raw !== "" && (
              <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">{raw}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BracketViewer({
  matches,
  onScoreChange,
  readOnly,
  matchSchedules,
  onTimeChange,
  slotStatuses,
}: BracketViewerProps) {
  const showTimeRow =
    !!onTimeChange ||
    (!!matchSchedules && Object.values(matchSchedules).some((t) => !!t));

  const rounds = useMemo(() => {
    const map = new Map<number, GlootMatchData[]>();
    for (const m of matches) {
      const r = parseInt(m.tournamentRoundText, 10);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([roundNum, ms]) => ({
        roundNum,
        label: getRoundLabel(ms[0]),
        matches: [...ms].sort((a, b) => a.id - b.id),
      }));
  }, [matches]);

  if (rounds.length === 0) return null;

  // Cada match té sempre exactament K participants (per construcció del generador,
  // incloent-hi els slots BYE), així que K es pot deduir directament de les dades.
  const K = matches[0].participants.length || 2;
  const MH = K * ROW_H + (showTimeRow ? SCHED_ROW_H : 0);
  const S = MH + CARD_GAP;

  const roundsMatches = rounds.map((r) => r.matches);
  const tops = computeTops(roundsMatches, K, MH, S);

  const firstRoundCount = rounds[0].matches.length;
  const contentH = (firstRoundCount - 1) * S + MH;
  const totalW = rounds.length * (MW + CG) - CG;

  const connectorLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  rounds.forEach(({ matches: ms }, colIdx) => {
    if (colIdx === rounds.length - 1) return;
    const colX = colIdx * (MW + CG);
    const midX = colX + MW + CG / 2;
    const nextColX = (colIdx + 1) * (MW + CG);

    ms.forEach((match, i) => {
      const top = tops[colIdx][i];
      const cy = top + MH / 2;
      connectorLines.push({ key: `h-${match.id}`, x1: colX + MW, y1: cy, x2: midX, y2: cy });

      if (i % K === 0) {
        const siblingCys: number[] = [];
        for (let s = 0; s < K; s += 1) {
          const siblingTop = tops[colIdx][i + s];
          if (siblingTop !== undefined) siblingCys.push(siblingTop + MH / 2);
        }
        if (siblingCys.length > 0) {
          connectorLines.push({
            key: `v-${match.id}`,
            x1: midX,
            y1: siblingCys[0],
            x2: midX,
            y2: siblingCys[siblingCys.length - 1],
          });
          const nextTop = tops[colIdx + 1]?.[Math.floor(i / K)];
          if (nextTop !== undefined) {
            const nextCy = nextTop + MH / 2;
            connectorLines.push({ key: `hn-${match.id}`, x1: midX, y1: nextCy, x2: nextColX, y2: nextCy });
          }
        }
      }
    });
  });

  return (
    <div className="overflow-auto">
      <div className="relative" style={{ width: totalW, height: HDR + contentH }}>
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={totalW}
          height={HDR + contentH}
        >
          <g strokeWidth="1" stroke="currentColor" className="text-muted-foreground/40">
            {connectorLines.map(({ key, x1, y1, x2, y2 }) => (
              <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
        </svg>

        {rounds.map(({ roundNum, label, matches: ms }, colIdx) => {
          const colX = colIdx * (MW + CG);
          return (
            <div key={roundNum} className="absolute top-0" style={{ left: colX, width: MW }}>
              <div
                className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ height: HDR, lineHeight: `${HDR}px` }}
              >
                {label}
              </div>
              {ms.map((match, i) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  top={tops[colIdx][i]}
                  readOnly={readOnly}
                  onScoreChange={onScoreChange}
                  scheduledTime={matchSchedules?.[match.internalId]}
                  onTimeChange={onTimeChange}
                  slotStatus={slotStatuses?.[match.internalId]}
                  showTimeRow={showTimeRow}
                  matchHeight={MH}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
