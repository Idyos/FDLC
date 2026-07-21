import { useLayoutEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { usePenyaStore } from "@/components/shared/Contexts/PenyaContext";
import BottomNavBar from "./bottomNavBar";
import { publicNavItems } from "./publicNavItems";

export default function PublicBottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addFavoritePenya, removeFavoritePenya, isFavorite, isFull } = useFavoritePenyes();
  const penya = usePenyaStore((state) => state.penya);

  const navBoxRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = navBoxRef.current;
    if (!el) return;

    const updateHeight = () => setNavHeight(el.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isMainPage = location.pathname === "/";
  const activeIndex = isMainPage ? Number(searchParams.get("tab") ?? 0) : -1;

  const handleChange = (index: number) => {
    if (isMainPage) {
      setSearchParams({ tab: String(index) }, { replace: true });
    } else {
      navigate(`/?tab=${index}`);
    }
  };

  const showFavoriteButton = location.pathname === "/penya" && penya.id.length > 0;
  const penyaIsFavorite = showFavoriteButton && isFavorite(penya.id);

  return (
    <div className="fixed inset-x-4 z-40 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-start gap-2 md:hidden">
      <div ref={navBoxRef} className="flex-1">
        <BottomNavBar items={publicNavItems} activeIndex={activeIndex} onChange={handleChange} />
      </div>

      {showFavoriteButton && (
        <button
          type="button"
          onClick={() =>
            penyaIsFavorite
              ? removeFavoritePenya(penya.id)
              : addFavoritePenya({ id: penya.id, name: penya.name })
          }
          disabled={!penyaIsFavorite && isFull}
          aria-label={penyaIsFavorite ? "Treure penya de les guardades" : "Guardar penya"}
          aria-pressed={penyaIsFavorite}
          style={navHeight != null ? { height: navHeight } : undefined}
          className={cn(
            "relative flex aspect-square shrink-0 items-center justify-center rounded-full border border-border/50",
            "bg-background/70 dark:bg-background/60",
            "backdrop-blur-xl backdrop-saturate-150",
            "shadow-lg shadow-black/10",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "disabled:opacity-40"
          )}
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              penyaIsFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
