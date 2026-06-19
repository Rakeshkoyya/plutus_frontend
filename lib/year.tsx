"use client";

import { createContext, useContext, useEffect, useState } from "react";

function buildYears(center: string): string[] {
  // center like "2026-27"
  const startYear = parseInt(center.slice(0, 4), 10) || new Date().getFullYear();
  const years: string[] = [];
  for (let y = startYear - 2; y <= startYear + 2; y++) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return years;
}

const YearContext = createContext<{
  year: string;
  setYear: (y: string) => void;
  years: string[];
}>({ year: "", setYear: () => {}, years: [] });

export function YearProvider({
  defaultYear,
  children,
}: {
  defaultYear: string;
  children: React.ReactNode;
}) {
  const [year, setYearState] = useState(defaultYear);
  const years = buildYears(defaultYear);

  useEffect(() => {
    const saved = localStorage.getItem("fms_year");
    if (saved) setYearState(saved);
  }, []);

  const setYear = (y: string) => {
    setYearState(y);
    localStorage.setItem("fms_year", y);
  };

  return (
    <YearContext.Provider value={{ year, setYear, years }}>
      {children}
    </YearContext.Provider>
  );
}

export const useYear = () => useContext(YearContext);
