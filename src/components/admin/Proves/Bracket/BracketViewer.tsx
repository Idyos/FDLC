import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { GlootMatchData } from "@/features/bracket/glootAdapter";

type SlotStatus = "under" | "ok" | "overflow";

interface BracketViewerProps {
  matches: GlootMatchData[];
  onScoreChange?: (internalId: string, scoreA: number | null, scoreB: number | null) => void;
  readOnly?: boolean;
  matchSchedules?: Record<string, string>;
  onTimeChange?: (internalId: string, time: string) => void;
  slotStatuses?: Record<string, SlotStatus>;
}

const BASE_MH = 60;
const SCHED_ROW_H = 22;
const BASE_S = 80;
const MW = 220;
const CG = 40;
const HDR = 28;

function getRoundLabel(m: GlootMatchData): string {
  const parts = m.name.split(" ");
  return parts.slice(0, -1).join(" ") || m.name;
}

function matchTop(roundNum: number, matchIndex: number, S: number): number {
  const step = Math.pow(2, roundNum - 1);
  return HDR + ((matchIndex * 2 * step + step - 1) * S) / 2;
}

interface BracketMatchCardProps {
  match: GlootMatchData;
  top: number;
  readOnly?: boolean;
  onScoreChange?: (internalId: string, scoreA: number | null, scoreB: number | null) => void;
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
  const p0 = match.participants[0];
  const p1 = match.participants[1];

  const [rawA, setRawA] = useState(p0.score != null ? String(p0.score) : "");
  const [rawB, setRawB] = useState(p1.score != null ? String(p1.score) : "");
  const [localTime, setLocalTime] = useState(scheduledTime ?? "");

  useEffect(() => { setRawA(p0.score != null ? String(p0.score) : ""); }, [p0.score]);
  useEffect(() => { setRawB(p1.score != null ? String(p1.score) : ""); }, [p1.score]);
  useEffect(() => { setLocalTime(scheduledTime ?? ""); }, [scheduledTime]);

  const parsedA = rawA === "" ? null : parseInt(rawA, 10);
  const parsedB = rawB === "" ? null : parseInt(rawB, 10);
  const isDraw = parsedA !== null && parsedB !== null && parsedA === parsedB;

  const handleChange = (slot: "A" | "B", value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    if (slot === "A") setRawA(value);
    else setRawB(value);
  };

  const isFinished = p0.isWinner || p1.isWinner;
  const teamRowH = BASE_MH / 2;

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

      {([p0, p1] as const).map((p, idx) => {
        const raw = idx === 0 ? rawA : rawB;
        const slot = idx === 0 ? "A" : "B";
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center px-2 text-xs border-b last:border-b-0 gap-1",
              p.isWinner ? "bg-primary/10 font-semibold text-primary" : "text-foreground/60",
            )}
            style={{ height: teamRowH }}
          >
            <span className="truncate flex-1">{p.name}</span>
            {p.editable && !readOnly && (
              <div className="w-8 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={raw}
                  placeholder="—"
                  onChange={(e) => handleChange(slot, e.target.value)}
                  onBlur={() => onScoreChange?.(match.internalId, parsedA, parsedB)}
                  className={cn(
                    "w-full h-5 text-center text-xs rounded border bg-background px-0",
                    "focus:outline-none focus:ring-1 focus:ring-primary",
                    isDraw && "border-destructive",
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

  const MH = showTimeRow ? BASE_MH + SCHED_ROW_H : BASE_MH;
  const S = showTimeRow ? BASE_S + SCHED_ROW_H : BASE_S;

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

  const firstRoundCount = rounds[0].matches.length;
  const contentH = (firstRoundCount - 1) * S + MH;
  const totalW = rounds.length * (MW + CG) - CG;

  const connectorLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  rounds.forEach(({ roundNum, matches: ms }, colIdx) => {
    if (colIdx === rounds.length - 1) return;
    const colX = colIdx * (MW + CG);
    const midX = colX + MW + CG / 2;
    const nextColX = (colIdx + 1) * (MW + CG);

    ms.forEach((match, i) => {
      const top = matchTop(roundNum, i, S);
      const cy = top + MH / 2;
      connectorLines.push({ key: `h-${match.id}`, x1: colX + MW, y1: cy, x2: midX, y2: cy });
      if (i % 2 === 0) {
        const pairPartner = ms[i + 1];
        if (pairPartner) {
          const partnerCy = matchTop(roundNum, i + 1, S) + MH / 2;
          connectorLines.push({ key: `v-${match.id}`, x1: midX, y1: cy, x2: midX, y2: partnerCy });
          const nextCy = matchTop(roundNum + 1, Math.floor(i / 2), S) + MH / 2;
          connectorLines.push({ key: `hn-${match.id}`, x1: midX, y1: nextCy, x2: nextColX, y2: nextCy });
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
                  top={matchTop(roundNum, i, S)}
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
