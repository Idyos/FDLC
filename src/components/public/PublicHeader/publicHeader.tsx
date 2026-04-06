import { ModeToggle } from "@/components/Theme/mode-toggle";
import YearSelector from "@/components/public/yearSelector";
import FavoritePenyesButton from "@/components/public/FavoritePenyes/favoritePenyesButton";

export default function PublicHeader() {
  return (
    <header className="flex items-center justify-between gap-2 flex-wrap pl-2 pr-2">
      <div className="w-[20%] min-w-[160px]">
        <YearSelector />
      </div>
      <div className="flex items-center gap-2">
        <FavoritePenyesButton />
        <ModeToggle />
      </div>
    </header>
  );
}
