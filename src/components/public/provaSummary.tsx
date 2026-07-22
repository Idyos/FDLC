import { ProvaSummary } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { navigateWithQuery } from "@/utils/url";

interface ProvaSummaryProps {
  provaSummary: ProvaSummary;
}

export default function ProvaSummaryCard({ provaSummary }: ProvaSummaryProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  let bgColor = theme === "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";

  const handleClick = () => {
    navigateWithQuery(navigate, "/prova", { provaId: provaSummary.id }); 
  };

  return (
    <motion.div
      onClick={handleClick}
      className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg mb-2 cursor-pointer"
      style={{ background: bgColor }}
      whileHover={{ scale: 1.02 }}
    >

      {/* Imagen de fondo */}
      {provaSummary.imageUrl && (
        <>
          <img
            src={provaSummary.imageUrl}
            alt={`${provaSummary.name}`}
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="absolute inset-0 dark:bg-black/50 bg-white/40" />
        </>
      )}

      {/* Contenido */}
      <div className="relative flex-1 z-10 flex flex-col justify-center gap-5 items-center h-full p-4 dark:text-white text-gray-900">
        <div className="w-full flex flex-row justify-between items-center">
          <div className="text-center w-full">
            <p className="text-5xl font-black">{provaSummary.name}</p>
            {provaSummary.startDate && (
              <Badge variant="secondary" className="text-sm font-medium rounded-4xl mt-4">
                {(() => {
                  const d =
                    provaSummary.isFinished && provaSummary.finishDate
                      ? provaSummary.finishDate
                      : provaSummary.startDate;

                  if (!d) return null;

                  const date = d.toLocaleDateString();
                  const time = d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <>
                      {provaSummary.isFinished ? "Acabada: " : "Comença: "}
                      {date} - {time}
                      </>
                  );
                })()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
