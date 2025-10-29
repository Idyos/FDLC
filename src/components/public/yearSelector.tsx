// YearSelector.tsx
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getYears } from "@/services/database/publicDbService";
import { useYear } from "../shared/Contexts/YearContext";

export default function YearSelector() {
  const [years, setYears] = useState<number[]>([]);
  const { selectedYear, setSelectedYear } = useYear();

  useEffect(() => {
    getYears(
      (fetchedYears) => setYears(fetchedYears),
      (error) => console.error("Error fetching years:", error)
    );
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="min-w-fit w-[20%]" variant="outline" size="icon">
          {selectedYear}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {years.map((year) => (
          <DropdownMenuItem onClick={() => setSelectedYear(year)} key={year}>
            {year}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}