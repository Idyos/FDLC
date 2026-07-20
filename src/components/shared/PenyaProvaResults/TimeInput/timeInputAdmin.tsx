import React, { useEffect, useState } from "react";
import { secondsToParts, partsToSeconds, formatHMS, TimeInputProps } from "./timeInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_DIGITS = 9; // marge ampli per a hores (fins a 5 xifres, més que suficient)
const NAV_KEYS = ["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];

/** Interpreta una seqüència de dígits escrits d'esquerra a dreta com HH...MMSS (min/seg sempre als últims 4 dígits) */
function digitsToSeconds(raw: string): number {
  const padded = raw.length < 4 ? raw.padStart(4, "0") : raw;
  const last4 = padded.slice(-4);
  const hours = parseInt(padded.slice(0, -4) || "0", 10) || 0;
  const minutes = parseInt(last4.slice(0, 2), 10) || 0;
  const seconds = parseInt(last4.slice(2, 4), 10) || 0;
  return partsToSeconds({ hours, minutes, seconds });
}

function secondsToDigits(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  const full = `${hours}${pad(minutes, 2)}${pad(seconds, 2)}`;
  return String(Number(full));
}

/**
 * Input de temps a l'engròs: es tecleja com un cronòmetre. Cada dígit (0-9) entra per la
 * dreta i "empeny" la resta cap a l'esquerra (min/seg sempre agafen els últims 4 dígits,
 * la resta són hores, sense límit). Backspace esborra l'últim dígit. Escapa neteja el camp.
 */
export const TimeInputAdmin: React.FC<TimeInputProps> = ({
  value: valueProp,  // string | undefined: "" o total en segons, ex: "109443"
  onChange,
  ariaLabel = "Temps (hores:minuts:segons)",
  onBlur,
}) => {
  const isControlled = valueProp !== undefined;
  const parsedProp = valueProp && valueProp !== "" ? parseInt(valueProp, 10) : -1;
  const [internalSeconds, setInternalSeconds] = useState<number>(parsedProp);
  const totalSeconds = isControlled ? parsedProp : internalSeconds;

  const [rawDigits, setRawDigits] = useState<string>(totalSeconds >= 0 ? secondsToDigits(totalSeconds) : "");

  // Resincronitza si el valor ve de fora (canvi de penya, valor guardat, etc.)
  useEffect(() => {
    setRawDigits(totalSeconds >= 0 ? secondsToDigits(totalSeconds) : "");
  }, [totalSeconds]);

  function emit(next: number) {
    const str = next <= -1 ? "" : String(next);
    if (isControlled) onChange?.(str);
    else {
      setInternalSeconds(next);
      onChange?.(str);
    }
  }

  function commit(raw: string) {
    onBlur?.(raw === "" ? "" : String(digitsToSeconds(raw)));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      if (rawDigits.length >= MAX_DIGITS) return;
      const next = rawDigits + e.key;
      setRawDigits(next);
      emit(digitsToSeconds(next));
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const next = rawDigits.slice(0, -1);
      setRawDigits(next);
      emit(next === "" ? -1 : digitsToSeconds(next));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRawDigits("");
      emit(-1);
    } else if (!NAV_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, MAX_DIGITS);
    if (digits === "") return;
    setRawDigits(digits);
    emit(digitsToSeconds(digits));
  }

  const display = rawDigits === "" ? "" : formatHMS(digitsToSeconds(rawDigits));

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        inputMode="numeric"
        readOnly
        aria-label={ariaLabel}
        className="w-28 text-center font-mono tabular-nums cursor-text"
        placeholder="-:--:--"
        value={display}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => commit(rawDigits)}
      />

      {rawDigits !== "" && (
        <Button
          onClick={() => {
            setRawDigits("");
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
