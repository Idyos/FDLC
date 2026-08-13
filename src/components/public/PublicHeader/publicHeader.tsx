import { ModeToggle } from "@/components/Theme/mode-toggle";
import YearSelector from "@/components/public/yearSelector";
import FavoritePenyesButton from "@/components/public/FavoritePenyes/favoritePenyesButton";

export default function PublicHeader() {
  return (
    <header className="md:hidden flex items-center justify-between md:justify-end gap-2 flex-wrap pl-2 pr-2 mt-5">
      <div className="w-[20%] min-w-[160px]">
        <YearSelector />
      </div>
      <div className="flex items-center gap-2">
        <div>
          <FavoritePenyesButton />
        </div>
        <div>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
