import { Checkbox } from "@/components/ui/checkbox";
import { isAdmin } from "@/services/authService";
import React from "react";


export type ParticipatesInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
};

export const ParticipatesInput: React.FC<ParticipatesInputProps> = (props) => {
  const admin = isAdmin();
    return (
        <Checkbox  
        className="scale-150"
          checked={props.value === 1}
          onCheckedChange={admin ? (checked) => props.onChange?.(checked === true ? 1 : -1) : undefined}
          onBlur={admin ? () => props.onBlur?.(props.value ?? 0) : undefined}
        />
    );
};