import { motion } from "framer-motion";
import { PenyaInfo } from "@/interfaces/interfaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/Theme/theme-provider";
import { useState } from "react";
import { toast } from "sonner";
import { updatePenyaInfo } from "@/services/dbService";
import { Checkbox } from "@/components/ui/checkbox";

interface PenyaSummaryProps {
  rankingInfo: PenyaInfo | null;
}

export default function AdminPenyaSummary({ rankingInfo }: PenyaSummaryProps) {
  const { theme } = useTheme();
  const [penyaName, setPenyaName] = useState(rankingInfo?.name || "");
  const [penyaSecret, setPenyaSecret] = useState(rankingInfo?.isSecret || false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  let bgColor =
    theme == "dark" ? "rgba(38, 38, 38, 1)" : "rgba(255, 255, 255, 1)";
  const gradient = `linear-gradient(270deg, rgba(0, 0, 0, 0), ${bgColor} 26%)`;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    console.log("penyaName", penyaName, rankingInfo?.name, rankingInfo?.penyaId);

    if (!penyaName.trim()) {
      toast.warning("El nom de la penya no pot estar buit.");
      return;
    }

    if(penyaName == rankingInfo?.name && penyaSecret == rankingInfo?.isSecret) {
        toast.warning("No s'han detectat canvis.");
        return;
    }

    if (!rankingInfo || !rankingInfo.penyaId) {
        toast.error("No s'ha pogut actualitzar la penya: informació incompleta.");
        return;
    }
  
    try {
      updatePenyaInfo(2025, rankingInfo.penyaId, penyaName, penyaSecret)
      .then(() => {
        toast.success("Penya actualitzada!");
        rankingInfo.name = penyaName;
        rankingInfo.isSecret = penyaSecret;
        closeDialog(); 
      })
      .catch((error) => {
        toast.error("Error al guardar: "+error);
      })

    } catch (error) {
      toast.error("Error al guardar");
    }
  }

  const closeDialog = () => {
    setIsDialogOpen(false);
    setPenyaName(rankingInfo?.name || "");
  }

  return rankingInfo != null ? (
    <motion.div
      key={rankingInfo?.penyaId}
      whileHover={{ scale: 1.02 }}
      className="bg-white/30 relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild className="w-full h-full " onClick={() => setIsDialogOpen(true)}>
          <div className="cursor-pointer w-full h-full">
            {/* Imagen de fondo */}
            <img
              src={rankingInfo?.imageUrl || undefined}
              alt="Imagen Peña"
              className="right-0 absolute object-cover w-8/12 h-full"
              style={rankingInfo?.imageUrl == null ? { display: "none" } : {}}
            />

            {/* Capa de overlay para oscurecer */}
            <div
              style={rankingInfo?.imageUrl == null ? { display: "none" } : {}}
              className="absolute inset-0 dark:bg-black/40 bg-white/30"
            ></div>

            {/* Fondo de color */}
            <div
              className="absolute inset-0 h-full w-[50%] left-0"
              style={
                rankingInfo?.imageUrl == null
                  ? { display: "none" }
                  : { background: gradient }
              }
            ></div>
            {/* Contenido */}
            <div className="relative z-10 flex justify-between w-full h-full p-4 dark:text-white text-gray-900">
              <div className="text-left">
                <p className="text-2xl font-bold">{rankingInfo?.name}</p>
                <p className="text-xl font-regular">
                  {rankingInfo?.totalPoints}
                </p>
              </div>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modificar {rankingInfo?.name}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Aquí pots modificar la penya seleccionada. Si us plau, assegura't de que la informació sigui correcta abans de guardar els canvis.
          </DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom de la penya
              </Label>
              <Input
                id="name"
                value={penyaName}
                className="col-span-3"
                onChange={(e) => setPenyaName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Informació secreta
              </Label>
              <Checkbox
                id="terms"
                checked={penyaSecret}
                onCheckedChange={(checked) => setPenyaSecret(checked === true)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={penyaName.length == 0} type="submit" onClick={handleClick}>Guardar canvis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  ) : (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="dark:bg-gray-900 bg-white/30 relative w-full h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      {/* Contenido */}
      <div className="relative z-10 flex items-center justify-center h-full dark:text-white text-gray-900">
        <div className="dark:bg-gray-800 bg-gray-200 text-center p-8 rounded-full shadow-lg w-24 h-24">
          <p className="text-4xl font-bold">+</p>
        </div>
      </div>
    </motion.div>
  );
}
