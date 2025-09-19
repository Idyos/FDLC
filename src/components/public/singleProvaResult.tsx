import {
  ProvaSummary,
  PenyaProvaSummary,
  SingleProvaResultData,
} from "@/interfaces/interfaces";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { TimeRollingInput } from "../shared/timeInput";
import { useState } from "react";

type AnyProvaResult = SingleProvaResultData;

interface SingleProvaSummaryProp {
  provaResultSummary: AnyProvaResult;
}

export default function SingleProvaResult({ provaResultSummary }: SingleProvaSummaryProp) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [secs, setSecs] = useState(0);

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
        <TimeRollingInput
          valueSeconds={secs}
          onChangeSeconds={setSecs}
          maxHours={3}
        />
      </div>
    </motion.div>
  );
}
