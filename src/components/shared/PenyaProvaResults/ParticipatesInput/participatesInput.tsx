import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/routes/admin/AuthContext";
import React from "react";
import { useLocation } from "react-router-dom";


export type ParticipatesInputProps = {
  value: boolean;
  onChange?: (value: boolean) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: boolean) => void;
};

export const ParticipatesInput: React.FC<ParticipatesInputProps> = (props) => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user !== null && location.pathname.startsWith("/admin");

    return (
        <Checkbox
          disabled={!isAdmin}
          checked={props.value}
          onCheckedChange={(checked) => props.onChange?.(checked === true)}
          onBlur={() => props.onBlur?.(props.value)}
        />
    );
};