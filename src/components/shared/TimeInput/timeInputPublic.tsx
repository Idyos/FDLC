// src/components/timeInputPublic.tsx
import React from "react";
import { formatHHMMSS, TimeInputProps } from "./timeInput";

export const TimeInputPublic: React.FC<TimeInputProps> = ({
  valueSeconds = 0,
  className,
}) => {
  const display = formatHHMMSS(valueSeconds);

  return (
    <div
      className={
        className ??
        "text-center text-lg px-4 py-2 rounded-md   bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
      }
    >
      {display}
    </div>
  );
};