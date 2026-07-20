// src/components/timeInputPublic.tsx
import React from "react";
import { formatHMS, TimeInputProps } from "./timeInput";
import { Card } from "@/components/ui/card";

export const TimeInputPublic: React.FC<TimeInputProps> = ({
  value: valueProp,
}) => {
  const totalSeconds = valueProp && valueProp !== "" ? parseInt(valueProp, 10) : -1;
  const display = totalSeconds >= 0 ? formatHMS(totalSeconds) : "--:--:--";

  return (
      <Card
        aria-label="Temps (hores:minuts:segons)"
        className="p-2.5 min-w-20 justify-center text-center"
      >
        {display}
      </Card>
  );
};
