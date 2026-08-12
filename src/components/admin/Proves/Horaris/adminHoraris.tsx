import { useState, useEffect, useRef } from "react";
import { ParticipatingPenya } from "@/interfaces/interfaces";
import { SortMode } from "@/utils/sorting";
import { formatTime, computeSlotStatuses } from "@/utils/scheduleFormatting";
import { scheduleItemsAvoidingBusy, BusyInterval, ScheduleItem } from "@/utils/multiProvaScheduler";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  /** Identity of the underlying Prova/subprova, used to resync local editable
   *  state if the caller switches to a different resource without remounting. */
  resourceKey: string;
  penyes: ParticipatingPenya[];
  startDate: Date;
  intervalMinutes: number;
  maxPenyesPerSlot: number;
  sortMode: SortMode;
  updateParticipationTime: (penyaId: string, time: Date | null) => Promise<void>;
  updateScheduleConfig: (intervalMinutes: number, maxPenyesPerSlot: number) => Promise<void>;
  clearAllParticipationTimes: (penyaIds: string[]) => Promise<void>;
  batchUpdateParticipationTimes: (
    assignments: { penyaId: string; time: Date | null }[]
  ) => Promise<void>;
  onConfigUpdated: (intervalMinutes: number, maxPenyesPerSlot: number) => void;
  /** When provided (only inside a MultiProva), used by "Generar horaris" to try
   *  to avoid overlapping with times already assigned to sibling sub-proves. */
  fetchExternalBusyIntervals?: () => Promise<Map<string, BusyInterval[]>>;
}

export default function AdminHoraris({
  resourceKey,
  penyes,
  startDate,
  intervalMinutes,
  maxPenyesPerSlot,
  sortMode,
  updateParticipationTime,
  updateScheduleConfig,
  clearAllParticipationTimes,
  batchUpdateParticipationTimes,
  onConfigUpdated,
  fetchExternalBusyIntervals,
}: Props) {
  const [localInterval, setLocalInterval] = useState(intervalMinutes ?? 0);
  const [localMaxSlot, setLocalMaxSlot] = useState(maxPenyesPerSlot ?? 1);

  const pendingInterval = useRef<number>(localInterval);
  const pendingMaxSlot = useRef<number>(localMaxSlot);

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const [penyaTimes, setPenyaTimes] = useState<Record<string, string>>({});
  const [committedTimes, setCommittedTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalInterval(intervalMinutes ?? 0);
    setLocalMaxSlot(maxPenyesPerSlot ?? 1);
    const times: Record<string, string> = {};
    penyes.forEach((p) => { times[p.penyaId] = formatTime(p.participationTime); });
    setPenyaTimes(times);
    setCommittedTimes(times);
  }, [resourceKey]);

  const hasAnyTime = Object.values(committedTimes).some((t) => !!t);

  const slotStatuses = computeSlotStatuses(committedTimes, localInterval, localMaxSlot, startDate);

  const handleConfigBlur = () => {
    if (pendingInterval.current === localInterval && pendingMaxSlot.current === localMaxSlot) return;
    if (hasAnyTime) {
      setConfigDialogOpen(true);
    } else {
      applyConfigUpdate(localInterval, localMaxSlot);
    }
  };

  const applyConfigUpdate = async (interval: number, maxSlot: number) => {
    try {
      if (hasAnyTime) {
        await clearAllParticipationTimes(penyes.map((p) => p.penyaId));
        const cleared: Record<string, string> = {};
        penyes.forEach((p) => { cleared[p.penyaId] = ""; });
        setPenyaTimes(cleared);
        setCommittedTimes(cleared);
      }
      await updateScheduleConfig(interval, maxSlot);
      pendingInterval.current = interval;
      pendingMaxSlot.current = maxSlot;
      onConfigUpdated(interval, maxSlot);
      toast.success("Configuració actualitzada");
    } catch (error) {
      console.error("Error updating schedule config:", error);
      toast.error("Error actualitzant la configuració");
    }
  };

  const handleConfigConfirm = () => {
    setConfigDialogOpen(false);
    applyConfigUpdate(localInterval, localMaxSlot);
  };

  const handleConfigCancel = () => {
    setConfigDialogOpen(false);
    setLocalInterval(pendingInterval.current);
    setLocalMaxSlot(pendingMaxSlot.current);
  };

  const doGenerate = async () => {
    const externalBusy = fetchExternalBusyIntervals
      ? await fetchExternalBusyIntervals()
      : new Map<string, BusyInterval[]>();

    const items: ScheduleItem[] = penyes.map((p) => ({ itemId: p.penyaId, teamIds: [p.penyaId] }));
    const { assignments, relaxed } = scheduleItemsAvoidingBusy(
      items,
      localInterval,
      localMaxSlot,
      externalBusy
    );

    const newAssignments = penyes.map((p) => {
      const offset = assignments.get(p.penyaId) ?? 0;
      const d = new Date(startDate);
      d.setMinutes(d.getMinutes() + offset);
      d.setSeconds(0, 0);
      return { penyaId: p.penyaId, time: d };
    });

    try {
      await batchUpdateParticipationTimes(newAssignments);
      const newTimes: Record<string, string> = {};
      newAssignments.forEach(({ penyaId, time }) => { newTimes[penyaId] = formatTime(time); });
      setPenyaTimes(newTimes);
      setCommittedTimes(newTimes);
      if (relaxed.length > 0) {
        toast.warning(
          `No s'ha pogut evitar el solapament amb altres subproves per a ${relaxed.length} penya(es).`
        );
      }
      toast.success("Horaris generats correctament");
    } catch {
      toast.error("Error generant els horaris");
    }
  };

  const handleGenerate = () => {
    if (hasAnyTime) {
      setGenerateDialogOpen(true);
    } else {
      doGenerate();
    }
  };

  const handlePenyaTimeBlur = async (penya: ParticipatingPenya) => {
    const timeStr = penyaTimes[penya.penyaId] ?? "";
    setCommittedTimes((prev) => ({ ...prev, [penya.penyaId]: timeStr }));
    let newDate: Date | null = null;
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      newDate = new Date(startDate);
      newDate.setHours(h, m, 0, 0);
    }
    await updateParticipationTime(penya.penyaId, newDate);
  };

  const sortedPenyes = [...penyes].sort((a, b) => {
    switch (sortMode) {
      case "name-asc":    return a.name.localeCompare(b.name);
      case "name-desc":   return b.name.localeCompare(a.name);
      case "result-asc":  return (parseFloat(a.result ?? "0") || 0) - (parseFloat(b.result ?? "0") || 0);
      case "result-desc": return (parseFloat(b.result ?? "0") || 0) - (parseFloat(a.result ?? "0") || 0);
      case "time-asc":
      case "time-desc": {
        const aTime = committedTimes[a.penyaId] ?? "";
        const bTime = committedTimes[b.penyaId] ?? "";
        if (!aTime && !bTime) return a.name.localeCompare(b.name);
        if (!aTime) return 1;
        if (!bTime) return -1;
        return sortMode === "time-asc" ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
      }
    }
  });

  return (
    <div className="p-4 space-y-6">
      {/* Configuració */}
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Interval entre torns (min):</label>
          <Input
            type="number"
            min={1}
            className="w-32"
            value={localInterval || ""}
            onChange={(e) => setLocalInterval(e.target.value ? Number(e.target.value) : 0)}
            onBlur={handleConfigBlur}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Penyes simultànies màximes:</label>
          <Input
            type="number"
            min={1}
            className="w-32"
            value={localMaxSlot || ""}
            onChange={(e) => setLocalMaxSlot(e.target.value ? Number(e.target.value) : 1)}
            onBlur={handleConfigBlur}
          />
        </div>
        <Button onClick={handleGenerate} variant="default">
          Generar horaris
        </Button>
      </div>

      {/* Llista de penyes */}
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(260px,_1fr))] gap-3">
        {sortedPenyes.map((penya) => {
          const timeStr = penyaTimes[penya.penyaId] ?? "";
          const status = slotStatuses[penya.penyaId];
          const borderClass = !timeStr
            ? "border-2 border-yellow-400"
            : status === "overflow"
            ? "border-2 border-red-500"
            : status === "under"
            ? "border-2 border-blue-400"
            : "border-2 border-green-500";
          return (
            <div
              key={penya.penyaId}
              className={`rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-neutral-800 shadow-sm ${borderClass}`}
            >
              <span className="font-medium truncate">{penya.name}</span>
              <Input
                type="time"
                className="w-28 text-sm"
                value={penyaTimes[penya.penyaId] ?? ""}
                onChange={(e) =>
                  setPenyaTimes((prev) => ({ ...prev, [penya.penyaId]: e.target.value }))
                }
                onBlur={() => handlePenyaTimeBlur(penya)}
              />
            </div>
          );
        })}
      </div>

      {/* Diàleg: modificar config amb horaris existents */}
      <AlertDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modificar configuració d'horaris</AlertDialogTitle>
            <AlertDialogDescription>
              Ja hi ha penyes amb horari assignat. Si continues, tots els horaris s'esborren i
              s'actualitza la configuració. Vols continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfigCancel}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfigConfirm}>Continuar i esborrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diàleg: regenerar amb horaris existents */}
      <AlertDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar horaris</AlertDialogTitle>
            <AlertDialogDescription>
              Ja hi ha penyes amb horari assignat. Si continues, tots els horaris actuals
              s'esborraran i es generaran de nou aleatòriament. Vols continuar?
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
