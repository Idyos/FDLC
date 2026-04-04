import { Input } from "@/components/ui/input";
import React from "react";


export type PointsInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
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
          // className="text-center text-4xl px-4 py-2 rounded-md max-w-[100px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
          value={props.value !== undefined && props.value !== -1 ? props.value : ""}
          onChange={(e) => {
            const str = e.target.value;
            if (str === "") {
              props.onChange?.(-1);
            } else {
              const newValue = parseInt(str);
              if (!isNaN(newValue)) {
                props.onChange?.(newValue);
              }
            }
          }}
            onBlur={() => {
              const val = props.value !== undefined && props.value !== -1 ? props.value : -1;
              props.onBlur?.(val);
            }}
        />
    );
};

