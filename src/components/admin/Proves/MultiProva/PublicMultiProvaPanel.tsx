import { useEffect, useState } from "react";
import { SubProvaConfig, ParticipatingPenya } from "@/interfaces/interfaces";
import {
  subscribeSubProvas,
  subscribeSubProvaParticipants,
  subscribeProvaFinalResults,
  type MultiProvaFinalResult,
} from "@/services/database/publicDbService";
import PublicBracketPanel from "@/components/admin/Proves/Bracket/PublicBracketPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import SingleProvaResult from "@/components/shared/PenyaProvaResults/singleProvaResult";
const RESULTATS_TAB = "resultats";
import { rankParticipants } from "@/utils/sorting";

interface Props {
  year: number;
  provaId: string;
}

function MultiProvaResultsList({
  results,
}: {
  results: MultiProvaFinalResult[] | null;
}) {
  if (results === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Trophy className="h-8 w-8 opacity-30" />
        <p className="text-sm">
          Els resultats finals estaran disponibles quan es tanqui la prova.
        </p>
      </div>
    );
  }

  const ranked = [...results].sort((a, b) => {
    if (a.position === 0 && b.position === 0)
      return a.name.localeCompare(b.name);
    if (a.position === 0) return 1;
    if (b.position === 0) return -1;
    return a.position - b.position;
  });

  const asPenyes: ParticipatingPenya[] = ranked.map((r) => ({
    penyaId: r.penyaId,
    name: r.name,
    participates: r.position > 0,
    result: r.result >= 0 ? String(r.result) : "",
    index: r.position,
    participationTime: null,
  }));

  return (
    <div className="flex flex-col">
      {asPenyes.map((p) => (
        <SingleProvaResult key={p.penyaId} provaResultSummary={p} />
      ))}
    </div>
  );
}

export default function PublicMultiProvaPanel({ year, provaId }: Props) {
  const [subProves, setSubProves] = useState<SubProvaConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participantsMap, setParticipantsMap] = useState<
    Record<string, ParticipatingPenya[]>
  >({});
  const [finalResults, setFinalResults] = useState<
    MultiProvaFinalResult[] | null | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeSubProvas(year, provaId, (list) => {
      setSubProves(list);
      setSelectedId((prev) => {
        if (prev === RESULTATS_TAB) return RESULTATS_TAB;
        return list.find((s) => s.id === prev) ? prev : (list[0]?.id ?? null);
      });
      setLoading(false);
    });
    return unsub;
  }, [year, provaId]);

  useEffect(() => {
    const unsub = subscribeProvaFinalResults(year, provaId, setFinalResults);
    return unsub;
  }, [year, provaId]);

  useEffect(() => {
    if (!selectedId || selectedId === RESULTATS_TAB) return;
    const sp = subProves.find((s) => s.id === selectedId);
    if (!sp || sp.challengeType === "Rondes") return;

    const unsub = subscribeSubProvaParticipants(
      year,
      provaId,
      selectedId,
      (participants) => {
        setParticipantsMap((prev) => ({
          ...prev,
          [selectedId]: rankParticipants(participants, sp.winDirection),
        }));
      },
    );
    return unsub;
  }, [year, provaId, selectedId, subProves]);

  if (loading)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Carregant subpruebas...
      </p>
    );
  if (subProves.length === 0)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Aquesta multiprova encara no té subpruebas.
      </p>
    );

  return (
    <Tabs
      value={selectedId ?? ""}
      onValueChange={setSelectedId}
      className="p-4"
    >
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value={RESULTATS_TAB} className="gap-1.5">
          <Trophy className="h-3.5 w-3.5" />
          Resultats
        </TabsTrigger>
        {subProves.map((sp) => (
          <TabsTrigger key={sp.id} value={sp.id}>
            {sp.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={RESULTATS_TAB}>
        {finalResults === undefined ? (
          <p className="text-sm text-muted-foreground py-4">Carregant...</p>
        ) : (
          <MultiProvaResultsList results={finalResults} />
        )}
      </TabsContent>

      {subProves.map((sp) => (
        <TabsContent key={sp.id} value={sp.id}>
          {sp.challengeType === "Rondes" ? (
            <PublicBracketPanel
              year={year}
              provaId={provaId}
              subProvaId={sp.id}
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {sp.challengeType}
                {sp.winDirection !== "NONE" && (
                  <>
                    {" "}
                    ·{" "}
                    {sp.winDirection === "ASC"
                      ? "menys és millor"
                      : "més és millor"}
                  </>
                )}
              </p>
              {(participantsMap[sp.id] ?? []).map((p) => (
                <SingleProvaResult
                  key={p.penyaId}
                  provaResultSummary={p}
                  challengeTypeOverride={sp.challengeType}
                />
              ))}
            </>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
