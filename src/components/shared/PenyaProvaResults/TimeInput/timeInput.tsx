import React from "react";
import { TimeInputPublic } from "./timeInputPublic";
import { isAdmin } from "@/services/authService";
import { TimeInputAdmin } from "./timeInputAdmin";

/** Formatea a HH:MM:SS (siempre 2 dígitos por bloque) */
export function formatHHMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/** Convierte HHMMSS (6 dígitos) → segundos. Admite “carry” base 60. */
export function fromBCD6ToSeconds(bcd: string): number {
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
export function toBCD6FromSeconds(totalSeconds: number, clampHoursTo = 99): string {
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

export type TimeInputProps = {
  value?: number;
  onChange?: (seconds: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (seconds: number) => void;
};

// Funciones utilitarias (formatHHMMSS, etc.) siguen igual aquí
export * from "./timeInputAdmin"; // si quieres reusar helpers (formatHHMMSS, etc.)

export const TimeRollingInput: React.FC<TimeInputProps> = (props) => {
  const admin = isAdmin();
  return admin ? <TimeInputAdmin {...props} /> : <TimeInputPublic {...props} />;
};

