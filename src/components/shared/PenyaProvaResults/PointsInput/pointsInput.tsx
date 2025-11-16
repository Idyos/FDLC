import { Input } from "@/components/ui/input";
import { isAdmin } from "@/services/authService";
import React from "react";


export type PointsInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
};

export const PointsInput: React.FC<PointsInputProps> = (props) => {
  const admin = isAdmin();
    return (
        <Input
          type="number"
          readOnly={!admin}
            className="
              max-w-21 
              text-center 
              appearance-none
              [&::-webkit-inner-spin-button]:appearance-none 
              [&::-webkit-outer-spin-button]:appearance-none
            "
          // className="text-center text-4xl px-4 py-2 rounded-md max-w-[100px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
          value={props.value == -1 ? 0 : props.value}
          onChange={(e) => {

            const newValue = parseInt(e.target.value);
            if (!isNaN(newValue) && admin) {
              props.onChange?.(newValue);
            }
          }}
            onBlur={() => { if(admin) props.onBlur?.(props.value ?? 0) }}
        />
    );
};

