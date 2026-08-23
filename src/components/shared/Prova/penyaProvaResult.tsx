import { PenyaProvaSummary } from "@/interfaces/interfaces";
import { TimeRollingInput } from "../PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "../PenyaProvaResults/PointsInput/pointsInput";
import { distToFinalRoundName } from "@/utils/bracketCreator";
import { ChevronRight } from "lucide-react";

interface PenyaProvaResultProps {
  prova: PenyaProvaSummary;
}

export default function PenyaProvaResult({ prova }: PenyaProvaResultProps) {
    const renderInput = () => {
        switch (prova.challengeType) {
            case "Temps":
            return (
                <TimeRollingInput
                    value={prova.result ?? ""}
                />
            );
            case "Punts":
              return (
                <PointsInput
                    value={prova.result ?? ""}
                />
              );
            case "Rondes": {
              if (prova.lastRoundPlayed == null) return null;
              const label = prova.lastRoundPlayed === -1
                ? "Fase de grups"
                : distToFinalRoundName(prova.lastRoundPlayed);
              const advanced = prova.hasWon && prova.lastRoundPlayed !== 0 && prova.lastRoundPlayed !== -1;
              return (
                <div className="flex items-center gap-1 text-lg font-bold">
                  {label}
                  {advanced && <ChevronRight className="w-5 h-5" />}
                </div>
              );
            }
            default:
            return null;
        }
    };
  return (
    <>
    {renderInput()}
    </>
  );
}
