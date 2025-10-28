import {
  SingleProvaResultData,
} from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { TimeRollingInput } from "../shared/TimeInput/timeInput";
import { useEffect, useRef, useState } from "react";

interface SingleProvaSummaryProp {
  provaResultSummary: SingleProvaResultData;
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="relative w-full h-36 rounded-2xl overflow-hidden shadow-lg mb-6 cursor-pointer"
      whileHover={{ scale: 1.02 }}
    >
      {/* Contenido */}
      <div className="relative z-10 flex justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left">
          <p className="text-4xl font-extrabold">{provaResultSummary.index}.</p>
          <p className="text-2xl font-bold">{provaResultSummary.penyaName}</p>
        </div>
        {renderInput()}
      </div>
    </motion.div>
  );
}
