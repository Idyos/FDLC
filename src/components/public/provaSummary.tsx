import { ProvaSummary } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { navigateWithQuery } from "@/utils/url";
import { useYear } from "@/components/shared/Contexts/YearContext";
import AutoFitHeading from "@/components/shared/AutoFitHeading";

interface ProvaSummaryProps {
  provaSummary: ProvaSummary;
  index?: number;
}

export default function ProvaSummaryCard({ provaSummary, index = 0 }: ProvaSummaryProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { selectedYear } = useYear();

  let bgColor = theme === "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";

  const handleClick = () => {
    navigateWithQuery(navigate, "/prova", { provaId: provaSummary.id, year: selectedYear });
  };

  return (
    <motion.div
      onClick={handleClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.01 }}
      className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
      style={{ background: bgColor }}
      whileHover={{ scale: 1.02 }}
    >

      {/* Imagen de fondo */}
      {provaSummary.imageUrl && (
        <>
          <img
            src={provaSummary.imageUrl}
            alt={`${provaSummary.name}`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="absolute inset-0 dark:bg-black/50 bg-white/40" />
        </>
      )}

      {/* Contenido */}
      <motion.div
        className="relative flex-1 z-10 flex flex-col justify-center gap-5 items-center h-full p-4 dark:text-white text-gray-900"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03 }}
      >
        <div className="w-full flex flex-row justify-between items-center">
          <div className="text-center w-full">
            <AutoFitHeading as="p" className="md:text-5xl text-4xl font-bold">
              {provaSummary.name}
            </AutoFitHeading>
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
      </motion.div>
    </motion.div>
  );
}
