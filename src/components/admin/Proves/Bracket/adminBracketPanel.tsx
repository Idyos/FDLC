import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Match, SVGViewer, SingleEliminationBracket } from "@g-loot/react-tournament-brackets";
import { useAuth } from "@/routes/admin/AuthContext";
import type { Prova } from "@/interfaces/interfaces";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MIN_TEAMS_FOR_GROUP_STAGE,
  buildFinalStageFromEntrants,
  createGroupFinalEntrants,
  createRandomBalancedGroupStage,
  createSimpleFinalEntrants,
  sanitizeTeamSnapshot,
} from "@/features/bracket/bracketDomain";
import { toGlootMatches } from "@/features/bracket/glootAdapter";
import type {
  BracketMode,
  BracketTeamSnapshot,
  FinalStageState,
  GroupStageState,
  StoredProvaBracketDoc,
} from "@/features/bracket/types";
import {
  getProvaBracket,
  saveProvaBracket,
} from "@/services/database/Admin/adminBracketsDbServices";

type BracketStep = "groups" | "final";

interface AdminBracketPanelProps {
  year: number;
  prova: Prova;
}

function buildTeamSnapshot(prova: Prova): BracketTeamSnapshot[] {
  return sanitizeTeamSnapshot(
    prova.penyes
      .filter((penya) => penya.participates)
      .map((penya) => ({
        teamId: penya.penyaId,
        name: penya.name,
      })),
  );
}

function formatSavedAt(date: Date | null): string {
  if (!date) {
    return "Guardat";
  }

  return `Guardat: ${date.toLocaleString("ca-ES")}`;
}

export default function AdminBracketPanel({ year, prova }: AdminBracketPanelProps) {
  const { user } = useAuth();
  const teams = useMemo(() => buildTeamSnapshot(prova), [prova]);
  const teamById = useMemo(() => {
    const map = new Map<string, BracketTeamSnapshot>();
    teams.forEach((team) => map.set(team.teamId, team));
    return map;
  }, [teams]);

  const [mode, setMode] = useState<BracketMode>("simple_final");
  const [groupStage, setGroupStage] = useState<GroupStageState | null>(null);
  const [finalStage, setFinalStage] = useState<FinalStageState | null>(null);
  const [activeStep, setActiveStep] = useState<BracketStep>("final");
  const [isLoadingSavedBracket, setIsLoadingSavedBracket] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedBracket, setHasSavedBracket] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const glootMatches = useMemo(
    () => (finalStage ? toGlootMatches(finalStage.bracket) : []),
    [finalStage],
  );

  useEffect(() => {
    let isCancelled = false;

    const loadSavedBracket = async () => {
      if (!prova.id) {
        setHasSavedBracket(false);
        setSavedAt(null);
        setMode("simple_final");
        setGroupStage(null);
        setFinalStage(null);
        setActiveStep("final");
        setIsLoadingSavedBracket(false);
        return;
      }

      setIsLoadingSavedBracket(true);

      try {
        const saved = await getProvaBracket(year, prova.id);
        if (isCancelled) {
          return;
        }

        if (!saved) {
          setHasSavedBracket(false);
          setSavedAt(null);
          setMode("simple_final");
          setGroupStage(null);
          setFinalStage(null);
          setActiveStep("final");
          return;
        }

        setHasSavedBracket(true);
        setMode(saved.mode);
        setGroupStage(saved.groupStage);
        setFinalStage(saved.finalStage);
        setSavedAt(saved.updatedAt ? saved.updatedAt.toDate() : null);
        setActiveStep(saved.mode === "groups_to_final" ? "groups" : "final");
      } catch (error) {
        if (!isCancelled) {
          toast.error("No s'ha pogut carregar el quadre guardat.");
          console.error(error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSavedBracket(false);
        }
      }
    };

    loadSavedBracket();

    return () => {
      isCancelled = true;
    };
  }, [year, prova.id]);

  useEffect(() => {
    if (mode !== "groups_to_final" || !groupStage) {
      return;
    }

    const entrants = createGroupFinalEntrants(groupStage, teams);
    const nextFinalStage = buildFinalStageFromEntrants(entrants);
    setFinalStage(nextFinalStage);
  }, [mode, groupStage, teams]);

  const onGenerate = () => {
    if (teams.length < 2) {
      setGroupStage(null);
      setFinalStage(null);
      setHasSavedBracket(false);
      setSavedAt(null);
      toast.error("Calen almenys 2 equips per generar el quadre.");
      return;
    }

    if (mode === "groups_to_final") {
      if (teams.length < MIN_TEAMS_FOR_GROUP_STAGE) {
        const entrants = createSimpleFinalEntrants(teams);
        const nextFinalStage = buildFinalStageFromEntrants(entrants);

        setMode("simple_final");
        setGroupStage(null);
        setFinalStage(nextFinalStage);
        setActiveStep("final");
        setHasSavedBracket(false);
        setSavedAt(null);

        toast.error(
          "No hi ha suficients equips per fer grups (minim 8). S'ha creat un quadre final simple.",
        );
        return;
      }

      const nextGroupStage = createRandomBalancedGroupStage(teams);
      if (!nextGroupStage) {
        toast.error("No s'han pogut generar els grups.");
        return;
      }

      setGroupStage(nextGroupStage);
      setActiveStep("groups");
      setHasSavedBracket(false);
      setSavedAt(null);
      return;
    }

    const entrants = createSimpleFinalEntrants(teams);
    const nextFinalStage = buildFinalStageFromEntrants(entrants);
    setGroupStage(null);
    setFinalStage(nextFinalStage);
    setActiveStep("final");
    setHasSavedBracket(false);
    setSavedAt(null);
  };

  const onSave = async () => {
    if (!prova.id || !finalStage) {
      toast.error("Has de generar un quadre abans de guardar.");
      return;
    }

    const payload: StoredProvaBracketDoc = {
      schemaVersion: 1,
      challengeType: "Rondes",
      mode,
      teamSnapshot: teams,
      groupStage: mode === "groups_to_final" ? groupStage : null,
      finalStage,
      updatedAt: null,
      updatedBy: user?.uid ?? null,
    };

    setIsSaving(true);

    try {
      await saveProvaBracket(year, prova.id, payload, user?.uid);
      const persisted = await getProvaBracket(year, prova.id);
      setHasSavedBracket(true);
      setSavedAt(persisted?.updatedAt ? persisted.updatedAt.toDate() : new Date());
      toast.success("Quadre guardat correctament.");
    } catch (error) {
      toast.error("No s'ha pogut guardar el quadre.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const onWinnerChange = (groupId: string, teamId: string) => {
    setHasSavedBracket(false);
    setSavedAt(null);
    setGroupStage((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        groups: previous.groups.map((group) => {
          if (group.groupId !== groupId) {
            return group;
          }

          return {
            ...group,
            winnerTeamId: teamId === "__NONE__" ? null : teamId,
          };
        }),
      };
    });
  };

  const onModeChange = (newMode: BracketMode) => {
    setMode(newMode);
    setGroupStage(null);
    setFinalStage(null);
    setHasSavedBracket(false);
    setSavedAt(null);
    setActiveStep(newMode === "groups_to_final" ? "groups" : "final");
  };

  let saveStatus = "No guardat";
  if (isLoadingSavedBracket) {
    saveStatus = "Carregant...";
  } else if (hasSavedBracket) {
    saveStatus = savedAt ? formatSavedAt(savedAt) : "Guardat";
  }

  const renderFinalBracket = () => {
    if (!finalStage || glootMatches.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Encara no hi ha cap quadre final generat.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {finalStage.entrants.map((entrant) => (
            <Badge
              key={entrant.entryId}
              variant={entrant.isPlaceholder ? "outline" : "secondary"}
            >
              {entrant.name}
            </Badge>
          ))}
        </div>

        <div className="w-full overflow-auto rounded-lg border p-4">
          <SingleEliminationBracket
            matches={glootMatches}
            matchComponent={Match}
            svgWrapper={({
              children,
              ...props
            }: { children: ReactNode } & Record<string, unknown>) => (
              <SVGViewer width={1600} height={1200} {...props}>
                {children}
              </SVGViewer>
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="py-4">
      <CardHeader className="gap-2">
        <CardTitle>Configuracio del quadre de Rondes</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasSavedBracket ? "secondary" : "outline"}>
            {saveStatus}
          </Badge>
          <Badge variant="outline">{`Equips actius: ${teams.length}`}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium">Mode de quadre</p>
            <Select
              value={mode}
              onValueChange={(value) => onModeChange(value as BracketMode)}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Selecciona mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple_final">Quadre final simple</SelectItem>
                <SelectItem value="groups_to_final">Fase de grups + final</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onGenerate} disabled={isLoadingSavedBracket}>
              Generar
            </Button>
            <Button
              variant="secondary"
              onClick={onSave}
              disabled={isLoadingSavedBracket || isSaving || !finalStage}
            >
              {isSaving ? "Guardant..." : "Guardar"}
            </Button>
          </div>
        </div>

        {mode === "groups_to_final" ? (
          <Tabs
            value={activeStep}
            onValueChange={(value) => setActiveStep(value as BracketStep)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="groups">Pas 1: Grups</TabsTrigger>
              <TabsTrigger value="final">Pas 2: Quadre final</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="space-y-4 pt-2">
              {!groupStage ? (
                <p className="text-sm text-muted-foreground">
                  Genera primer la fase de grups.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {groupStage.groups.map((group) => (
                    <Card key={group.groupId} className="py-4">
                      <CardHeader className="pb-2">
                        <CardTitle>{group.groupName}</CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <ul className="list-disc space-y-1 pl-5 text-sm">
                          {group.teamIds.map((teamId) => (
                            <li key={teamId}>
                              {teamById.get(teamId)?.name ?? teamId}
                            </li>
                          ))}
                        </ul>

                        <div className="space-y-1">
                          <p className="text-sm font-medium">Guanyador del grup</p>
                          <Select
                            value={group.winnerTeamId ?? "__NONE__"}
                            onValueChange={(value) =>
                              onWinnerChange(group.groupId, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sense seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NONE__">
                                Sense seleccionar
                              </SelectItem>
                              {group.teamIds.map((teamId) => (
                                <SelectItem key={teamId} value={teamId}>
                                  {teamById.get(teamId)?.name ?? teamId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="final" className="pt-2">
              {renderFinalBracket()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pas 2: Quadre final</p>
            {renderFinalBracket()}
          </div>
        )}

        {mode === "groups_to_final" && teams.length < MIN_TEAMS_FOR_GROUP_STAGE ? (
          <p className="text-xs text-muted-foreground">
            Amb menys de 8 equips, el sistema passa automaticament a quadre final
            simple.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
