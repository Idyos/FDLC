import { useEffect, useRef, useState } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { ParticipatingPenya, Prova, SubProvaConfig } from "@/interfaces/interfaces";
import {
  addSubProva,
  deleteSubProva,
  getSubProvaParticipants,
  getSubProvas,
  updateSubProvaResult,
} from "@/services/database/Admin/adminMultiProvaDbServices";
import AdminAddSubProvaDialog from "./AdminAddSubProvaDialog";
import { TimeRollingInput } from "@/components/shared/PenyaProvaResults/TimeInput/timeInput";
import { PointsInput } from "@/components/shared/PenyaProvaResults/PointsInput/pointsInput";
import { ParticipatesInput } from "@/components/shared/PenyaProvaResults/ParticipatesInput/participatesInput";

interface Props {
  year: number;
  prova: Prova;
}

// ─── Sub-prova result row ─────────────────────────────────────────────────────

function SubProvaResultRow({
  participant,
  subProva,
  provaId,
  year,
  provaIsFinished,
}: {
  participant: ParticipatingPenya;
  subProva: SubProvaConfig;
  provaId: string;
  year: number;
  provaIsFinished: boolean;
}) {
  const prevResult = useRef(participant.result);
  const [value, setValue] = useState(participant.result);

  useEffect(() => {
    prevResult.current = participant.result;
    setValue(participant.result);
  }, [participant.penyaId, participant.result]);

  const save = async (newVal: number) => {
    if (provaIsFinished) {
      toast.error("La prova està finalitzada! Reobre-la per modificar resultats.");
      setValue(prevResult.current);
      return;
    }
    if (prevResult.current === newVal) return;

    try {
      await updateSubProvaResult(year, provaId, subProva.id, participant.penyaId, newVal);
      prevResult.current = newVal;
      setValue(newVal);
    } catch {
      setValue(prevResult.current);
      toast.error("Error al guardar el resultat.");
    }
  };

  const renderInput = () => {
    switch (subProva.challengeType) {
      case "Temps":
        return (
          <TimeRollingInput value={value} onChange={setValue} onBlur={save} />
        );
      case "Punts":
        return (
          <PointsInput value={value} onChange={setValue} onBlur={save} />
        );
      case "Participació":
        return (
          <ParticipatesInput
            value={value}
            onChange={(v) => { setValue(v); save(v); }}
            onBlur={save}
          />
        );
    }
  };

  return (
    <motion.div
      className="relative w-full rounded-2xl overflow-hidden shadow-lg mb-4 cursor-pointer"
      whileHover={{ scale: 1.01 }}
    >
      <div className="relative z-10 flex flex-col justify-between items-center h-full p-4 dark:text-white text-gray-900">
        <div className="text-left w-full">
          <p className="text-2xl font-bold">{participant.name}</p>
        </div>
        <div>{renderInput()}</div>
      </div>
    </motion.div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AdminMultiProvaPanel({ year, prova }: Props) {
  const [subProves, setSubProves] = useState<SubProvaConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipatingPenya[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load sub-provas on mount
  useEffect(() => {
    getSubProvas(year, prova.id).then((list) => {
      setSubProves(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, [year, prova.id]);

  // Load participants whenever selected sub-prova changes
  useEffect(() => {
    if (!selectedId) { setParticipants([]); return; }
    setLoadingParticipants(true);
    getSubProvaParticipants(year, prova.id, selectedId)
      .then(setParticipants)
      .finally(() => setLoadingParticipants(false));
  }, [selectedId, year, prova.id]);

  const selectedSubProva = subProves.find((s) => s.id === selectedId) ?? null;

  const handleAdd = async (config: Omit<SubProvaConfig, "id">) => {
    try {
      const id = await addSubProva(year, prova.id, config, prova.penyes);
      const newSubProva: SubProvaConfig = { ...config, id };
      setSubProves((prev) => [...prev, newSubProva]);
      setSelectedId(id);
      toast.success(`Subprova "${config.name}" creada!`);
    } catch (err: any) {
      toast.error("Error al crear la subprova: " + err.message);
    }
  };

  const handleDelete = async (subProvaId: string, name: string) => {
    try {
      await deleteSubProva(year, prova.id, subProvaId);
      const remaining = subProves.filter((s) => s.id !== subProvaId);
      setSubProves(remaining);
      if (selectedId === subProvaId) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(`Subprova "${name}" eliminada.`);
    } catch (err: any) {
      toast.error("Error al eliminar la subprova: " + err.message);
    }
  };

  return (
    <div className="flex h-full ">
      {/* ── Left sidebar: sub-prova list ─────────────────── */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="ml-3 mr-3">
          <Button variant="outline" className="m-1 h-[90%] " disabled={prova.isFinished}  onClick={() => setShowAddDialog(true)}>
            <PlusCircle/>
          </Button>
          {subProves.map((sp) => (
            <TabsTrigger onClick={() => setSelectedId(sp.id)} value={sp.id}>
              {sp.name}
                {!prova.isFinished && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    title="Eliminar subprova"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sp.id, sp.name);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
            </TabsTrigger>
            ))}
        </TabsList>
        {subProves.map((sp) => (
            <TabsContent value={sp.id}>
              <div className="flex-1 overflow-y-auto p-4">
                {!selectedSubProva ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {subProves.length === 0
                      ? "Crea la primera subprova amb el botó +"
                      : "Selecciona una subprova"}
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold">{selectedSubProva.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedSubProva.challengeType}
                        {selectedSubProva.winDirection !== "NONE" && (
                          <> · {selectedSubProva.winDirection === "ASC" ? "menys és millor" : "més és millor"}</>
                        )}
                      </p>
                    </div>

                    {loadingParticipants ? (
                      <p className="text-sm text-muted-foreground">Carregant participants...</p>
                    ) : participants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hi ha participants en aquesta subprova.</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,_1fr))] gap-3">
                        {participants.map((p) => (
                          <SubProvaResultRow
                            key={p.penyaId}
                            participant={p}
                            subProva={selectedSubProva}
                            provaId={prova.id}
                            year={year}
                            provaIsFinished={prova.isFinished}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            ))}
      </Tabs>
      {/* <div className="w-56 flex-shrink-0 border-r dark:border-gray-700 flex flex-col">

        <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
          <span className="text-sm font-semibold">Subpruebas</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Nova subprova"
            onClick={() => setShowAddDialog(true)}
            disabled={prova.isFinished}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {subProves.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">
              Encara no hi ha subpruebas. Afegeix-ne una!
            </p>
          ) : (
            subProves.map((sp) => (
              <div
                key={sp.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedId === sp.id ? "bg-muted font-semibold" : ""
                }`}
                onClick={() => setSelectedId(sp.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{sp.name}</p>
                  <p className="text-xs text-muted-foreground">{sp.challengeType}</p>
                </div>
                {!prova.isFinished && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    title="Eliminar subprova"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sp.id, sp.name);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div> */}

      {/* ── Right panel: results for selected sub-prova ──── */}


      <AdminAddSubProvaDialog
        open={showAddDialog}
        nextOrder={subProves.length}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
