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
import { generateProvaResults, generateBracketResults, openProva } from "@/services/database/Admin/adminProvesDbServices";
import { generateMultiProvaResults } from "@/services/database/Admin/adminMultiProvaDbServices";
import { navigateWithQuery } from "@/utils/url";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, LoaderCircle, Lock, LockOpen } from "lucide-react";

export default function AdminFooter() {
  const navigate = useNavigate();
  const setProva = useProvaStore((state) => state.setProva);
  const { selectedYear } = useYear();
  const prova = useProvaStore((state) => state.prova);

  const [isLoading, setIsLoading] = useState(false);
  const [openAlert, setOpenAlert] = useState(false);
  const [missingPenyes, setMissingPenyes] = useState<string[]>([]);

  const showProgress =
    prova?.challengeType !== "Rondes" && prova?.challengeType !== "MultiProva";

  const { withResult, total, missingNames } = useMemo(() => {
    if (!prova?.penyes || !showProgress) return { withResult: 0, total: 0, missingNames: [] };
    const all = prova.penyes;
    const total = all.length;
    if (prova.challengeType === "Participació") {
      const participating = all.filter((p) => p.participates);
      return { withResult: participating.length, total, missingNames: [] };
    }
    const done = all.filter((p) => p.result != null && p.result !== -1);
    const missing = all.filter((p) => p.result == null || p.result === -1).map((p) => p.name);
    return { withResult: done.length, total, missingNames: missing };
  }, [prova, showProgress]);

  const hasWarning = missingNames.length > 0;

  const onOpenProva = async () => {
    if (!prova) return;
    if (!prova.isFinished) {
      toast.error("La prova ja està oberta!");
      return;
    }
    
    setIsLoading(true);

    try {
      await openProva(selectedYear, prova.id);
      toast.success("Prova oberta correctament!");
      setProva({ ...prova, isFinished: false });
      setIsLoading(false);
    } catch (error: any) {
      toast.error("Error al obrir la prova: " + error.message);
      setIsLoading(false);
    }
  };

  const onFinishProva = async () => {
    if (!prova || !prova.penyes) return;

    setIsLoading(true);

    if (prova.challengeType === "MultiProva") {
      try {
        await generateMultiProvaResults(selectedYear, prova.id);
        toast.success("Resultats generats correctament!");
        setProva({ ...prova, isFinished: true });
        setIsLoading(false);
        if (prova.id) {
          setTimeout(() => {
            navigateWithQuery(navigate, "/prova", { provaId: prova.id });
          }, 2000);
        }
      } catch (error: any) {
        toast.error("Error al generar resultats: " + error.message);
        console.error(error);
        setIsLoading(false);
      }
      return;
    }

    const penyesWithoutResults = prova.penyes
      .filter((r) => r.result == null || r.result === -1)
      .map((r) => r.name);

    if (penyesWithoutResults.length > 0 && openAlert === false && prova.challengeType != "Participació") {
      setMissingPenyes(penyesWithoutResults);
      setOpenAlert(true);
      return;
    }

    try {
      await generateProvaResults(selectedYear, prova.id);
      toast.success("Resultats generats correctament!");
      setOpenAlert(false);
      setProva({ ...prova, isFinished: true });
      setIsLoading(false);
      if (prova.id) {
        setTimeout(() => {
          navigateWithQuery(navigate, "/prova", { provaId: prova.id });
        }, 2000);
      }
    } catch (error: any) {
      toast.error("Error al generar resultats: " + error.message);
      console.error(error);
      setOpenAlert(false);
      setIsLoading(false);
    }
  };

  const onFinishRondes = async () => {
    if (!prova) return;
    try {
      await generateBracketResults(selectedYear, prova.id);
      toast.success("Resultats generats correctament!");
      setProva({ ...prova, isFinished: true });
      if (prova.id) {
        setTimeout(() => {
          navigateWithQuery(navigate, "/prova", { provaId: prova.id });
        }, 2000);
      }
    } catch (error: any) {
      toast.error(error.message ?? "Error al generar resultats.");
      console.error(error);
    }
  };

  if (prova.challengeType === "Rondes") {
    return (
      <footer className="z-30 fixed bottom-0 right-0 border-t border-l bg-background/95 backdrop-blur-sm py-3 px-5 flex items-center justify-end gap-4 w-full rounded-none md:w-auto md:rounded-tl-2xl">
        {prova.isFinished ? (
          <Button variant="outline" onClick={onOpenProva}>
            <LockOpen className="h-4 w-4" />
            Tornar a obrir prova
          </Button>
        ) : (
          <Button onClick={onFinishRondes}>
            <Lock className="h-4 w-4" />
            Tancar prova
          </Button>
        )}
      </footer>
    );
  }

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
            <AlertDialogCancel onClick={() => { setOpenAlert(false); setIsLoading(false);}}>D'acord</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); onFinishProva(); }}>
              Continuar de totes formes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FOOTER */}
      <footer className="z-30 fixed bottom-0 right-0 border-t border-l bg-background/95 backdrop-blur-sm py-3 px-5 flex items-center gap-6 w-full rounded-none md:w-auto md:rounded-tl-2xl">

        {/* Indicador de progrés */}
        {showProgress && !prova.isFinished && total > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {hasWarning ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-amber-600 dark:text-amber-400">
                  {withResult} / {total} penyes amb resultat
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-green-600 dark:text-green-400">
                  Totes les penyes tenen resultat
                </span>
              </>
            )}
          </div>
        )}

        {/* Botó principal */}
        {prova.isFinished ? (
          <Button variant="outline" onClick={onOpenProva} disabled={isLoading}>
            <LockOpen className="h-4 w-4" />
            {isLoading ? <LoaderCircle className="animate-spin" /> : "Tornar a obrir prova"}            
          </Button>
        ) : (
          <Button onClick={onFinishProva} disabled={isLoading}>
            <Lock className="h-4 w-4" />
            {isLoading ? <LoaderCircle className="animate-spin" /> : "Tancar prova"}
          </Button>
        )}
      </footer>
    </>
  );
}
