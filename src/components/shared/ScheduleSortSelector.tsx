import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SortMode } from "@/utils/sorting";

interface Props {
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  /** False for "Participació"-type challenges, which have no numeric result to sort by. */
  showResultSort: boolean;
}

export default function ScheduleSortSelector({ sortMode, setSortMode, showResultSort }: Props) {
  return (
    <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="time-asc">Ordre de joc ↑</SelectItem>
        <SelectItem value="time-desc">Ordre de joc ↓</SelectItem>
        <SelectItem value="name-asc">Nom A→Z</SelectItem>
        <SelectItem value="name-desc">Nom Z→A</SelectItem>
        {showResultSort && (
          <>
            <SelectItem value="result-asc">Resultat ↑</SelectItem>
            <SelectItem value="result-desc">Resultat ↓</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
