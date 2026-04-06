import { Input } from "@/components/ui/input";
import React from "react";


export type PointsInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: string) => void;
};

export const PointsInputAdmin: React.FC<PointsInputProps> = (props) => {
    return (
        <Input
          type="number"
            className="
              max-w-21
              text-center
              appearance-none
              [&::-webkit-inner-spin-button]:appearance-none
              [&::-webkit-outer-spin-button]:appearance-none
            "
          value={props.value ?? ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          onBlur={() => props.onBlur?.(props.value ?? "")}
        />
    );
};

