import { PenyaProvaSummary } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import PenyaProvaResult from "../shared/Prova/penyaProvaResult";
import { Trophy } from "lucide-react";
import { Card } from "../ui/card";
import { Separator } from "@/components/ui/separator"

interface ProvaSummaryProps {
  provaSummary: PenyaProvaSummary;
}

export default function ProvaSummaryCard({ provaSummary }: ProvaSummaryProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Color de fondo en función de position (si existe)
  let bgColor = theme === "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";
  // if (provaSummary.position === 1) bgColor = theme === "dark" ? "rgba(255, 221, 51, 1)" : "rgba(255, 255, 0, 1)";
  // else if (provaSummary.position === 2) bgColor = "rgba(169, 169, 169, 1)";
  // else if (provaSummary.position === 3) bgColor = "rgba(255, 165, 0, 1)";

  const gradient = `linear-gradient(90deg, rgba(0, 0, 0, 0), ${bgColor} 26%)`;

  const handleClick = () => {
    navigate(`/prova?provaId=${provaSummary.id}`);
  };

  return (
    <motion.div
      onClick={handleClick}
      className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg mb-2 cursor-pointer"
      style={{ background: bgColor }}
      whileHover={{ scale: 1.02 }}
    >
      {!provaSummary.participates && (
        <div className="absolute z-20 inset-0 h-full w-full flex items-center justify-center dark:bg-black/60 bg-white/60">
          <h1 className="font-extrabold text-4xl">NO PARTICIPA</h1>
        </div>
      )}

      {/* Imagen de fondo */}
      {provaSummary.imageUrl && (
        <>
          <img
            src={provaSummary.imageUrl}
            alt={`${provaSummary.name}`}
            className="absolute inset-0 object-cover w-8/12 h-full"
          />
          <div className="absolute inset-0 dark:bg-black/50 bg-white/40" />
        </>
      )}

      {/* Fondo de color/gradiente lateral */}
      <div className="absolute inset-0 h-full left-[50%] right-0" style={{ background: gradient }} />

      {/* Contenido */}
      <div className="relative flex-1 z-10 flex flex-col justify-center gap-5 items-center h-full p-4 dark:text-white text-gray-900">
        <div className="w-full flex flex-row justify-between items-center">
          <div className="text-left">
            <p className="text-2xl font-bold">{provaSummary.name}</p>
            {provaSummary.startDate && (
              <Badge variant="secondary" className="text-sm font-medium rounded-4xl">
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

          <div>
            <PenyaProvaResult prova={provaSummary} />
          </div>

        </div>


        {/* Badge: si hay points los muestro; si no, se puede ocultar o mostrar otra info */}
        {typeof provaSummary.result === "number" && provaSummary.result > -1 ? (
          <Card className="p-2 flex flex-row gap-2 w-fit items-center">
            {provaSummary.position && 
                <p className="text-xl font-bold">
                  {provaSummary.position === 1 && <Trophy fill="yellow" color="yellow" />}
                  {provaSummary.position === 2 && <Trophy fill="gray" color="gray" />}
                  {provaSummary.position === 3 && <Trophy fill="orange" color="orange" />}
                  {provaSummary.position > 3 ? `Pos. ${provaSummary.position}.` : null}
                </p>}
            {provaSummary.points && <>
              <Separator orientation="vertical" />
              <p className="text-xl font-bold">+{provaSummary.points} punts</p>
            </>}
          </Card>
        ) : null}
      </div>
    </motion.div>
  );
}
