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

interface SingleProvaSummaryProp {
  provaResultSummary: ParticipatingPenya;
}

export default function AdminSingleProvaResult({ provaResultSummary }: SingleProvaSummaryProp) {
  // const { theme } = useTheme();
  // const navigate = useNavigate();
  const prova = useProvaStore((state) => state.prova);

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
            maxHours={3}
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
      default:
        return null;
    }
  };

  const updateProvaResult = async (newSeconds: number) => {
    if(prova.isFinished === false){
      toast.error("La prova està finalitzada! Has de reobrir-la per modificar els resultats.");
      setValue(prevSeconds.current);
      return;
    }

    if(prevSeconds.current !== newSeconds){
        updateProvaTimeResult(prova.reference, provaResultSummary.penyaId, newSeconds, 
        () => {
          prevSeconds.current = newSeconds;
          setValue(prevSeconds.current);
          console.log("Prova result updated successfully");
        }, (error) => {
          setValue(prevSeconds.current);
          console.error("Error updating prova result:", error);
        });
    }
  }

  return (
    <motion.div
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer"
      whileHover={{ scale: 1.02 }}
    >
      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          <p className="text-2xl font-bold">{provaResultSummary.name}</p>
        </div>
        <div>
            {renderInput()}
        </div>
      </div>
    </motion.div>
  );
}
