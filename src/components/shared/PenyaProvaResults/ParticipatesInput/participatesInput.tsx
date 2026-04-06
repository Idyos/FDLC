import { Checkbox } from "@/components/ui/checkbox";
import { isAdmin } from "@/services/authService";
import React from "react";


export type ParticipatesInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  onBlur?: (value: string) => void;
};

export const ParticipatesInput: React.FC<ParticipatesInputProps> = (props) => {
  const admin = isAdmin();
    return (
        <Checkbox
        className="scale-150"
          checked={props.value === "1"}
          onCheckedChange={admin ? (checked) => props.onChange?.(checked === true ? "1" : "") : undefined}
          onBlur={admin ? () => props.onBlur?.(props.value ?? "") : undefined}
        />
    );
};