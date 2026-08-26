import { ModeToggle } from "@/components/Theme/mode-toggle";
import YearSelector from "@/components/public/yearSelector";
import FavoritePenyesButton from "@/components/public/FavoritePenyes/favoritePenyesButton";

export default function PublicHeader() {
  return (
    <header className="md:hidden flex items-center justify-between md:justify-end gap-2 flex-nowrap pl-2 pr-2 mt-5">
      <div className="shrink-0">
        <YearSelector />
      </div>
      <div className="flex items-center gap-2 min-w-0 shrink">
        <div className="min-w-0 shrink">
          <FavoritePenyesButton />
        </div>
        <div className="shrink-0">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
