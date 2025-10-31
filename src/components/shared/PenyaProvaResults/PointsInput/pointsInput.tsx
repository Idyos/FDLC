import { Input } from "@/components/ui/input";
import { useAuth } from "@/routes/admin/AuthContext";
import React from "react";
import { useLocation } from "react-router-dom";


export type PointsInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
};

export const PointsInput: React.FC<PointsInputProps> = (props) => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user !== null && location.pathname.startsWith("/admin");

    return (
        <Input
          type="number"
          readOnly={!isAdmin}
          className="text-center text-lg px-4 py-2 rounded-md   bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
          value={props.value ?? 0}
          onChange={(e) => {
            const newValue = parseInt(e.target.value);
            if (!isNaN(newValue)) {
              props.onChange?.(newValue);
            }
          }}
            onBlur={() => props.onBlur?.(props.value ?? 0)}
        />
    );
};

