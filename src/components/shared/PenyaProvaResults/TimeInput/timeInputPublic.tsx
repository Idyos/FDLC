// src/components/timeInputPublic.tsx
import React from "react";
import { formatHHMMSS, TimeInputProps } from "./timeInput";
import { Card } from "@/components/ui/card";

export const TimeInputPublic: React.FC<TimeInputProps> = ({
  value: valueProp,
}) => {
  const seconds = valueProp && valueProp !== "" ? parseInt(valueProp) : -1;
  const display = seconds >= 0 ? formatHHMMSS(seconds) : "--:--:--";

  return (
      <Card
        aria-label="Temps en HH:MM:SS"
        className="p-2.5 min-w-20 justify-center text-center"
      >
        {display}
      </Card>
  );
};