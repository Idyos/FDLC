// src/components/timeInputPublic.tsx
import React from "react";
import { formatHHMMSS, TimeInputProps } from "./timeInput";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const TimeInputPublic: React.FC<TimeInputProps> = ({
  value: valueSeconds = 0,
}) => {
  const display = formatHHMMSS(valueSeconds);

  return (
      <Card
        aria-label="Temps en HH:MM:SS"
        className="p-2.5 min-w-20 justify-center text-center"
      >
        {valueSeconds === -1 ? "--:--:--" : display}
      </Card>
  );
};