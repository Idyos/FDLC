import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SubProvaConfig, WinDirection } from "@/interfaces/interfaces";

interface Props {
  open: boolean;
  subProva: SubProvaConfig | null;
  /** Quan és true (ja hi ha algun resultat marcat) només es pot editar el nom. */
  hasResults: boolean;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    challengeType?: SubProvaConfig["challengeType"];
    winDirection?: WinDirection;
    intervalMinutes?: number;
    maxPenyesPerSlot?: number;
    previousChallengeType?: SubProvaConfig["challengeType"];
  }) => Promise<void>;
}

type SubProvaType = "Temps" | "Punts" | "Rondes";

export default function AdminEditSubProvaDialog({ open, subProva, hasResults, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [challengeType, setChallengeType] = useState<SubProvaType>("Temps");
  const [winDirection, setWinDirection] = useState<WinDirection>("ASC");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0);
  const [maxPenyesPerSlot, setMaxPenyesPerSlot] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // El tipus "Participació" no es pot crear ni triar des d'aquest formulari
  // (només Temps/Punts/Rondes); si una subprova heretada el té igualment,
  // no oferim canviar-lo per no substituir-lo per un valor no representat.
  const canEditType = !hasResults && subProva?.challengeType !== "Participació";

  useEffect(() => {
    if (!open || !subProva) return;
    setName(subProva.name);
    if (subProva.challengeType !== "Participació") setChallengeType(subProva.challengeType);
    setWinDirection(subProva.winDirection === "NONE" ? "ASC" : subProva.winDirection);
    setIntervalMinutes(subProva.intervalMinutes ?? 0);
    setMaxPenyesPerSlot(subProva.maxPenyesPerSlot ?? 0);
  }, [open, subProva]);

  const handleSave = async () => {
    if (!name.trim() || !subProva) return;
    setLoading(true);
    try {
      await onSave(
        !canEditType
          ? { name: name.trim() }
          : {
              name: name.trim(),
              challengeType,
              winDirection: challengeType === "Rondes" ? "ASC" : winDirection,
              intervalMinutes: challengeType === "Rondes" ? undefined : intervalMinutes || undefined,
              maxPenyesPerSlot: challengeType === "Rondes" ? undefined : maxPenyesPerSlot || undefined,
              previousChallengeType: subProva.challengeType,
            }
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar subprova</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-subprova-name">Nom *</Label>
            <Input
              id="edit-subprova-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ex. Prova de velocitat"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {!canEditType ? (
            <p className="text-xs text-muted-foreground">
              {hasResults
                ? "Aquesta subprova ja té resultats marcats, així que només se'n pot editar el nom."
                : "El tipus d'aquesta subprova no es pot editar des d'aquí."}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-subprova-type">Tipus *</Label>
                <Select
                  value={challengeType}
                  onValueChange={(v) => {
                    setChallengeType(v as SubProvaType);
                    setWinDirection(v === "Punts" ? "DESC" : "ASC");
                  }}
                >
                  <SelectTrigger id="edit-subprova-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Temps">Temps</SelectItem>
                    <SelectItem value="Punts">Punts</SelectItem>
                    <SelectItem value="Rondes">Rondes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(challengeType === "Temps" || challengeType === "Punts") && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-subprova-win">Com es guanya *</Label>
                  <Select
                    value={winDirection}
                    onValueChange={(v) => setWinDirection(v as WinDirection)}
                  >
                    <SelectTrigger id="edit-subprova-win">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASC">
                        {challengeType === "Temps" ? "Com menys temps millor" : "Com menys punts millor"}
                      </SelectItem>
                      <SelectItem value="DESC">
                        {challengeType === "Temps" ? "Com més temps millor" : "Com més punts millor"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {challengeType !== "Rondes" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-subprova-interval">Interval entre torns (min)</Label>
                    <Input
                      id="edit-subprova-interval"
                      type="number"
                      min={1}
                      placeholder="p. ex. 20"
                      value={intervalMinutes || ""}
                      onChange={(e) => setIntervalMinutes(e.target.value ? Number(e.target.value) : 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-subprova-maxslot">Penyes simultànies màximes</Label>
                    <Input
                      id="edit-subprova-maxslot"
                      type="number"
                      min={1}
                      placeholder="p. ex. 4"
                      value={maxPenyesPerSlot || ""}
                      onChange={(e) => setMaxPenyesPerSlot(e.target.value ? Number(e.target.value) : 0)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel·lar
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "Desant..." : "Desar canvis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
