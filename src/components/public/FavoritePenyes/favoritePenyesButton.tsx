import { useEffect, useRef, useState } from "react";
import { X, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { getRankingRealTime } from "@/services/database/publicDbService";
import { PenyaInfo } from "@/interfaces/interfaces";

export default function FavoritePenyesButton() {
  const { favoritePenyes, addFavoritePenya, removeFavoritePenya, clearFavoritePenyes, isFavorite, isFull } =
    useFavoritePenyes();
  const { selectedYear } = useYear();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allPenyes, setAllPenyes] = useState<PenyaInfo[]>([]);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch all penyes once when panel opens
  useEffect(() => {
    if (!open) return;
    const unsub = getRankingRealTime(selectedYear, (data) => {
      setAllPenyes(data);
      unsub();
    });
    return () => unsub();
  }, [open, selectedYear]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const searchResults = search.trim().length > 0
    ? allPenyes.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase()) && !isFavorite(p.id)
      )
    : [];

  const buttonLabel =
    favoritePenyes.length > 0
      ? favoritePenyes.map((f) => f.name).join(" · ")
      : null;

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        className="flex items-center gap-1.5 max-w-[200px]"
        onClick={() => setOpen((v) => !v)}
      >
        <Star className="h-4 w-4 shrink-0" />
        {buttonLabel ? (
          <span className="truncate text-sm">{buttonLabel}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Penyes guardades</span>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-white dark:bg-gray-900 shadow-lg p-3 flex flex-col gap-2"
        >
          {/* Current favorites */}
          {favoritePenyes.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {favoritePenyes.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-gray-100 dark:bg-gray-800"
                >
                  <span className="text-sm font-medium truncate">{f.name}</span>
                  <button
                    onClick={() => removeFavoritePenya(f.id)}
                    className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Eliminar ${f.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-1">No hi ha penyes guardades</p>
          )}

          {/* Search to add */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder={isFull ? "Llista plena (màx. 3)" : "Buscar penya per afegir..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isFull}
            />
          </div>

          {searchResults.length > 0 && (
            <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      addFavoritePenya({ id: p.id, name: p.name });
                      setSearch("");
                    }}
                    disabled={isFull}
                    className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {search.trim().length > 0 && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              {isFull ? "Llista plena" : "No s'han trobat penyes"}
            </p>
          )}

          {/* Remove all */}
          {favoritePenyes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => {
                clearFavoritePenyes();
                setSearch("");
              }}
            >
              Eliminar totes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
