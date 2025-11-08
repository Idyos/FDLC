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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { updatePenyaInfo } from "@/services/database/Admin/adminDbServices";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { Textarea } from "@/components/ui/textarea";

interface PenyaSummaryProps {
  rankingInfo: PenyaInfo | null;
}

export default function AdminPenyaSummary({ rankingInfo }: PenyaSummaryProps) {
  const { selectedYear } = useYear();    

  const [isSaving, setIsSaving] = useState(false);

  const [provaImage, setProvaImage] = useState<File | null>(null);
  const provaImageUrl = useMemo(() => {
    return provaImage ? URL.createObjectURL(provaImage) : rankingInfo?.imageUrl ? rankingInfo.imageUrl : null;
  }, [provaImage]);

  const [penyaName, setPenyaName] = useState(rankingInfo?.name || "");
  const [penyaSecret, setPenyaSecret] = useState(rankingInfo?.isSecret || false);
  const [penyaDescription, setPenyaDescription] = useState(rankingInfo?.description || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

    const onImageAdded = async (file: File) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  
        if (!allowedTypes.includes(file.type)) {
          toast.error("Només es permeten fitxers d'Imatge (.jpg, .png o .webp)");
          return;
        }
  
        console.log(file);

        setProvaImage(file);
    };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  
    if (!penyaName.trim()) {
      toast.warning("El nom de la penya no pot estar buit.");
      return;
    }

    if(penyaName == rankingInfo?.name && penyaSecret == rankingInfo?.isSecret
      && penyaDescription == rankingInfo?.description && rankingInfo?.imageUrl == provaImageUrl
    ) {
        toast.warning("No s'han detectat canvis.");
        return;
    }

    if (!rankingInfo || !rankingInfo.id) {
        toast.error("No s'ha pogut actualitzar la penya: informació incompleta.");
        return;
    }

    setIsSaving(true);

    try {
      updatePenyaInfo(selectedYear, rankingInfo.id, penyaName, penyaSecret, penyaDescription, provaImage)
      .then(() => {
        toast.success("Penya actualitzada!");
        rankingInfo.name = penyaName;
        rankingInfo.isSecret = penyaSecret;
        rankingInfo.description = penyaDescription;
        closeDialog(); 
      })
      .catch((error) => {
        toast.error("Error al guardar: "+error);
      })

    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  const closeDialog = () => {
    setIsDialogOpen(false);
    setPenyaName(rankingInfo?.name || "");
  }

  return rankingInfo != null ? (
    <motion.div
      key={rankingInfo?.id}
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
              className="absolute object-cover"
              style={rankingInfo?.imageUrl == null ? { display: "none" } : {}}
            />

            {/* Capa de overlay para oscurecer */}
            <div
              style={rankingInfo?.imageUrl == null ? { display: "none" } : {}}
              className="absolute inset-0 dark:bg-black/50 bg-white/40"
            ></div>

            {/* Contenido */}
            <div className="relative z-10 flex justify-center items-center w-full h-full p-4 dark:text-white text-gray-900">
                <p className="text-center text-3xl font-bold">{rankingInfo?.name}</p>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[88svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar {rankingInfo?.name}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Aquí pots modificar la info de {rankingInfo?.name}.
          </DialogDescription>                
            <div>
            <Label htmlFor="image" className="text-right mb-2">
              Imatge de la penya
            </Label>
            <div
              className="h-43 w-full relative flex items-center justify-center border-2 border-dashed rounded-lg bg-center bg-contain bg-no-repeat"
              style={{
                backgroundImage: provaImageUrl ? `url(${provaImageUrl})` : rankingInfo.imageUrl ? `url(${rankingInfo.imageUrl})` : "none",
              }}
            >
              {(!rankingInfo.imageUrl && !provaImageUrl)  && (
                <span className="text-sm text-gray-500">Arrossega una imatge o fes clic</span>
              )}

              <Input
                id="image"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageAdded(file);
                }}
              />
              </div>
            </div>
          <div>
              <Label htmlFor="name" className="text-right mb-2">
                Nom de la penya
              </Label>
              <Input
                id="name"
                value={penyaName}
                onChange={(e) => setPenyaName(e.target.value)}
              />
          </div>
          <div>
              <Label htmlFor="description" className="mb-2">
                Descripció de la penya
              </Label>
              <Textarea 
                id="description"
                placeholder="Descripció de la penya" 
                value={penyaDescription}
                onChange={(e) => setPenyaDescription(e.target.value)}
              />
          </div>
          <div className="flex items-center space-x-2">
              <Label htmlFor="secret" className="text-right">
                Informació secreta
              </Label>
              <Checkbox
                id="secret"
                checked={penyaSecret}
                onCheckedChange={(checked) => setPenyaSecret(checked === true)}
              />
          </div>
          <DialogFooter>
            <Button
              disabled={isSaving || penyaName.length == 0} 
              type="submit" 
              onClick={handleClick}>
                Guardar canvis
              </Button>
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
