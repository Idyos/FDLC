import { useEffect, useRef, useState } from "react";
import type { Match } from "@/utils/bracketCreator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type SlotStatus = "under" | "ok" | "overflow";

function computeSlotStatuses(
  matchSchedules: Record<string, string>,
  durationMinutes: number,
  simultaneous: number,
  startDate: Date
): Record<string, SlotStatus> {
  if (!durationMinutes || !simultaneous) return {};
  const groups: Record<number, string[]> = {};
  Object.entries(matchSchedules).forEach(([matchId, timeStr]) => {
    if (!timeStr) return;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(startDate);
    d.setHours(h, m, 0, 0);
    const diffMins = (d.getTime() - startDate.getTime()) / 60000;
    const slot = Math.floor(diffMins / durationMinutes);
    (groups[slot] ??= []).push(matchId);
  });
  const out: Record<string, SlotStatus> = {};
  Object.values(groups).forEach((group) => {
    const status: SlotStatus =
      group.length > simultaneous
        ? "overflow"
        : group.length < simultaneous
        ? "under"
        : "ok";
    group.forEach((id) => (out[id] = status));
  });
  return out;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getMatchLabel(match: Match): string {
  const names = match.teams
    .filter((t) => t.source.type !== "bye")
    .map((t) => t.displayName ?? "Pendent");
  return names.join(" vs ");
}

interface Props {
  matches: Match[];
  matchSchedules: Record<string, string>;
  matchDurationMinutes: number;
  simultaneousMatches: number;
  startDate: Date;
  readOnly?: boolean;
  onSave: (
    schedules: Record<string, string>,
    duration: number,
    simMatches: number
  ) => Promise<void>;
}

export default function AdminBracketHoraris({
  matches,
  matchSchedules,
  matchDurationMinutes,
  simultaneousMatches,
  startDate,
  readOnly = false,
  onSave,
}: Props) {
  const [localDuration, setLocalDuration] = useState(matchDurationMinutes || 0);
  const [localSimultaneous, setLocalSimultaneous] = useState(simultaneousMatches || 1);
  const [localSchedules, setLocalSchedules] = useState<Record<string, string>>(matchSchedules);
  const [committedSchedules, setCommittedSchedules] = useState<Record<string, string>>(matchSchedules);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const pendingDuration = useRef(matchDurationMinutes || 0);
  const pendingSimultaneous = useRef(simultaneousMatches || 1);

  useEffect(() => {
    setLocalDuration(matchDurationMinutes || 0);
    setLocalSimultaneous(simultaneousMatches || 1);
    setLocalSchedules(matchSchedules);
    setCommittedSchedules(matchSchedules);
    pendingDuration.current = matchDurationMinutes || 0;
    pendingSimultaneous.current = simultaneousMatches || 1;
  }, [matchDurationMinutes, simultaneousMatches, matchSchedules]);

  const schedulableMatches = [...matches]
    .filter((m) => m.status !== "bye")
    .sort((a, b) => a.roundNumber - b.roundNumber || a.position - b.position);

  const hasAnyTime = Object.values(committedSchedules).some((t) => !!t);

  const slotStatuses = computeSlotStatuses(
    committedSchedules,
    localDuration,
    localSimultaneous,
    startDate
  );

  const doGenerate = async () => {
    if (!localDuration || !localSimultaneous) {
      toast.error("Cal configurar la durada i el nombre de partits simultanis");
      return;
    }
    const newSchedules: Record<string, string> = {};
    schedulableMatches.forEach((match, index) => {
      const slotIndex = Math.floor(index / localSimultaneous);
      const d = new Date(startDate);
      d.setMinutes(d.getMinutes() + slotIndex * localDuration);
      d.setSeconds(0, 0);
      newSchedules[match.id] = formatTime(d);
    });
    try {
      await onSave(newSchedules, localDuration, localSimultaneous);
      setLocalSchedules(newSchedules);
      setCommittedSchedules(newSchedules);
      toast.success("Horaris generats correctament");
    } catch {
      toast.error("Error generant els horaris");
    }
  };

  const handleMatchTimeBlur = async (matchId: string) => {
    const timeStr = localSchedules[matchId] ?? "";
    const newCommitted = { ...committedSchedules, [matchId]: timeStr };
    setCommittedSchedules(newCommitted);
    try {
      await onSave(newCommitted, localDuration, localSimultaneous);
    } catch {
      toast.error("Error actualitzant l'horari");
    }
  };

  const handleConfigBlur = () => {
    if (
      pendingDuration.current === localDuration &&
      pendingSimultaneous.current === localSimultaneous
    )
      return;
    if (hasAnyTime) {
      setConfigDialogOpen(true);
    } else {
      applyConfigUpdate();
    }
  };

  const applyConfigUpdate = async () => {
    const cleared: Record<string, string> = {};
    schedulableMatches.forEach((m) => {
      cleared[m.id] = "";
    });
    setLocalSchedules(cleared);
    setCommittedSchedules(cleared);
    pendingDuration.current = localDuration;
    pendingSimultaneous.current = localSimultaneous;
    try {
      await onSave(cleared, localDuration, localSimultaneous);
      toast.success("Configuració actualitzada");
    } catch {
      toast.error("Error actualitzant la configuració");
    }
  };

  if (schedulableMatches.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          No hi ha cap quadre generat. Genera el quadre per poder assignar horaris.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {!readOnly && (
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Durada per enfrentament (min):</label>
            <Input
              type="number"
              min={1}
              className="w-32"
              value={localDuration || ""}
              onChange={(e) =>
                setLocalDuration(e.target.value ? Number(e.target.value) : 0)
              }
              onBlur={handleConfigBlur}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Enfrentaments simultanis màxims:</label>
            <Input
              type="number"
              min={1}
              className="w-32"
              value={localSimultaneous || ""}
              onChange={(e) =>
                setLocalSimultaneous(e.target.value ? Number(e.target.value) : 1)
              }
              onBlur={handleConfigBlur}
            />
          </div>
          <Button
            onClick={() =>
              hasAnyTime ? setGenerateDialogOpen(true) : doGenerate()
            }
            disabled={!localDuration || !localSimultaneous}
          >
            Generar horaris
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))] gap-3">
        {schedulableMatches.map((match) => {
          const timeStr = localSchedules[match.id] ?? "";
          const status = slotStatuses[match.id];
          const borderClass = readOnly
            ? "border"
            : !timeStr
            ? "border-2 border-yellow-400"
            : status === "overflow"
            ? "border-2 border-red-500"
            : status === "under"
            ? "border-2 border-blue-400"
            : "border-2 border-green-500";
          return (
            <div
              key={match.id}
              className={`rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-neutral-800 shadow-sm ${borderClass}`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted-foreground">
                  {match.roundName} · {match.position}
                </span>
                <span className="font-medium truncate text-sm">
                  {getMatchLabel(match)}
                </span>
              </div>
              {!readOnly ? (
                <Input
                  type="time"
                  className="w-28 text-sm shrink-0"
                  value={timeStr}
                  onChange={(e) =>
                    setLocalSchedules((prev) => ({
                      ...prev,
                      [match.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleMatchTimeBlur(match.id)}
                />
              ) : (
                <span className="text-sm font-mono text-gray-600 dark:text-neutral-300 whitespace-nowrap shrink-0">
                  {timeStr || "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modificar configuració d'horaris</AlertDialogTitle>
            <AlertDialogDescription>
              Ja hi ha partits amb horari assignat. Si continues, tots els horaris
              s'esborren i s'actualitza la configuració. Vols continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfigDialogOpen(false);
                setLocalDuration(pendingDuration.current);
                setLocalSimultaneous(pendingSimultaneous.current);
              }}
            >
              Cancel·lar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfigDialogOpen(false);
                applyConfigUpdate();
              }}
            >
              Continuar i esborrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar horaris</AlertDialogTitle>
            <AlertDialogDescription>
              Ja hi ha partits amb horari assignat. Si continues, tots els horaris
              actuals s'esborraran i es generaran de nou. Vols continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setGenerateDialogOpen(false);
                doGenerate();
              }}
            >
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
