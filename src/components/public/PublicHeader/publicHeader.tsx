import { ModeToggle } from "@/components/Theme/mode-toggle";
import YearSelector from "@/components/public/yearSelector";
import FavoritePenyesButton from "@/components/public/FavoritePenyes/favoritePenyesButton";

export default function PublicHeader() {
  return (
    <header className="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <YearSelector />
      <div className="flex items-center gap-2">
        <FavoritePenyesButton />
        <ModeToggle />
      </div>
    </header>
  );
}
