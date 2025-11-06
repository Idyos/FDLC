import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ParticipatingPenya } from "@/interfaces/interfaces";


type PenyesGridProps = {
  items: ParticipatingPenya[];
  checkedByIndex: (index: number) => boolean;
  onToggle: (index: number, checked: boolean) => void;
};

/**
 * Grid reutilizable para mostrar las penyes seleccionables.
 * Cada penya se representa con un checkbox dentro de un Card.
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
      {items.map((penya, index) => (
        <Card
          key={penya.penyaId}
          className="h-15 flex flex-row items-center justify-start space-x-2 px-3 py-2"
        >
          <Checkbox
            id={`penya-${index}`}
            checked={checkedByIndex(index)}
            onCheckedChange={(checked) => onToggle(index, checked === true)}
          />
          <Label
            htmlFor={`penya-${index}`}
            className="text-sm font-medium leading-none truncate"
            title={penya.name}
          >
            {penya.name}
          </Label>
        </Card>
      ))}
    </div>
  );
}
