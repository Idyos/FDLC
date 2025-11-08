import { Checkbox } from "@/components/ui/checkbox";
import { isAdmin } from "@/services/authService";
import React from "react";


export type ParticipatesInputProps = {
  value: boolean;
  onChange?: (value: boolean) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: boolean) => void;
};

export const ParticipatesInput: React.FC<ParticipatesInputProps> = (props) => {
  const admin = isAdmin();
    return (
        <Checkbox
          disabled={!admin}
          checked={props.value}
          onCheckedChange={(checked) => props.onChange?.(checked === true)}
          onBlur={() => props.onBlur?.(props.value)}
        />
    );
};