import { useEffect, useRef, useState } from "react";
import { Star, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { getRankingRealTime } from "@/services/database/publicDbService";
import { PenyaInfo } from "@/interfaces/interfaces";

interface SideFavoritePenyesProps {
  /** Whether the sidebar is currently in its wide (hover-expanded) state. */
  expanded: boolean;
  /** Notified whenever the favorites panel opens/closes, so the sidebar can stay expanded while it's open. */
  onOpenChange?: (open: boolean) => void;
}

export default function SideFavoritePenyes({ expanded, onOpenChange }: SideFavoritePenyesProps) {
  const { favoritePenyes, addFavoritePenya, removeFavoritePenya, clearFavoritePenyes, isFavorite, isFull } =
    useFavoritePenyes();
  const { selectedYear } = useYear();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allPenyes, setAllPenyes] = useState<PenyaInfo[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  const hasFavorites = favoritePenyes.length > 0;

  useEffect(() => {
    if (!open) return;
    const unsub = getRankingRealTime(selectedYear, (data) => {
      setAllPenyes(data);
      unsub();
    });
    return () => unsub();
  }, [open, selectedYear]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closePanel = () => {
    setOpen(false);
    setSearch("");
    onOpenChange?.(false);
  };

  const toggleOpen = () => {
    if (open) {
      closePanel();
    } else {
      setOpen(true);
      onOpenChange?.(true);
    }
  };

  const searchResults =
    search.trim().length > 0
      ? allPenyes.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) && !isFavorite(p.id))
      : [];

  return (
    <div ref={containerRef} className="flex flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label="Penyes guardades"
          title="Penyes guardades"
          className="relative flex w-full items-center gap-3 overflow-hidden rounded-full px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="relative shrink-0">
            <Star className="size-6 text-muted-foreground" strokeWidth={2} />
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {favoritePenyes.length}
            </span>
          </div>

          <span
            className={cn(
              "whitespace-nowrap text-sm font-medium text-muted-foreground transition-opacity duration-150",
              expanded ? "opacity-100 delay-75" : "opacity-0"
            )}
          >
            Penyes guardades
          </span>
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {hasFavorites ? (
            <ul className="flex flex-col gap-1">
              {favoritePenyes.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg bg-foreground/5 px-2 py-1.5 dark:bg-white/10"
                >
                  <span className="truncate text-sm font-medium">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFavoritePenya(f.id)}
                    aria-label={`Eliminar ${f.name}`}
                    className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-red-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">Encara no tens penyes guardades</p>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder={isFull ? "Llista plena (màx. 3)" : "Cercar penya..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isFull}
            />
          </div>

          {searchResults.length > 0 && (
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      addFavoritePenya({ id: p.id, name: p.name });
                      setSearch("");
                    }}
                    disabled={isFull}
                    className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {search.trim().length > 0 && searchResults.length === 0 && (
            <p className="px-1 text-center text-xs text-muted-foreground">
              {isFull ? "Llista plena" : "No s'han trobat penyes"}
            </p>
          )}

          {hasFavorites && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              onClick={clearFavoritePenyes}
            >
              Eliminar totes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
