import { Card } from "@/components/ui/card";
import React from "react";


export type PointsInputProps = {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: number) => void;
};

export const PointsInputPublic: React.FC<PointsInputProps> = (props) => {
    return (
        <Card className="p-2.5 min-w-20 justify-center text-center" aria-label={props.ariaLabel || "Punts"}>
        {props.value == -1 ? 0 : props.value}
        </Card>
    );
};

