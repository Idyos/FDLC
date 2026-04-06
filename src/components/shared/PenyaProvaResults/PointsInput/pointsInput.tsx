import { isAdmin } from "@/services/authService";
import React from "react";
import { PointsInputAdmin } from "./pointsInputAdmin";
import { PointsInputPublic } from "./pointsInputPublic";


export type PointsInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: string) => void;
};

export const PointsInput: React.FC<PointsInputProps> = (props) => {
  const admin = isAdmin();
  return admin ? <PointsInputAdmin {...props} /> : <PointsInputPublic {...props} />;

};

