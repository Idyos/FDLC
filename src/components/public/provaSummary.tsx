import { ProvaSummary, PenyaProvaSummary } from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import PenyaProvaResult from "../shared/Prova/penyaProvaResult";

type AnyProva = ProvaSummary | PenyaProvaSummary;

function isPenyaProvaSummary(prova: AnyProva): prova is PenyaProvaSummary {
  return "participates" in prova;
}

interface ProvaSummaryProps {
  provaSummary: AnyProva;
}

export default function ProvaSummaryCard({ provaSummary }: ProvaSummaryProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // position y points solo existen si es PenyaProvaSummary
  const isPenya = ("provaReference" in provaSummary);
  const position = isPenya ? (provaSummary as PenyaProvaSummary).position : undefined;
  const result   = isPenya ? (provaSummary as PenyaProvaSummary).result   : undefined;

  // Color de fondo en función de position (si existe)
  let bgColor = theme === "dark" ? "rgba(66, 66, 66, 1)" : "rgba(255, 255, 255, 1)";
  if (position === 1) bgColor = theme === "dark" ? "rgba(255, 221, 51, 1)" : "rgba(255, 255, 0, 1)";
  else if (position === 2) bgColor = "rgba(169, 169, 169, 1)";
  else if (position === 3) bgColor = "rgba(255, 165, 0, 1)";

  const gradient = `linear-gradient(90deg, rgba(0, 0, 0, 0), ${bgColor} 26%)`;

  const handleClick = () => {
    navigate(`/prova?provaId=${provaSummary.id}`);
  };

  return (
    <motion.div
      onClick={handleClick}
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer"
      style={{ background: bgColor }}
      whileHover={{ scale: 1.02 }}
    >
      {isPenyaProvaSummary(provaSummary) && !provaSummary.participates && (
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
      <div className="relative z-10 flex justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          <p className="text-2xl font-bold">{provaSummary.name}</p>
          {/* ejemplo: fechas si las tienes */}
          {provaSummary.startDate && (
            <Badge variant="secondary" className="mt-2 text-sm font-medium rounded-4xl">
              {provaSummary.startDate.toLocaleDateString()} | {provaSummary.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {provaSummary.finishDate 
              ? provaSummary.startDate.toLocaleDateString() == provaSummary.finishDate.toLocaleDateString()
                ? " - " + provaSummary.finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ` – ${provaSummary.finishDate.toLocaleDateString()} | ${provaSummary.finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ""}
            </Badge>
          )}
        </div>

        {/* Badge: si hay points los muestro; si no, se puede ocultar o mostrar otra info */}
        {typeof result === "number" ? (
          <PenyaProvaResult prova={provaSummary as PenyaProvaSummary} />
        ) : null}
      </div>
    </motion.div>
  );
}
