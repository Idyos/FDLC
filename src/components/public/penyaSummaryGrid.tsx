import { PenyaRankingSummary } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge"

interface PenyaSummaryProps {
    rankingInfo: PenyaRankingSummary;
}

export default function PenyaSummaryGrid({ rankingInfo }: PenyaSummaryProps) {              
  const { theme } = useTheme();

  let bgColor = theme == "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";
  if (rankingInfo.position === 1) bgColor = theme == "dark" ? "rgba(255, 221, 51, 1)" : "rgba(255, 255, 0, 1)";  // Yellow for 1st position
  else if (rankingInfo.position === 2) bgColor = theme == "dark" ? "rgba(169, 169, 169, 1)" : "rgba(169, 169, 169, 1)"; // Gray
  else if (rankingInfo.position === 3) bgColor = theme == "dark" ? "rgba(255, 165, 0, 1)" : "rgba(255, 165, 0, 1)"; // Orange


    const navigate = useNavigate();

    const handleClick = () => {
      navigate(`/penya?penyaId=${rankingInfo.penyaId}`);
    };

    return (
      <>
      <motion.div
      onClick={rankingInfo.isSecret ? undefined : handleClick}
      key={rankingInfo.penyaId}
      whileHover={{ scale: 1.02 }}
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer"
      style={{ background: bgColor }}
    >
      {/* Imagen de fondo */}
      <img
        src={rankingInfo.imageUrl || undefined}
        alt="Imagen Peña"
        className="absolute object-cover"
        style={rankingInfo.isSecret || rankingInfo.imageUrl == null ? {display: "none"} : {}} // Efecto de desenfoque y brillo
      />
  
      {/* Capa de overlay para oscurecer */}
      <div 
        style={rankingInfo.isSecret || rankingInfo.imageUrl == null ? {display: "none"} : {}}
        className="absolute inset-0 dark:bg-black/50 bg-white/40"
        ></div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-around items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-center">
          <p className="inline text-3xl font-extrabold">{rankingInfo.position}.</p>
          <p className="inline text-2xl font-bold"> {rankingInfo.isSecret ? "???" : rankingInfo.name}</p>
        </div>

        <Badge variant="secondary" className="text-right text-lg font-semibold rounded-4xl">
          {rankingInfo.isSecret ? "???" : rankingInfo.totalPoints} punts
        </Badge>
      </div>

      {/* Flechitas de subida/bajada */}
      {rankingInfo.directionChange === "up" && (
        <motion.div
          className="absolute right-4 top-4 text-green-400"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          ⬆
        </motion.div>
      )}
      {rankingInfo.directionChange === "down" && (
        <motion.div
          className="absolute right-4 top-4 text-red-400"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          ⬇
        </motion.div>
      )}
    </motion.div>
      </>
    );
}
