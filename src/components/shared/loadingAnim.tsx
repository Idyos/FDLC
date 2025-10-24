import * as Spinners from "react-spinners";
import { useMemo } from "react";
import { useTheme } from "../Theme/theme-provider";

export default function LoadingAnimation() {
  const { theme } = useTheme();
  const spinnerKeys = Object.keys(Spinners);

  const RandomSpinnerKey = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * spinnerKeys.length);
    return spinnerKeys[randomIndex];
  }, []);

  const SpinnerComponent = (Spinners as any)[RandomSpinnerKey];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <SpinnerComponent size={60} color={theme === "dark" ? "white" : "black"} />
    </div>
  );
}
