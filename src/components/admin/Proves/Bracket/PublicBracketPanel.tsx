import { useEffect, useMemo, useState } from "react";
import { BracketViewer } from "./BracketViewer";
import type { Prova } from "@/interfaces/interfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { propagateBracketByes } from "@/features/bracket/bracketDomain";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type { FinalStageState } from "@/features/bracket/types";
import { getProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";

interface PublicBracketPanelProps {
  year: number;
  prova: Prova;
}

export default function PublicBracketPanel({ year, prova }: PublicBracketPanelProps) {
  const [finalStage, setFinalStage] = useState<FinalStageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (!prova.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const saved = await getProvaBracket(year, prova.id);
        if (isCancelled) return;
        if (!saved) {
          setFinalStage(null);
          return;
        }
        setFinalStage({
          ...saved.finalStage,
          bracket: {
            ...saved.finalStage.bracket,
            matches: propagateBracketByes([...saved.finalStage.bracket.matches]),
          },
        });
      } catch (error) {
        if (!isCancelled) console.error("PublicBracketPanel load error:", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => { isCancelled = true; };
  }, [year, prova.id]);

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Quadre de Rondes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregant quadre...</p>
        )}
        {!isLoading && glootMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">Encara no hi ha cap quadre disponible.</p>
        )}
        {!isLoading && glootMatches.length > 0 && (
          <div className="w-full overflow-auto rounded-lg border p-4">
            <BracketViewer matches={glootMatches} readOnly />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
