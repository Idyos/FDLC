import { ParticipatingPenya, ProvaType } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { TimeRollingInput } from "./TimeInput/timeInput";
import { useEffect, useRef, useState } from "react";
import { useProvaStore } from "../Contexts/ProvaContext";
import { useNavigate } from "react-router-dom";
import { PointsInput } from "./PointsInput/pointsInput";
import { navigateWithQuery } from "@/utils/url";
import { useYear } from "../Contexts/YearContext";
import { isAdmin } from "@/services/authService";
import { usePenyesCache } from "../Contexts/PenyesCacheContext";
import { useTheme } from "@/components/Theme/theme-provider";

interface SingleProvaSummaryProp {
  provaResultSummary: ParticipatingPenya;
  challengeTypeOverride?: ProvaType;
}

export default function SingleProvaResultGrid({ provaResultSummary, challengeTypeOverride }: SingleProvaSummaryProp) {
  const navigate = useNavigate();
  const { selectedYear } = useYear();

  const prova = useProvaStore((state) => state.prova);
  const { penyesById } = usePenyesCache();
  const imageUrl = penyesById[provaResultSummary.penyaId]?.imageUrl;
  const { theme } = useTheme();

  // Mateix codi de color per posició que penyaSummary/penyaSummaryGrid
  let bgColor = theme == "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";
  if (provaResultSummary.index === 1) bgColor = theme == "dark" ? "rgba(255, 221, 51, 1)" : "rgba(255, 255, 0, 1)";
  else if (provaResultSummary.index === 2) bgColor = "rgba(169, 169, 169, 1)";
  else if (provaResultSummary.index === 3) bgColor = "rgba(255, 165, 0, 1)";

  const prevValue = useRef(provaResultSummary.result);
  const [value, setValue] = useState(provaResultSummary.result);

  useEffect(() => {
    prevValue.current = provaResultSummary.result;
    setValue(provaResultSummary.result);
  }, [provaResultSummary.penyaId, provaResultSummary.result]);

  const handleClick = () => {
      navigateWithQuery(navigate, "/penya", { penyaId: provaResultSummary.penyaId, year: selectedYear });
  }

  const renderInput = () => {
    switch (challengeTypeOverride ?? prova.challengeType) {
      case "Temps":
        return (
          <TimeRollingInput
            value={value}
            onChange={setValue}
          />
        );
      case "Punts":
        return (
          <PointsInput
            value={value}
            onChange={setValue}
          />
        );
      case "MultiProva":
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

  const hasResult = provaResultSummary.participates && provaResultSummary.result != null && provaResultSummary.result !== "" && Number(provaResultSummary.result) >= 0;
  const showNoParticipation = prova.isFinished && !isAdmin() && !hasResult;

  return (
    <motion.div
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      style={{ background: bgColor }}
    >
      {/* Imagen de fondo */}
      <img
        src={imageUrl || undefined}
        alt="Imagen Peña"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 object-cover w-full h-full"
        style={imageUrl == null ? {display: "none"} : {}}
      />

      {/* Capa de overlay para oscurecer */}
      <div
        style={imageUrl == null ? {display: "none"} : {}}
        className="absolute inset-0 dark:bg-black/50 bg-white/40"
        ></div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-around items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          {!showNoParticipation && <p className={`inline ${prova.isFinished ? "text-4xl font-extrabold" : "text-2xl font-bold opacity-20"}`}>{provaResultSummary.index}. </p>}
          <span className="inline text-xl font-bold">{provaResultSummary.name}</span>
        </div>
        <div className="flex flex-row items-center space-x-6">
          {showNoParticipation ? (
            <span className="text-sm font-semibold text-muted-foreground">No ha participat</span>
          ) : (
            <>
              {renderInput()}
              {hasResult && <span className={`${!prova?.isFinished ? "text-2xl font-bold opacity-40 blur-[3px]" : "text-4xl font-extrabold"}`} >{prova.isFinished ? "+" : null}{getPointsForIndex(provaResultSummary.index || -1) ?? ""}</span>}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
