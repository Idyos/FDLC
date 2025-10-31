import { PenyaProvaSummary } from "@/interfaces/interfaces";
import { TimeRollingInput } from "../PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "../PenyaProvaResults/PointsInput/pointsInput";

interface PenyaProvaResultProps {
  prova: PenyaProvaSummary;
}

export default function PenyaProvaResult({ prova }: PenyaProvaResultProps) {
    const renderInput = () => {
        switch (prova.challengeType) {
            case "Temps":
            return (
                <TimeRollingInput
                    value={prova.result || 0}
                    maxHours={3}
                />
            );
            case "Punts":
              return (
                <PointsInput
                    value={prova.result || 0}
                />
              );
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
