import { isAdmin } from "@/services/authService";
import React from "react";
import { PointsInputAdmin } from "./pointsInputAdmin";
import { PointsInputPublic } from "./pointsInputPublic";


export type PointsInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
};

export const PointsInput: React.FC<PointsInputProps> = (props) => {
  const admin = isAdmin();
  return admin ? <PointsInputAdmin {...props} /> : <PointsInputPublic {...props} />;

};

