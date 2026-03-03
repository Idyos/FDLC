import {
  ParticipatingPenya,
} from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { updateProvaTimeResult, updateParticipationTime } from "@/services/database/Admin/adminDbServices";
import { TimeRollingInput } from "@/components/shared/PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "@/components/shared/PenyaProvaResults/PointsInput/pointsInput";
import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import { toast } from "sonner";
import { ParticipatesInput } from "@/components/shared/PenyaProvaResults/ParticipatesInput/participatesInput";

interface SingleProvaSummaryProp {
  provaResultSummary: ParticipatingPenya;
  slotStatus?: 'ok' | 'overflow' | 'none';
}

export default function AdminSingleProvaResult({ provaResultSummary, slotStatus = 'none' }: SingleProvaSummaryProp) {
  const prova = useProvaStore((state) => state.prova);

  const prevSeconds = useRef(provaResultSummary.result);
  const [value, setValue] = useState(provaResultSummary.result);
  const [participationTime, setParticipationTime] = useState<Date | null>(
    provaResultSummary.participationTime ?? null
  );

  useEffect(() => {
    prevSeconds.current = provaResultSummary.result;
    setValue(provaResultSummary.result);
  }, [provaResultSummary.penyaId, provaResultSummary.result]);

  useEffect(() => {
    setParticipationTime(provaResultSummary.participationTime ?? null);
  }, [provaResultSummary.penyaId, provaResultSummary.participationTime]);

  const renderInput = () => {
    switch (prova.challengeType) {
      case "Temps":
        return (
          <TimeRollingInput
            value={value}
            onChange={setValue}
            onBlur={(newSeconds) => updateProvaResult(newSeconds)}
          />
        );
      case "Punts":
        return (
          <PointsInput
            value={value}
            onChange={setValue}
            onBlur={(newPoints) => updateProvaResult(newPoints)}
          />
        );
      case "Participació":
        return (
          <ParticipatesInput
            value={value}
            onChange={setValue}
            onBlur={(newParticipation) => updateProvaResult(newParticipation)}
          />
        );
      default:
        return null;
    }
  };

  const updateProvaResult = async (newSeconds: number) => {
    if(prova.isFinished === true){
      toast.error("La prova està finalitzada! Has de reobrir-la per modificar els resultats.");
      setValue(prevSeconds.current);
      return;
    }

    if(prevSeconds.current !== newSeconds){
        updateProvaTimeResult(prova.reference, provaResultSummary.penyaId, newSeconds,
        () => {
          prevSeconds.current = newSeconds;
          setValue(prevSeconds.current);
        }, (error) => {
          setValue(prevSeconds.current);
          console.error("Error updating prova result:", error);
        });
    }
  };

  const handleParticipationTimeBlur = (time: Date | null) => {
    if (prova.isFinished) {
      toast.error("La prova està finalitzada! Has de reobrir-la per modificar els resultats.");
      return;
    }
    updateParticipationTime(prova.reference, provaResultSummary.penyaId, time);
  };

  const borderClass =
    slotStatus === 'overflow' ? 'border-2 border-red-500' :
    slotStatus === 'ok'       ? 'border-2 border-green-500' :
    '';

  const timeValue = participationTime
    ? `${String(participationTime.getHours()).padStart(2, '0')}:${String(participationTime.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <motion.div
      className={`relative w-full rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer ${borderClass}`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left w-full">
          <p className="text-2xl font-bold">{provaResultSummary.name}</p>
        </div>
        <div>
          {renderInput()}
        </div>
        {prova.intervalMinutes != null && (
          <div className="flex items-center gap-2 mt-2 w-full">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Hora:</span>
            <input
              type="time"
              className="border rounded px-2 py-1 text-sm bg-transparent dark:text-white dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={timeValue}
              onChange={(e) => {
                if (!e.target.value) {
                  setParticipationTime(null);
                  return;
                }
                const [h, m] = e.target.value.split(':').map(Number);
                const d = new Date(prova.startDate);
                d.setHours(h, m, 0, 0);
                setParticipationTime(d);
              }}
              onBlur={() => handleParticipationTimeBlur(participationTime)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
