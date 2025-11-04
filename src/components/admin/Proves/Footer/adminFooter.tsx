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
import { generateProvaResults } from "@/services/database/Admin/adminProvesDbServices";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminFooter() {    
    const navigate = useNavigate();

  const { selectedYear } = useYear();
  const prova = useProvaStore((state) => state.prova);

  const [openAlert, setOpenAlert] = useState(false);
  const [missingPenyes, setMissingPenyes] = useState<string[]>([]);

  const onFinishProva = async () => {
    if (!prova || !prova.results) return;

    const penyesWithoutResults = prova.results
      .filter((r) => r.result == null || r.result === -1)
      .map((r) => r.penyaName);

    if (penyesWithoutResults.length > 0 && openAlert === false) {
      setMissingPenyes(penyesWithoutResults);
      setOpenAlert(true);
      return;
    }

    try {
      await generateProvaResults(selectedYear, prova.provaId);
      toast.success("Resultats generats correctament!");
      setOpenAlert(false);
        if(prova.provaId){
            setTimeout(() => {
                navigate(`/prova?provaId=${prova.provaId}`);
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
            <AlertDialogAction onClick={() => onFinishProva()}>Continuar de totes formes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FOOTER FIJO */}
      <footer className="z-30 fixed bottom-0 right-0 rounded-tl-3xl bg-black py-4 flex justify-end p-5">
        <Button onClick={onFinishProva}>
          Tancar prova
        </Button>
      </footer>
    </>
  );
}
