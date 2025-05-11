// YearContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type YearContextType = {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
};

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider = ({ children }: { children: React.ReactNode }) => {
    const currentYear = new Date().getFullYear();
    const storedYear = sessionStorage.getItem("selectedYear");
    const initialYear = storedYear ? parseInt(storedYear) : currentYear;
  
    const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  
    useEffect(() => {
        sessionStorage.setItem("selectedYear", selectedYear.toString());
    }, [selectedYear]);
  
    return (
      <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
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