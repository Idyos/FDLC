// YearSelector.tsx
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { getYears } from "@/services/database/publicDbService";
import { createYear } from "@/services/database/Admin/adminDbServices";
import { useYear } from "../shared/Contexts/YearContext";
import { useAuth } from "@/routes/admin/AuthContext";

export default function YearSelector() {
  const [years, setYears] = useState<number[]>([]);
  const { selectedYear, setSelectedYear } = useYear();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    getYears(
      (fetchedYears) => setYears(fetchedYears),
      (error) => console.error("Error fetching years:", error)
    );
  }, []);

  const handleCreateYear = async () => {
    const yearValue = parseInt(newYear, 10);

    if (!newYear.trim() || isNaN(yearValue)) {
      toast.warning("Introdueix un any vàlid.");
      return;
    }

    if (yearValue >= currentYear) {
      toast.warning(`L'any ha de ser anterior a ${currentYear}.`);
      return;
    }

    if (years.includes(yearValue)) {
      toast.warning("Aquest any ja existeix.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createYear(yearValue);
      setYears((prev) => [...prev, yearValue].sort((a, b) => b - a));
      setSelectedYear(yearValue);
      toast.success(`Any ${yearValue} creat correctament.`);
      setIsDialogOpen(false);
      setNewYear("");
    } catch {
      // L'error ja es notifica dins de createYear
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full" variant="outline" size="sm">
            {selectedYear}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {years.map((year) => (
            <DropdownMenuItem onClick={() => setSelectedYear(year)} key={year}>
              {year}
            </DropdownMenuItem>
          ))}
          {user && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Afegir any
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {user && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Afegir any anterior</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Crea un nou any per gestionar-hi penyes i proves. Ha de ser anterior a {currentYear}.
            </DialogDescription>
            <div className="grid gap-2 py-2">
              <Label htmlFor="new-year-input">Any</Label>
              <Input
                id="new-year-input"
                type="number"
                max={currentYear - 1}
                placeholder={`p. ex. ${currentYear - 1}`}
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateYear();
                }}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateYear} disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" />}
                Crear any
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
