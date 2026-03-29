import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PointsRange } from "@/interfaces/interfaces";
import { Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const maxPoints = Math.max(...value.map((r) => r.points), 1);

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {value?.map((range, index) => {
          const intensity = range.points / maxPoints;
          return (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card"
            >
              {/* Rank badge */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {index + 1}
              </span>

              {/* From → To */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Input
                  className="w-14 text-center h-8 text-sm px-1"
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
                    if (
                      isNaN(parsed) ||
                      parsed <= 0 ||
                      !Number.isFinite(parsed)
                    ) {
                      toast.error(
                        "El valor de 'des de' ha de ser un número positiu."
                      );
                      return;
                    }
                    handleFieldChange(index, "from", parsed);
                  }}
                />
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <Input
                  className="w-14 text-center h-8 text-sm px-1"
                  type="number"
                  min={range.from}
                  placeholder="∞"
                  value={Number.isFinite(range.to) ? range.to : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.trim() === "") {
                      const isLast = index === value.length - 1;
                      if (!isLast) {
                        toast.error("Només l'últim rang pot ser infinit.");
                        return;
                      }
                      handleFieldChange(index, "to", Infinity);
                      return;
                    }
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
                    handleFieldChange(index, "to", parsed);
                  }}
                />
              </div>

              {/* Points */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Input
                  className={cn(
                    "w-14 text-center h-8 text-sm font-semibold px-1",
                    intensity > 0.7 &&
                      "text-amber-500 border-amber-500/50 focus-visible:ring-amber-500/30",
                    intensity > 0.4 &&
                      intensity <= 0.7 &&
                      "text-blue-400 border-blue-400/50 focus-visible:ring-blue-400/30"
                  )}
                  type="number"
                  value={range.points}
                  onChange={(e) =>
                    handleFieldChange(
                      index,
                      "points",
                      parseInt(e.target.value)
                    )
                  }
                />
                <span className="text-xs text-muted-foreground w-5">pts</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addRange}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Afegir rang
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={removeRange}
          className="gap-1.5"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={removeAllRange}
          className="gap-1.5 ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar tots
        </Button>
      </div>
    </div>
  );
}
