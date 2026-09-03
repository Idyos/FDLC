import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { secondsToParts, partsToSeconds, TimeInputProps } from "./timeInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_DIGITS = 9; // marge ampli per a hores (fins a 5 xifres, més que suficient)

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
 * Format dels dígits tal com es van escrivint, a l'engròs (com un cronòmetre): els últims
 * 4 dígits sempre es mostren com MM:SS —poden superar 59 mentre s'escriu, sense
 * arrodonir—, i la resta són hores. No es normalitza (el total en segons que s'emet via
 * `digitsToSeconds` ja és correcte igualment, arrodonir aquí només desalinearia el
 * desplaçament de dígits que l'usuari veu).
 */
function digitsToDisplay(raw: string): string {
  const padded = raw.length < 4 ? raw.padStart(4, "0") : raw;
  const last4 = padded.slice(-4);
  const hoursDigits = padded.slice(0, -4);
  const hours = hoursDigits === "" ? "0" : String(parseInt(hoursDigits, 10));
  return `${hours}:${last4.slice(0, 2)}:${last4.slice(2, 4)}`;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<string>("");
  // Últim total que hem emès nosaltres mateixos: distingeix un canvi extern de `value`
  // (canvi de penya, valor recarregat des de Firestore...) de l'eco del nostre propi
  // onChange —que en molts usos es reflecteix de seguida al prop `value`—, que no ha de
  // resincronitzar rawDigits mentre l'usuari està escrivint (perdria el buffer sense
  // arrodonir i el desplaçament deixaria de coincidir amb el que veu l'usuari).
  const lastEmittedRef = useRef<number>(totalSeconds);

  useEffect(() => {
    if (totalSeconds === lastEmittedRef.current) return;
    lastEmittedRef.current = totalSeconds;
    setRawDigits(totalSeconds >= 0 ? secondsToDigits(totalSeconds) : "");
  }, [totalSeconds]);

  const display = rawDigits === "" ? "" : digitsToDisplay(rawDigits);

  // El cursor sempre va al final: així, tapis on tapis, cada dígit nou (o
  // Backspace) actua sobre l'últim dígit, igual que un cronòmetre.
  useLayoutEffect(() => {
    displayRef.current = display;
    const el = inputRef.current;
    if (el) el.setSelectionRange(display.length, display.length);
  }, [display]);

  function emit(next: number) {
    lastEmittedRef.current = next;
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

  function applyDigits(next: string) {
    const trimmed = next.slice(0, MAX_DIGITS);
    setRawDigits(trimmed);
    emit(trimmed === "" ? -1 : digitsToSeconds(trimmed));
  }

  // El valor mostrat sempre és el format "H:MM:SS". En lloc d'interceptar `keydown`
  // (que als teclats virtuals mòbils sovint arriba com key="Unidentified" i mai es
  // dispara si l'input és readOnly, deixant el teclat sense aparèixer), comparem el text
  // abans/després de cada canvi contra `displayRef` —el text exacte que hi havia, no un
  // recàlcul, que podria no coincidir dígit a dígit per culpa dels zeros inicials
  // d'hores—: si el nou text comença pel text anterior, la resta són dígits afegits al
  // final; si l'anterior comença pel nou, s'ha esborrat l'últim caràcter. Funciona igual
  // amb teclat físic, virtual o retallar/enganxar.
  function onValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    const prevValue = displayRef.current;

    if (newValue.length > prevValue.length && newValue.startsWith(prevValue)) {
      const added = newValue.slice(prevValue.length).replace(/\D/g, "");
      if (added) applyDigits(rawDigits + added);
    } else if (newValue.length < prevValue.length && prevValue.startsWith(newValue)) {
      applyDigits(rawDigits.slice(0, -1));
    } else {
      // Selecció reemplaçada, enganxat sobre text seleccionat, etc: partim de zero amb
      // els dígits que hi hagi al camp.
      applyDigits(newValue.replace(/\D/g, ""));
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      applyDigits("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        className="w-28 text-center font-mono tabular-nums cursor-text"
        placeholder="-:--:--"
        value={display}
        onChange={onValueChange}
        onKeyDown={onKeyDown}
        onBlur={() => commit(rawDigits)}
      />

      {rawDigits !== "" && (
        <Button
          onClick={() => {
            applyDigits("");
            onBlur?.("");
          }}
        >
          Llimpiar
        </Button>
      )}
    </div>
  );
};
