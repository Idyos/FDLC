import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { GlootMatchData } from "@/features/bracket/glootAdapter";

interface BracketViewerProps {
  matches: GlootMatchData[];
}

const S = 80;    // slot spacing (px): distance between adjacent first-round match tops
const MH = 60;   // match card height (px)
const MW = 180;  // match card width (px)
const CG = 40;   // column gap (px)
const HDR = 28;  // column header height (px)

function getRoundLabel(m: GlootMatchData): string {
  const parts = m.name.split(" ");
  return parts.slice(0, -1).join(" ") || m.name;
}

function matchTop(roundNum: number, matchIndex: number): number {
  const step = Math.pow(2, roundNum - 1);
  return HDR + ((matchIndex * 2 * step + step - 1) * S) / 2;
}

export function BracketViewer({ matches }: BracketViewerProps) {
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

  // Build SVG connector lines
  const connectorLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  rounds.forEach(({ roundNum, matches: ms }, colIdx) => {
    if (colIdx === rounds.length - 1) return;
    const colX = colIdx * (MW + CG);
    const midX = colX + MW + CG / 2;
    const nextColX = (colIdx + 1) * (MW + CG);

    ms.forEach((match, i) => {
      const top = matchTop(roundNum, i);
      const cy = top + MH / 2;

      connectorLines.push({ key: `h-${match.id}`, x1: colX + MW, y1: cy, x2: midX, y2: cy });

      if (i % 2 === 0) {
        const pairPartner = ms[i + 1];
        if (pairPartner) {
          const partnerCy = matchTop(roundNum, i + 1) + MH / 2;
          connectorLines.push({ key: `v-${match.id}`, x1: midX, y1: cy, x2: midX, y2: partnerCy });
          const nextCy = matchTop(roundNum + 1, Math.floor(i / 2)) + MH / 2;
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
              {ms.map((match, i) => {
                const top = matchTop(roundNum, i);
                return (
                  <div
                    key={match.id}
                    className="absolute border rounded-md overflow-hidden bg-card shadow-sm"
                    style={{ top, left: 0, width: MW, height: MH }}
                  >
                    {match.participants.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center px-2 text-xs h-1/2 border-b last:border-b-0",
                          p.isWinner
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground/60",
                        )}
                      >
                        <span className="truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
