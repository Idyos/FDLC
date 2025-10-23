import React, { useEffect, useMemo, useRef, useState } from "react";

type TimeInputProps = {
  /** Valor en segundos (controlado). Si se omite, el componente es no controlado. */
  valueSeconds?: number;
  /** Callback cuando cambia el valor en segundos. */
  onChangeSeconds?: (seconds: number) => void;
  /** Horas máximas permitidas (por defecto 99). */
  maxHours?: number;
  /** Deshabilitado */
  disabled?: boolean;
  /** className para estilos */
  className?: string;
  /** aria-label alternativo */
  ariaLabel?: string;
  
  onBlur?: (seconds: number) => void;

};

/** Formatea a HH:MM:SS (siempre 2 dígitos por bloque) */
function formatHHMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/** Convierte HHMMSS (6 dígitos) → segundos. Admite “carry” base 60. */
function fromBCD6ToSeconds(bcd: string): number {
  // bcd = "HHMMSS" (6 dígitos)
  const h = parseInt(bcd.slice(0, 2), 10) || 0;
  let m = parseInt(bcd.slice(2, 4), 10) || 0;
  let s = parseInt(bcd.slice(4, 6), 10) || 0;

  // Normaliza por si MM/SS exceden 59 (carry a base 60)
  if (s >= 60) {
    m += Math.floor(s / 60);
    s = s % 60;
  }
  if (m >= 60) {
    const extraH = Math.floor(m / 60);
    m = m % 60;
    return (h + extraH) * 3600 + m * 60 + s;
  }
  return h * 3600 + m * 60 + s;
}

/** Convierte segundos → "HHMMSS" (6 dígitos) con límite 99:59:59 si hace falta */
function toBCD6FromSeconds(totalSeconds: number, clampHoursTo = 99): string {
  let s = Math.max(0, Math.floor(totalSeconds || 0));
  let hh = Math.floor(s / 3600);
  let mm = Math.floor((s % 3600) / 60);
  let ss = s % 60;
  if (hh > clampHoursTo) {
    // Cap a horas máximas
    hh = clampHoursTo;
    mm = 59;
    ss = 59;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}${pad(mm)}${pad(ss)}`;
}

/**
 * TimeRollingInput
 * Muestra HH:MM:SS. Al teclear dígitos (0-9) “corre” hacia la izquierda y añade al final.
 * Backspace/Delete: corre hacia la derecha e inserta 0 al principio.
 * Esc: limpia al 00:00:00.
 * Pegar: procesa todos los dígitos en orden.
 */
export const TimeRollingInput: React.FC<TimeInputProps> = ({
  valueSeconds,
  onChangeSeconds,
  maxHours = 99,
  disabled,
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    const { key } = e;

    // Solo gestionamos nosotros el input -> prevenimos entrada de texto.
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
    if (disabled) return;
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
        disabled={disabled}
        className={
          className ??
          "w-28 px-3 py-2 rounded-md border border-gray-300 font-mono text-center " +
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 "
        }
      />
      {!disabled && seconds > 0 && (
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
