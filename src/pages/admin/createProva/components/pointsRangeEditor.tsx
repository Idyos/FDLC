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

  const removeAllRange = () => {
    const firstValue = value.length > 0 ? value[0] : null;
    const vales = firstValue ? [firstValue] : [];
    onChange(vales);
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
            value={Number.isFinite(range.from) ? range.from : ""}
            onChange={(e) => {
              const raw = e.target.value;

              if (raw.trim() === "") {
                toast.error("El camp 'des de' no pot estar buit.");
                return;
              }

              const parsed = parseInt(raw);

              if (isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
                toast.error("El valor de 'des de' ha de ser un número positiu.");
                return;
              }

              handleFieldChange(index, "from", parsed);
            }}
          />
          <p>fins a:</p>
          <Input
            className="max-w-16"
            type="number"
            min={range.from}
            value={Number.isFinite(range.to) ? range.to : ""}
            onChange={(e) => {
              const raw = e.target.value;

              // Caso 1: valor vacío → intentar poner Infinity
              if (raw.trim() === "") {
                const isLast = index === value.length - 1;

                if (!isLast) {
                  // Prohibido Infinity si NO es el último range
                  toast.error("Només l'últim rang pot ser infinit.");
                  return;
                }

                handleFieldChange(index, "to", Infinity);
                return;
              }

              // Caso 2: valor numérico
              const parsed = parseInt(raw);

              if (isNaN(parsed)) {
                const isLast = index === value.length - 1;

                if (!isLast) {
                  toast.error("Només l'últim rang pot ser infinit.");
                  return;
                }

                handleFieldChange(index, "to", Infinity);
                return;
              }

              // Número válido → guardar
              handleFieldChange(index, "to", parsed);
            }}
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
        <Badge
          className="hover:cursor-pointer select-none"
          onClick={removeAllRange}
        >
          Eliminar tots
        </Badge>
      </div>
    </div>
  );
}
