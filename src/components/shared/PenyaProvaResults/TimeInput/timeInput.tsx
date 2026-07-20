import React from "react";
import { TimeInputPublic } from "./timeInputPublic";
import { isAdmin } from "@/services/authService";
import { TimeInputAdmin } from "./timeInputAdmin";

/** Parts d'un temps descompost (hores il·limitades, min/seg acotats) */
export type TimeParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

/** Descompon un total de segons en hores/min/seg. Les hores no tenen límit superior. */
export function secondsToParts(totalSeconds: number): TimeParts {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { hours, minutes, seconds };
}

/** Recompon hores/min/seg (sense límit d'hores) en un total de segons */
export function partsToSeconds({ hours, minutes, seconds }: TimeParts): number {
  const h = Math.max(0, Math.floor(hours || 0));
  const m = Math.max(0, Math.floor(minutes || 0));
  const s = Math.max(0, Math.floor(seconds || 0));
  return h * 3600 + m * 60 + s;
}

/** Formata un total de segons com "H:MM:SS" (hores sense límit ni zero-padding) */
export function formatHMS(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

export type TimeInputProps = {
  value?: string;  // "" = sense temps, altrament total en segons (ex: "109443" = 30h 24min 3s)
  onChange?: (seconds: string) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (seconds: string) => void;
};

export const TimeRollingInput: React.FC<TimeInputProps> = (props) => {
  const admin = isAdmin();
  return admin ? <TimeInputAdmin {...props} /> : <TimeInputPublic {...props} />;
};
