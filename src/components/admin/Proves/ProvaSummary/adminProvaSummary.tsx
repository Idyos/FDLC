import { motion } from "framer-motion";
import { ProvaSummary } from "@/interfaces/interfaces";
import { useNavigate } from "react-router-dom";

interface ProvaSummaryProps {
  provaSummary: ProvaSummary | null;
}

export default function AdminProvaSummary({ provaSummary }: ProvaSummaryProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/admin/prova?provaId=${provaSummary?.provaId}`);
  };

  return provaSummary != null && (
    <motion.div
      key={provaSummary?.provaId}
      whileHover={{ scale: 1.02 }}
      className="bg-white/30 relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
      onClick={handleClick}
    >
          <div className="cursor-pointer w-full h-full">
            {/* Imagen de fondo */}
            <img
              src={provaSummary?.imageUrl || undefined}
              alt="Imagen Prova"
              className="absolute object-cover"
              style={provaSummary?.imageUrl == null ? { display: "none" } : {}}
            />

            {/* Capa de overlay para oscurecer */}
            <div
              style={provaSummary?.imageUrl == null ? { display: "none" } : {}}
              className="absolute inset-0 dark:bg-black/50 bg-white/40"
            ></div>

            {/* Contenido */}
            <div className="relative z-10 flex justify-center items-center w-full h-full p-4 dark:text-white text-gray-900">
                <p className="text-center text-3xl font-bold">{provaSummary?.name}</p>
            </div>
          </div>
    </motion.div>
  );
}

