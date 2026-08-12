import { useState } from "react";
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
  nextOrder: number;
  onClose: () => void;
  onAdd: (config: Omit<SubProvaConfig, "id">) => Promise<void>;
}

type SubProvaType = "Temps" | "Punts" | "Rondes";

export default function AdminAddSubProvaDialog({ open, nextOrder, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [challengeType, setChallengeType] = useState<SubProvaType>("Temps");
  const [winDirection, setWinDirection] = useState<WinDirection>("ASC");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0);
  const [maxPenyesPerSlot, setMaxPenyesPerSlot] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        challengeType,
        winDirection: challengeType === "Rondes" ? "ASC" : winDirection,
        order: nextOrder,
        intervalMinutes: challengeType === "Rondes" ? undefined : intervalMinutes || undefined,
        maxPenyesPerSlot: challengeType === "Rondes" ? undefined : maxPenyesPerSlot || undefined,
      });
      setName("");
      setChallengeType("Temps");
      setWinDirection("ASC");
      setIntervalMinutes(0);
      setMaxPenyesPerSlot(0);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova subprova</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subprova-name">Nom *</Label>
            <Input
              id="subprova-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ex. Prova de velocitat"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subprova-type">Tipus *</Label>
            <Select
              value={challengeType}
              onValueChange={(v) => {
                setChallengeType(v as SubProvaType);
                setWinDirection(v === "Punts" ? "DESC" : "ASC");
              }}
            >
              <SelectTrigger id="subprova-type">
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
              <Label htmlFor="subprova-win">Com es guanya *</Label>
              <Select
                value={winDirection}
                onValueChange={(v) => setWinDirection(v as WinDirection)}
              >
                <SelectTrigger id="subprova-win">
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
                <Label htmlFor="subprova-interval">Interval entre torns (min)</Label>
                <Input
                  id="subprova-interval"
                  type="number"
                  min={1}
                  placeholder="p. ex. 20"
                  value={intervalMinutes || ""}
                  onChange={(e) => setIntervalMinutes(e.target.value ? Number(e.target.value) : 0)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subprova-maxslot">Penyes simultànies màximes</Label>
                <Input
                  id="subprova-maxslot"
                  type="number"
                  min={1}
                  placeholder="p. ex. 4"
                  value={maxPenyesPerSlot || ""}
                  onChange={(e) => setMaxPenyesPerSlot(e.target.value ? Number(e.target.value) : 0)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel·lar
          </Button>
          <Button onClick={handleAdd} disabled={loading || !name.trim()}>
            {loading ? "Afegint..." : "Afegir subprova"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
