import React, { useMemo, useState } from "react";
import { formatHHMMSS, TimeInputProps } from "./timeInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const TimeInputAdmin: React.FC<TimeInputProps> = ({
  value: valueSeconds,  // string | undefined: "" o "3661"
  onChange: onChangeSeconds,
  ariaLabel = "Temps en HH:MM:SS",
  onBlur,
}) => {

  const isControlled = valueSeconds !== undefined;
  const parsedProp = valueSeconds && valueSeconds !== "" ? parseInt(valueSeconds) : -1;
  const [internalSeconds, setInternalSeconds] = useState<number>(parsedProp);
  const seconds = isControlled ? parsedProp : internalSeconds;

  // Conversión a HH:MM:SS excepto si es -1
  const display = useMemo(() => {
    if (seconds === -1) return "--:--:--";
    return formatHHMMSS(seconds);
  }, [seconds]);

  function emit(next: number) {
    const str = next <= -1 ? "" : String(next);
    if (isControlled) onChangeSeconds?.(str);
    else {
      setInternalSeconds(next);
      onChangeSeconds?.(str);
    }
  }

  // Convierte "HH:MM:SS" o "HH:MM" → segundos
  function parseTime(value: string): number {
    if (!value) return -1; // vacío → sin tiempo
    const parts = value.split(":").map((x) => parseInt(x));
    const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    return hh * 3600 + mm * 60 + ss;
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="time"
        step={1}
        aria-label={ariaLabel}     
        // si seconds === -1 → mostramos input vacío
        value={seconds === -1 ? "" : display}

        placeholder="--:--:--"

        onChange={(e) => {
          const nextSeconds = parseTime(e.target.value);
          emit(nextSeconds);
        }}

        onBlur={() => onBlur?.(seconds <= -1 ? "" : String(seconds))}
      />

      {seconds >= 0 && (
        <Button
          onClick={() => {
            emit(-1);
            onBlur?.("");
          }}
        >
          Llimpiar
        </Button>
      )}
    </div>
  );
};
