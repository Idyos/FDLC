import { Card } from "@/components/ui/card";
import { ParticipatingPenya } from "@/interfaces/interfaces";
import { cn } from "@/lib/utils";


type PenyesGridProps = {
  items: ParticipatingPenya[];
  checkedByIndex: (index: number) => boolean;
  onToggle: (index: number, checked: boolean) => void;
};

/**
 * Grid reutilizable para mostrar las penyes seleccionables.
 * Cada penya es una Card completa pulsable que actua com a checkbox.
 */
export default function PenyesGrid({
  items,
  checkedByIndex,
  onToggle,
}: PenyesGridProps) {
  if (!items.length)
    return (
      <p className="text-sm opacity-70 mt-2">
        No hi ha penyes disponibles per aquest any.
      </p>
    );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,_minmax(160px,_1fr))] gap-2 w-full mt-2">
      {items.map((penya, index) => {
        const checked = checkedByIndex(index);
        return (
          <Card
            key={penya.penyaId}
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onClick={() => onToggle(index, !checked)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onToggle(index, !checked);
              }
            }}
            className={cn(
              "h-15 flex flex-row items-center justify-center px-3 py-2 cursor-pointer select-none transition-colors",
              checked
                ? "bg-green-500/20 border-green-500 dark:bg-green-500/30 dark:border-green-500"
                : "bg-card hover:bg-accent"
            )}
          >
            <span
              className="text-sm font-medium leading-none truncate"
              title={penya.name}
            >
              {penya.name}
            </span>
          </Card>
        );
      })}
    </div>
  );
}
