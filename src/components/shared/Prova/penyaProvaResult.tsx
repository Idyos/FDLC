import { PenyaProvaSummary } from "@/interfaces/interfaces";
import { TimeRollingInput } from "../TimeInput/timeInput";

interface PenyaProvaResultProps {
  prova: PenyaProvaSummary;
}

export default function PenyaProvaResult({ prova }: PenyaProvaResultProps) {
    const renderInput = () => {
        switch (prova.challengeType) {
            case "Temps":
            return (
                <TimeRollingInput
                    valueSeconds={prova.result || 0}
                    maxHours={3}
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
