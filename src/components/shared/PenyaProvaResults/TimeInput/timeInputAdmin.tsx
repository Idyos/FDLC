import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatHHMMSS, fromBCD6ToSeconds, TimeInputProps, toBCD6FromSeconds } from "./timeInput";

export const TimeInputAdmin: React.FC<TimeInputProps> = ({
  value: valueSeconds,
  onChange: onChangeSeconds,
  maxHours = 99,
  className,
  ariaLabel = "Tiempo en HH:MM:SS",
  onBlur,
}) => {
  const isControlled = typeof valueSeconds === "number";
  const [internalSeconds, setInternalSeconds] = useState<number>(valueSeconds ?? 0);
  const seconds = isControlled ? (valueSeconds as number) : internalSeconds;

  const bcd = useMemo(() => toBCD6FromSeconds(seconds, maxHours), [seconds, maxHours]);
  const display = useMemo(() => formatHHMMSS(seconds), [seconds]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isControlled) return;
    // Si el valor controlado cambia externamente, nos aseguramos de no sobreescribir
    // el estado interno (ya usamos directamente `seconds` de props).
  }, [isControlled, seconds]);

  function emit(secondsNext: number) {

    if (isControlled) {
      onChangeSeconds?.(secondsNext);
    } else {
      setInternalSeconds(secondsNext);
      onChangeSeconds?.(secondsNext);
    }
  }

  function pushDigit(d: string) {
    // bcd actual → shift left + append dígito
    const nextBCD = (bcd.slice(1) + d).slice(-6); // asegura longitud 6
    let nextSeconds = fromBCD6ToSeconds(nextBCD);

    // Clamp por horas máximas
    const maxSeconds = maxHours * 3600 + 59 * 60 + 59;
    if (nextSeconds > maxSeconds) nextSeconds = maxSeconds;

    emit(nextSeconds);
  }

  function popDigit() {
    // Backspace/Delete: corre a la derecha, insertando '0' al inicio
    const nextBCD = ("0" + bcd).slice(0, 6); // añade 0 al principio, corta a 6
    let nextSeconds = fromBCD6ToSeconds(nextBCD);
    const min = 0;
    if (nextSeconds < min) nextSeconds = min;
    emit(nextSeconds);
  }

  function clearAll() {
    emit(0);
    onBlur?.(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {

    const { key } = e;

    if (/^\d$/.test(key)) {
      e.preventDefault();
      pushDigit(key);
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      e.preventDefault();
      popDigit();
      return;
    }

    if (key === "Escape") {
      e.preventDefault();
      clearAll();
      return;
    }

    // Algunas teclas permitidas sin cambio (tab para navegar, etc.)
    // Evita que se edite manualmente el texto
    const allowed = ["Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(key)) return;

    // Bloquea el resto (letras, espacios, etc.)
    e.preventDefault();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text") || "";
    const digits = text.replace(/\D+/g, "");
    if (!digits) return;

    e.preventDefault();
    for (const d of digits) {
      pushDigit(d);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={display}
        readOnly
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
            return;
          }

          handleKeyDown(e);
        }}
        onPaste={handlePaste}
        onFocus={(e) => {
          const el = e.currentTarget;
          requestAnimationFrame(() => {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          });
        }}
        onBlur={() => {
          onBlur?.(seconds);
        }}
        inputMode="numeric"
        aria-label={ariaLabel}
        className={
          className ??
          "w-28 px-3 py-2 rounded-md border border-gray-300 font-mono text-center " +
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 "
        }
      />
      {seconds > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
          aria-label="Limpiar tiempo"
          title="Limpiar (Esc)"
        >
          Limpiar
        </button>
      )}
    </div>
  );
};