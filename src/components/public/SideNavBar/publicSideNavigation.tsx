import { useState } from "react";
import { Star } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFavoritePenyes } from "@/components/shared/Contexts/FavoritePenyesContext";
import { usePenyaStore } from "@/components/shared/Contexts/PenyaContext";
import YearSelector from "@/components/public/yearSelector";
import SideNavBar from "./sideNavBar";
import SideFavoritePenyes from "./sideFavoritePenyes";
import { publicNavItems } from "../BottomNavBar/publicNavItems";

export const SIDE_NAV_COLLAPSED_WIDTH = 80;
const SIDE_NAV_EXPANDED_WIDTH = 240;

export default function PublicSideNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addFavoritePenya, removeFavoritePenya, isFavorite, isFull } = useFavoritePenyes();
  const penya = usePenyaStore((state) => state.penya);
  const [expanded, setExpanded] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [favMenuOpen, setFavMenuOpen] = useState(false);
  const isExpanded = expanded || yearMenuOpen || favMenuOpen;

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
    <motion.nav
      aria-label="Navegació principal"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      initial={false}
      animate={{ width: isExpanded ? SIDE_NAV_EXPANDED_WIDTH : SIDE_NAV_COLLAPSED_WIDTH }}
      transition={{ type: "spring", stiffness: 400, damping: 38 }}
      style={{ width: SIDE_NAV_COLLAPSED_WIDTH }}
      className={cn(
        "hidden md:flex fixed inset-y-4 left-4 z-50 flex-col justify-between overflow-x-hidden overflow-y-auto rounded-[2.5rem]",
        "border border-border/50 backdrop-blur-xl backdrop-saturate-150 shadow-lg shadow-black/10",
        isExpanded ? "bg-background/95 dark:bg-background/95" : "bg-background/70 dark:bg-background/60"
      )}
    >
      <div className="p-3 pt-4">
        <YearSelector compact={!isExpanded} onOpenChange={setYearMenuOpen} />
      </div>

      <div className="flex flex-1 flex-col items-stretch justify-center">
        <SideNavBar items={publicNavItems} activeIndex={activeIndex} expanded={isExpanded} onChange={handleChange} />
      </div>

      {showFavoriteButton && (
        <div className="p-3">
          <button
            type="button"
            onClick={() =>
              penyaIsFavorite
                ? removeFavoritePenya(penya.id)
                : addFavoritePenya({ id: penya.id, name: penya.name })
            }
            disabled={!penyaIsFavorite && isFull}
            aria-label={penyaIsFavorite ? "Treure penya de les guardades" : "Guardar penya"}
            title={penyaIsFavorite ? "Treure penya de les guardades" : "Guardar penya"}
            aria-pressed={penyaIsFavorite}
            className={cn(
              "relative flex w-full items-center gap-3 overflow-hidden rounded-full px-3 py-3 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
            )}
          >
            <Star
              className={cn(
                "size-6 shrink-0 transition-colors",
                penyaIsFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
              strokeWidth={2}
            />
            <span
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-opacity duration-150",
                isExpanded ? "opacity-100 delay-75" : "opacity-0",
                penyaIsFavorite ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {penyaIsFavorite ? "Guardada" : "Guardar penya"}
            </span>
          </button>
        </div>
      )}

      <SideFavoritePenyes expanded={isExpanded} onOpenChange={setFavMenuOpen} />
    </motion.nav>
  );
}
