import { SingleProvaResultData } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { TimeRollingInput } from "../shared/PenyaProvaResults/TimeInput/timeInput";
import { useEffect, useRef, useState } from "react";
import { useProvaStore } from "../shared/Contexts/ProvaContext";
import { useNavigate } from "react-router-dom";
import { PointsInput } from "../shared/PenyaProvaResults/PointsInput/pointsInput";

interface SingleProvaSummaryProp {
  provaResultSummary: SingleProvaResultData;
}

export default function SingleProvaResult({ provaResultSummary }: SingleProvaSummaryProp) {
  const navigate = useNavigate();

  const prova = useProvaStore((state) => state.prova);

  const prevValue = useRef(provaResultSummary.result);
  const [value, setValue] = useState(provaResultSummary.result);

  useEffect(() => {
    prevValue.current = provaResultSummary.result;
    setValue(provaResultSummary.result);
  }, [provaResultSummary.penyaId, provaResultSummary.result]);

  const handleClick = () => {
      navigate(`/penya?penyaId=${provaResultSummary.penyaId}`);
  }

  const renderInput = () => {
    switch (provaResultSummary.provaType) {
      case "Temps":
        return (
          <TimeRollingInput
            value={value}
            onChange={setValue}
            maxHours={3}
          />
        );
      case "Punts":
        return (
          <PointsInput
            value={value}
            onChange={setValue}
          />
        );
      default:
        return null;
    }
  };

  const getPointsForIndex = (index: number): number | null => {
    if (!prova?.pointsRange) return null;
    if(index == -1) return null;

    // Busca el rango que contenga el índice
    const range = prova.pointsRange.find(r => index >= r.from && index <= r.to);

    // Devuelve los puntos (o null si no encaja en ninguno)
    return range ? range.points : null;
  };

  return (
    <motion.div
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
    >
      {/* Contenido */}
      <div className="relative z-10 flex justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          <p className={`${prova?.isFinished ? "text-4xl font-extrabold" : "inline text-2xl font-bold opacity-40 blur-[2.5px]"}`}>{provaResultSummary.index}. </p>
          <span className="text-2xl font-bold">{provaResultSummary.penyaName}</span>
        </div>
        <div className="flex flex-row items-center space-x-6">
          {renderInput()}
          <span className={`${!prova?.isFinished ? "text-2xl font-bold opacity-40 blur-[2.5px]" : "text-4xl font-extrabold"}`} >{prova?.isFinished ? "+" : null}{getPointsForIndex(provaResultSummary.index || -1) ?? ""}</span>
        </div>
      </div>
    </motion.div>
  );
}
