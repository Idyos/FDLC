import { Card } from "@/components/ui/card";
import React from "react";


export type PointsInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  onBlur?: (value: string) => void;
};

export const PointsInputPublic: React.FC<PointsInputProps> = (props) => {
    return (
        <Card className="p-2.5 min-w-20 justify-center text-center" aria-label={props.ariaLabel || "Punts"}>
        {props.value || ""}
        </Card>
    );
};

