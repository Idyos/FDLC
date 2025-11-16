// src/components/timeInputPublic.tsx
import React from "react";
import { formatHHMMSS, TimeInputProps } from "./timeInput";
import { Input } from "@/components/ui/input";

export const TimeInputPublic: React.FC<TimeInputProps> = ({
  value: valueSeconds = 0,
}) => {
  const display = formatHHMMSS(valueSeconds);

  return (
      <Input
        type="time"
        step={1}
        aria-label="Temps en HH:MM:SS"
        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        readOnly={true}
        value={valueSeconds === -1 ? "" : display}
        placeholder="--:--:--"
      />
  );
};