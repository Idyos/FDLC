import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PointsRange } from "@/interfaces/interfaces";

type PointsRangeEditorProps = {
  value: PointsRange[];
  onChange: (next: PointsRange[]) => void;
  challengeType?: string;
};

/**
 * Editor visual y compacto de rangos de puntos.
 * Permite añadir y eliminar rangos, con validación simple.
 */
export default function PointsRangeEditor({
  value,
  onChange,
  challengeType,
}: PointsRangeEditorProps) {
  const handleFieldChange = (
    index: number,
    key: keyof PointsRange,
    val: number
  ) => {
    const updated = value.map((range, i) =>
      i === index ? { ...range, [key]: val } : range
    );
    onChange(updated);
  };

  const addRange = () => {
    if (challengeType === "Participació" && value.length > 0) {
      toast.warning(
        "No es pot afegir un rang més de punts, el tipus de prova és 'Participació'"
      );
      return;
    }

    if (value.length > 0) {
      const last = value[value.length - 1];
      const newRange = {
        from: last.to + 1,
        to: last.to + 1,
        points: 1,
      };
      onChange([...value, newRange]);
    } else {
      onChange([{ from: 1, to: 1, points: 1 }]);
    }
  };

  const removeRange = () => {
    if (value.length > 1) {
      onChange(value.slice(0, -1));
    } else {
      toast.error("No es pot eliminar el rang de punts, és l'únic que hi ha");
    }
  };

  return (
    <div>
      {value?.map((range, index) => (
        <div
          key={index}
          className="flex flex-row items-center gap-3 mb-2 text-sm"
        >
          <p>Des de:</p>
          <Input
            className="max-w-16"
            type="number"
            min={1}
            max={range.to}
            value={range.from}
            onChange={(e) =>
              handleFieldChange(index, "from", parseInt(e.target.value))
            }
          />
          <p>fins a:</p>
          <Input
            className="max-w-16"
            type="number"
            min={range.from}
            value={range.to}
            onChange={(e) =>
              handleFieldChange(index, "to", parseInt(e.target.value))
            }
          />
          <p>guanyaran:</p>
          <Input
            className="max-w-16"
            type="number"
            value={range.points}
            onChange={(e) =>
              handleFieldChange(index, "points", parseInt(e.target.value))
            }
          />
          <p>punts</p>
        </div>
      ))}

      <div className="flex gap-3 mt-3">
        <Badge
          className="hover:cursor-pointer select-none"
          onClick={addRange}
        >
          +
        </Badge>
        <Badge
          className="hover:cursor-pointer select-none"
          onClick={removeRange}
        >
          -
        </Badge>
      </div>
    </div>
  );
}
