import { useProvaStore } from "@/components/shared/Contexts/ProvaContext";
import { useYear } from "@/components/shared/Contexts/YearContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { generateProvaResults, openProva } from "@/services/database/Admin/adminProvesDbServices";
import { ConstructionIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminFooter() {    
  const navigate = useNavigate();
  const setProva = useProvaStore((state) => state.setProva);

  const { selectedYear } = useYear();
  const prova = useProvaStore((state) => state.prova);

  const [openAlert, setOpenAlert] = useState(false);
  const [missingPenyes, setMissingPenyes] = useState<string[]>([]);

  const onOpenProva = async () => {
    if (!prova) return;

    if (!prova.isFinished) {
      toast.error("La prova ja està oberta!");
      return;
    }

    try {
      await openProva(selectedYear, prova.id);
      toast.success("Prova oberta correctament!");

      const updatedProva = Object.assign(
        Object.create(Object.getPrototypeOf(prova)),
        { ...prova, isFinished: false }
      );
      setProva(updatedProva);
    } catch (error: any) {
      toast.error("Error al obrir la prova: " + error.message);
    }
  };

  const onFinishProva = async () => {
    if (!prova || !prova.penyes) return;

    const penyesWithoutResults = prova.penyes
      .filter((r) => r.result == null || r.result === -1)
      .map((r) => r.name);

    if (penyesWithoutResults.length > 0 && openAlert === false) {
      setMissingPenyes(penyesWithoutResults);
      setOpenAlert(true);
      return;
    }

    try {
      await generateProvaResults(selectedYear, prova.id);
      toast.success("Resultats generats correctament!");
      setOpenAlert(false);

      const updatedProva = Object.assign(
        Object.create(Object.getPrototypeOf(prova)),
        { ...prova, isFinished: true }
      );
      setProva(updatedProva);

      if (prova.id) {
        setTimeout(() => {
          navigate(`/prova?provaId=${prova.id}`);
        }, 2000);
      }
    } catch (error: any) {
      toast.error("Error al generar resultats: " + error.message);
      setOpenAlert(false);
    }
  };

  return (
    <>
      {/* ALERTA */}
      <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No totes les penyes tenen resultat!</AlertDialogTitle>
            <AlertDialogDescription>
              Les següents penyes no tenen resultat definit:
              <br />
              <strong>{missingPenyes.join(", ")}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenAlert(false)}>D'acord</AlertDialogCancel>
            <AlertDialogAction onClick={(e) =>{e.preventDefault(); onFinishProva()}}>Continuar de totes formes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FOOTER FIJO */}
      <footer className="z-30 fixed bottom-0 right-0 rounded-tl-3xl bg-black py-4 flex justify-end p-5">
        {prova.isFinished ? (
         <Button onClick={onOpenProva}>
          Tornar a obrir prova
        </Button>
        ) : (
          <Button onClick={onFinishProva}>
          Tancar prova
        </Button>
        )}
      </footer>
    </>
  );
}
