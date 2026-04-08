import {
  ParticipatingPenya,
} from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { updateProvaTimeResult } from "@/services/database/Admin/adminDbServices";
import { TimeRollingInput } from "@/components/shared/PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "@/components/shared/PenyaProvaResults/PointsInput/pointsInput";
import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import { toast } from "sonner";
import { ParticipatesInput } from "@/components/shared/PenyaProvaResults/ParticipatesInput/participatesInput";

interface SingleProvaSummaryProp {
  provaResultSummary: ParticipatingPenya;
  slotStatus?: 'ok' | 'overflow' | 'none';
}

export default function AdminSingleProvaResult({ provaResultSummary}: SingleProvaSummaryProp) {
  const prova = useProvaStore((state) => state.prova);
  const setProva = useProvaStore((state) => state.setProva);

  const prevSeconds = useRef(provaResultSummary.result);
  const [value, setValue] = useState(provaResultSummary.result);

  useEffect(() => {
    prevSeconds.current = provaResultSummary.result;
    setValue(provaResultSummary.result);
  }, [provaResultSummary.penyaId, provaResultSummary.result]);

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

  const updateProvaResult = async (newSeconds: string) => {
    if(prova.isFinished === true){
      toast.error("La prova està finalitzada! Has de reobrir-la per modificar els resultats.");
      setValue(prevSeconds.current);
      return;
    }

    if(prevSeconds.current !== newSeconds){
        updateProvaTimeResult(prova.reference, provaResultSummary.penyaId, newSeconds,
        () => {
          prevSeconds.current = newSeconds;
          setValue(newSeconds);
          setProva({
            ...prova,
            penyes: prova.penyes.map((p) =>
              p.penyaId === provaResultSummary.penyaId ? { ...p, result: newSeconds } : p
            ),
          });
        }, (error) => {
          setValue(prevSeconds.current);
          toast.error("Error al actualitzar el resultat. S'ha restaurat el valor anterior.");
          console.error("Error updating prova result:", error);
        });
    }
  };

  return (
    <motion.div
      className="relative w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden cursor-pointer"
      whileHover={{ y: -2, boxShadow: "0 6px 24px rgba(0,0,0,0.10)" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

      <div className="flex flex-col items-center gap-3 px-5 py-5">
        <p className="text-lg font-semibold text-card-foreground w-full text-center">
          {provaResultSummary.name}
        </p>
        <div className="w-full flex justify-center">
          {renderInput()}
        </div>
      </div>
    </motion.div>
  );
}
