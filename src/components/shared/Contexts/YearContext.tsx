// YearContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

type YearContextType = {
  previousSelectedYear: number;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
};

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const storedYear = sessionStorage.getItem("selectedYear");

  const yearParam = searchParams.get("year");
  const parsedYearParam = yearParam ? parseInt(yearParam) : NaN;

  const initialYear = !isNaN(parsedYearParam)
    ? parsedYearParam
    : storedYear
      ? parseInt(storedYear)
      : currentYear;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const previousYearRef = useRef<number>(initialYear);

  useEffect(() => {
    sessionStorage.setItem("selectedYear", selectedYear.toString());
  }, [selectedYear]);

  // Si l'enllaç inclou ?year=..., aquest sempre té prioritat sobre l'any
  // emmagatzemat/seleccionat prèviament (p. ex. algú comparteix l'enllaç
  // d'una prova d'un altre any).
  useEffect(() => {
    if (yearParam === null) return;
    const parsed = parseInt(yearParam);
    if (isNaN(parsed)) return;

    setSelectedYear((current) => {
      if (current === parsed) return current;
      previousYearRef.current = current;
      return parsed;
    });
  }, [yearParam]);

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