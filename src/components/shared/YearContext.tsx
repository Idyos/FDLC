// YearContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type YearContextType = {
  previousSelectedYear: number;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
};

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider = ({ children }: { children: React.ReactNode }) => {
  const currentYear = new Date().getFullYear();
  const storedYear = sessionStorage.getItem("selectedYear");
  const initialYear = storedYear ? parseInt(storedYear) : currentYear;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const previousYearRef = useRef<number>(initialYear);

  useEffect(() => {
    sessionStorage.setItem("selectedYear", selectedYear.toString());
  }, [selectedYear]);

  const changeYear = (year: number) => {
    previousYearRef.current = selectedYear; // ✅ guardas el valor anterior
    setSelectedYear(year);
  };

  return (
    <YearContext.Provider
      value={{
        previousSelectedYear: previousYearRef.current,
        selectedYear,
        setSelectedYear: changeYear,
      }}
    >
      {children}
    </YearContext.Provider>
  );
};

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error("useYear must be used within a YearProvider");
  }
  return context;
};