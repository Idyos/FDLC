import {
  SingleProvaResultData,
} from "@/interfaces/interfaces";
import { motion } from "framer-motion";
// import { useNavigate } from "react-router-dom";
// import { useTheme } from "../Theme/theme-provider";
import { TimeRollingInput } from "../shared/timeInput";
import { useEffect, useRef, useState } from "react";
import { updateProvaTimeResult } from "@/services/dbService";

type AnyProvaResult = SingleProvaResultData;

interface SingleProvaSummaryProp {
  provaResultSummary: AnyProvaResult;
}

export default function SingleProvaResult({ provaResultSummary }: SingleProvaSummaryProp) {
  // const { theme } = useTheme();
  // const navigate = useNavigate();
  const prevSeconds = useRef(provaResultSummary.result);
  const [secs, setSecs] = useState(provaResultSummary.result);

  useEffect(() => {
    prevSeconds.current = provaResultSummary.result;
    setSecs(provaResultSummary.result);
  }, [provaResultSummary.penyaId, provaResultSummary.result]);

  const renderInput = () => {
    switch (provaResultSummary.provaType) {
      case "Temps":
        return (
          <TimeRollingInput
            valueSeconds={secs}
            onChangeSeconds={setSecs}
            maxHours={3}
            onBlur={(newSeconds) => updateProvaResult(newSeconds)}
          />
        );
      default:
        return null;
    }
  };

  const updateProvaResult = async (newSeconds: number) => {
    if(prevSeconds.current !== newSeconds){
        updateProvaTimeResult(provaResultSummary.provaReference, provaResultSummary.penyaId, newSeconds, 
        () => {
          prevSeconds.current = newSeconds;
          setSecs(prevSeconds.current);
          console.log("Prova result updated successfully");
        }, (error) => {
          setSecs(prevSeconds.current);
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
      <div className="relative z-10 flex justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          <p className="text-2xl font-bold">{provaResultSummary.penyaName}</p>
        </div>
        {renderInput()}
      </div>
    </motion.div>
  );
}
