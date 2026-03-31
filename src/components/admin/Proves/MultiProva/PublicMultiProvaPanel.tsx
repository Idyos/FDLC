import { useEffect, useState } from "react";
import { SubProvaConfig, ParticipatingPenya } from "@/interfaces/interfaces";
import { getSubProvas, getSubProvaParticipants } from "@/services/database/Admin/adminMultiProvaDbServices";
import { TimeRollingInput } from "@/components/shared/PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "@/components/shared/PenyaProvaResults/PointsInput/pointsInput";
import { ParticipatesInput } from "@/components/shared/PenyaProvaResults/ParticipatesInput/participatesInput";
import PublicBracketPanel from "@/components/admin/Proves/Bracket/PublicBracketPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

export default function PublicMultiProvaPanel({ year, provaId }: Props) {
  const [subProves, setSubProves] = useState<SubProvaConfig[]>([]);
  const [participantsMap, setParticipantsMap] = useState<
    Record<string, ParticipatingPenya[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getSubProvas(year, provaId).then(async (list) => {
      if (cancelled) return;
      setSubProves(list);

      const map: Record<string, ParticipatingPenya[]> = {};
      await Promise.all(
        list.map(async (sp) => {
          const pts = await getSubProvaParticipants(year, provaId, sp.id);
          map[sp.id] = pts;
        })
      );
      if (!cancelled) {
        setParticipantsMap(map);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [year, provaId]);

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Carregant subpruebas...</p>;
  if (subProves.length === 0) return <p className="p-4 text-sm text-muted-foreground">Aquesta multiprova encara no té subpruebas.</p>;

  return (
    <Tabs defaultValue={subProves[0].id} className="p-4">
      <TabsList className="flex-wrap h-auto gap-1">
        {subProves.map((sp) => (
          <TabsTrigger key={sp.id} value={sp.id}>
            {sp.name}
          </TabsTrigger>
        ))}
      </TabsList>

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
