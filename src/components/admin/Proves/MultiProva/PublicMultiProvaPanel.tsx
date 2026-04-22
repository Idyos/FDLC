import { useEffect, useState } from "react";
import { SubProvaConfig, ParticipatingPenya } from "@/interfaces/interfaces";
import {
  subscribeSubProvas,
  subscribeSubProvaParticipants,
  subscribeProvaFinalResults,
  type MultiProvaFinalResult,
} from "@/services/database/publicDbService";
import { TimeRollingInput } from "@/components/shared/PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "@/components/shared/PenyaProvaResults/PointsInput/pointsInput";
import { ParticipatesInput } from "@/components/shared/PenyaProvaResults/ParticipatesInput/participatesInput";
import PublicBracketPanel from "@/components/admin/Proves/Bracket/PublicBracketPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import SingleProvaResult from "@/components/shared/PenyaProvaResults/singleProvaResult";

const RESULTATS_TAB = "resultats";

interface Props {
  year: number;
  provaId: string;
}

function SubProvaResults({
  participants,
  subProva,
}: {
  participants: ParticipatingPenya[];
  subProva: SubProvaConfig;
}) {
  const renderValue = (p: ParticipatingPenya) => {
    switch (subProva.challengeType) {
      case "Temps":
        return <TimeRollingInput value={p.result} />;
      case "Punts":
        return <PointsInput value={p.result} />;
      case "Participació":
        return <ParticipatesInput value={p.result} />;
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      {participants.map((p) => (
        <div
          key={p.penyaId}
          className="flex items-center justify-between rounded-xl border px-4 py-3"
        >
          <span className="font-medium">{p.name}</span>
          <div className="pointer-events-none">{renderValue(p)}</div>
        </div>
      ))}
    </div>
  );
}

function MultiProvaResultsList({ results }: { results: MultiProvaFinalResult[] | null }) {
  if (results === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Trophy className="h-8 w-8 opacity-30" />
        <p className="text-sm">Els resultats finals estaran disponibles quan es tanqui la prova.</p>
      </div>
    );
  }

  const ranked = [...results].sort((a, b) => {
    if (a.position === 0 && b.position === 0) return a.name.localeCompare(b.name);
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
  const [participantsMap, setParticipantsMap] = useState<Record<string, ParticipatingPenya[]>>({});
  const [finalResults, setFinalResults] = useState<MultiProvaFinalResult[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeSubProvas(year, provaId, (list) => {
      setSubProves(list);
      setSelectedId((prev) => {
        if (prev === RESULTATS_TAB) return RESULTATS_TAB;
        return list.find((s) => s.id === prev) ? prev : list[0]?.id ?? null;
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

    const unsub = subscribeSubProvaParticipants(year, provaId, selectedId, (participants) => {
      setParticipantsMap((prev) => ({ ...prev, [selectedId]: participants }));
    });
    return unsub;
  }, [year, provaId, selectedId, subProves]);

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Carregant subpruebas...</p>;
  if (subProves.length === 0) return <p className="p-4 text-sm text-muted-foreground">Aquesta multiprova encara no té subpruebas.</p>;

  return (
    <Tabs value={selectedId ?? ""} onValueChange={setSelectedId} className="p-4">
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
            <PublicBracketPanel year={year} provaId={provaId} subProvaId={sp.id} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {sp.challengeType}
                {sp.winDirection !== "NONE" && (
                  <> · {sp.winDirection === "ASC" ? "menys és millor" : "més és millor"}</>
                )}
              </p>
              <SubProvaResults
                participants={participantsMap[sp.id] ?? []}
                subProva={sp}
              />
            </>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
