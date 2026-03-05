import { useState, useEffect, useRef } from "react";
import { Prova, ParticipatingPenya } from "@/interfaces/interfaces";
import { SortMode } from "@/utils/sorting";
import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import {
  updateParticipationTime,
  updateProvaScheduleConfig,
  clearAllParticipationTimes,
  batchUpdateParticipationTimes,
} from "@/services/database/Admin/adminDbServices";
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

type SlotStatus = "under" | "ok" | "overflow";

function computeSlotStatusesFromTimes(
  penyaTimes: Record<string, string>,
  intervalMinutes: number,
  maxPenyesPerSlot: number,
  startDate: Date
): Record<string, SlotStatus> {
  const groups: Record<number, string[]> = {};
  Object.entries(penyaTimes).forEach(([penyaId, timeStr]) => {
    if (!timeStr) return;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(startDate);
    d.setHours(h, m, 0, 0);
    const diffMins = (d.getTime() - startDate.getTime()) / 60000;
    const slot = Math.floor(diffMins / intervalMinutes);
    (groups[slot] ??= []).push(penyaId);
  });
  const out: Record<string, SlotStatus> = {};
  Object.values(groups).forEach((group) => {
    const status: SlotStatus =
      group.length > maxPenyesPerSlot ? "overflow" :
      group.length < maxPenyesPerSlot ? "under" : "ok";
    group.forEach((id) => (out[id] = status));
  });
  return out;
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  prova: Prova;
  sortMode: SortMode;
  onProvaConfigUpdated: (intervalMinutes: number, maxPenyesPerSlot: number) => void;
}

export default function AdminHoraris({ prova, sortMode, onProvaConfigUpdated }: Props) {
  const setProva = useProvaStore((state) => state.setProva);

  const [localInterval, setLocalInterval] = useState(prova.intervalMinutes ?? 0);
  const [localMaxSlot, setLocalMaxSlot] = useState(prova.maxPenyesPerSlot ?? 1);

  const pendingInterval = useRef<number>(localInterval);
  const pendingMaxSlot = useRef<number>(localMaxSlot);

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const [penyaTimes, setPenyaTimes] = useState<Record<string, string>>({});
  const [committedTimes, setCommittedTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalInterval(prova.intervalMinutes ?? 0);
    setLocalMaxSlot(prova.maxPenyesPerSlot ?? 1);
    const times: Record<string, string> = {};
    prova.penyes.forEach((p) => { times[p.penyaId] = formatTime(p.participationTime); });
    setPenyaTimes(times);
    setCommittedTimes(times);
  }, [prova.id]);

  const hasAnyTime = Object.values(committedTimes).some((t) => !!t);

  const slotStatuses = computeSlotStatusesFromTimes(
    committedTimes,
    localInterval,
    localMaxSlot,
    prova.startDate
  );

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
        await clearAllParticipationTimes(prova.reference, prova.penyes.map((p) => p.penyaId));
        const cleared: Record<string, string> = {};
        prova.penyes.forEach((p) => { cleared[p.penyaId] = ""; });
        setPenyaTimes(cleared);
        setCommittedTimes(cleared);
      }
      await updateProvaScheduleConfig(prova.reference, interval, maxSlot);
      pendingInterval.current = interval;
      pendingMaxSlot.current = maxSlot;
      onProvaConfigUpdated(interval, maxSlot);
      const updatedProva = Object.assign(Object.create(Object.getPrototypeOf(prova)), prova, {
        intervalMinutes: interval,
        maxPenyesPerSlot: maxSlot,
        penyes: prova.penyes.map((p) => ({ ...p, participationTime: null })),
      });
      setProva(updatedProva);
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
    const shuffled = [...prova.penyes].sort(() => Math.random() - 0.5);
    const assignments = shuffled.map((p, i) => {
      const d = new Date(prova.startDate);
      d.setMinutes(d.getMinutes() + Math.floor(i / localMaxSlot) * localInterval);
      d.setSeconds(0, 0);
      return { penyaId: p.penyaId, time: d };
    });
    try {
      await batchUpdateParticipationTimes(prova.reference, assignments);
      const newTimes: Record<string, string> = {};
      assignments.forEach(({ penyaId, time }) => { newTimes[penyaId] = formatTime(time); });
      setPenyaTimes(newTimes);
      setCommittedTimes(newTimes);
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
      newDate = new Date(prova.startDate);
      newDate.setHours(h, m, 0, 0);
    }
    await updateParticipationTime(prova.reference, penya.penyaId, newDate);
  };

  const sortedPenyes = [...prova.penyes].sort((a, b) => {
    switch (sortMode) {
      case "name-asc":    return a.name.localeCompare(b.name);
      case "name-desc":   return b.name.localeCompare(a.name);
      case "result-asc":  return (a.result ?? 0) - (b.result ?? 0);
      case "result-desc": return (b.result ?? 0) - (a.result ?? 0);
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
              className={`rounded-xl p-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-800 shadow-sm ${borderClass}`}
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
