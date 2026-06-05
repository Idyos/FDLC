// pages/admin/createProva/CreateProva.tsx
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldErrors, useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { createProva, getPenyes, getProvaInfo, updateProva } from "@/services/database/Admin/adminDbServices";
import { CreateChallenge, createChallengeSchema, fieldStepMap } from "../createProva/createProvaData";
import { Prova, PenyaInfo, ProvaType, Ubication, EmptyProva, ParticipatingPenya } from "@/interfaces/interfaces";
import StepBasicInfo from "../createProva/components/steps/stepBasicInfo";
import StepTypeAndPenyes from "../createProva/components/steps/stepTypeAndPenyes";
import StepConfirm from "../createProva/components/steps/stepConfirm";
import { buildChallenge } from "../createProva/challengeFactory";
import { useProvaPreviewSync } from "../createProva/useProvaPreviewSync";
import LoadingAnimation from "@/components/shared/loadingAnim";
import StepPointsRange from "../createProva/components/steps/stepPointsRange";
import { navigateWithQuery } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

export default function CreateOrEditProva() {
    const navigate = useNavigate();
    const { selectedYear: contextYear } = useYear();

    const { pathname } = useLocation();
    const isCreating = pathname.includes("createProva");

    const [searchParams] = useSearchParams();
    const [provaId, setProvaId] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(contextYear);

    useEffect(() => {
        if (!isCreating) {
            setProvaId(searchParams.get("provaId") ?? null);
            const yearParam = parseInt(searchParams.get("year") ?? "");
            setSelectedYear(isNaN(yearParam) ? contextYear : yearParam);
        }
    }, [isCreating, searchParams, contextYear]);
  
    const form = useForm<CreateChallenge>({
        resolver: zodResolver(createChallengeSchema),
        defaultValues: {
        location: undefined,
        pointsRange: [
            { from: 1, to: 1, points: 15 },
            { from: 2, to: 2, points: 12 },
            { from: 3, to: 3, points: 10 },
            { from: 4, to: 4, points: 9 },
            { from: 5, to: 5, points: 8 },
            { from: 6, to: 7, points: 7 },
            { from: 8, to: 10, points: 6 },
            { from: 11, to: 13, points: 5 },
            { from: 14, to: 18, points: 4 },
            { from: 19, to: 36, points: 3 },
            { from: 37, to: Infinity, points: 1 },
        ],
        },
    });

    const [submitProva, setSettingProva] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const directionRef = useRef(1);

    const [loadingProva, setLoadingProva] = useState(isCreating ? false : true);
    const [isFinished, setIsFinished] = useState(false);
    const [isPenyesLoading, setIsPenyesLoading] = useState(false);

    const goToStep = (next: number) => {
        directionRef.current = next > currentStep ? 1 : -1;
        setCurrentStep(next);
    };

    const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);

    const [location, setLocation] = useState<Ubication>({ lat: undefined, lng: undefined, name: undefined });
    const [penyes, setPenyes] = useState<ParticipatingPenya[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [penyaSearch, setPenyaSearch] = useState("");
    const [provaInfo, setProvaInfo] = useState<Prova>(new EmptyProva());

    const provaImageState = useState<File | null>(null);
    const [provaImage] = provaImageState;
    const provaImageUrl = useMemo(() => provaImage ? URL.createObjectURL(provaImage) : null, [provaImage]);

    useProvaPreviewSync(form, provaImage, provaInfo, setProvaInfo);

    useEffect(() => {
        if (!isCreating && provaId) {
            setLoadingProva(true);
            setIsPenyesLoading(true);

            Promise.all([
                getProvaInfo(selectedYear, provaId),
                new Promise<PenyaInfo[]>((resolve) => getPenyes(selectedYear, resolve)),
            ]).then(([prova, allPenyes]) => {
                if (!prova) {
                    toast.error("No s'ha trobat la prova.");
                    navigate("/admin");
                    return;
                }

                setIsFinished(prova.isFinished);
                setExistingImageUrl(prova.imageUrl);

                const participatingSet = new Set(prova.penyes.map((p) => p.penyaId));

                const mergedPenyes: ParticipatingPenya[] = allPenyes.map((p) => ({
                    index: -1,
                    penyaId: p.id,
                    name: p.name,
                    participates: participatingSet.has(p.id),
                    result: "",
                }));
                setPenyes(mergedPenyes);

                setLocation({
                    lat: prova.location?.lat ?? undefined,
                    lng: prova.location?.lng ?? undefined,
                    name: prova.location?.name ?? undefined,
                });

                form.reset({
                    name: prova.name,
                    description: prova.description ?? "",
                    location: {
                        lat: prova.location?.lat ?? null,
                        lng: prova.location?.lng ?? null,
                        name: prova.location?.name ?? null,
                    },
                    startDate: prova.startDate instanceof Date ? prova.startDate : new Date(prova.startDate),
                    endDate: prova.finishDate
                        ? prova.finishDate instanceof Date
                            ? prova.finishDate
                            : new Date(prova.finishDate)
                        : undefined,
                    challengeType: prova.challengeType as ProvaType,
                    winDirection: prova.winDirection ?? "NONE",
                    intervalMinutes: prova.intervalMinutes,
                    maxPenyesPerSlot: prova.maxPenyesPerSlot,
                    pointsRange: prova.pointsRange,
                    penyes: mergedPenyes.map((p) => ({
                        penya: { id: p.penyaId, name: p.name },
                        participates: p.participates,
                    })),
                });

                setLoadingProva(false);
                setIsPenyesLoading(false);
            });
        } else if (isCreating) {
            setIsLoading(true);
            getPenyes(selectedYear, (data) => {
                setPenyes(data.map((p: PenyaInfo) => ({ index: -1, penyaId: p.id, name: p.name, participates: true, result: "" })));
                setIsLoading(false);
            });
        }
    }, [isCreating, provaId, selectedYear]);

    // form <-> location (normalizado a null)
    useEffect(() => {
        form.setValue("location", {
        lat: location.lat ?? null,
        lng: location.lng ?? null,
        name: location.name ?? null,
        });
    }, [location, form]);

    // form <-> penyes
    useEffect(() => {
        form.setValue("penyes", penyes.map(p => ({
        penya: { id: p.penyaId || "", name: p.name },
        participates: p.participates,
        })));
    }, [penyes, form]);

    const watchedStart = form.watch("startDate");
    const watchedEnd = form.watch("endDate");
    const challengeType = form.watch("challengeType") as ProvaType | undefined;

    const onImageAdded = async (file: File) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) { toast.error("Només s'accepta .jpg .png .webp o .gif"); return; }
        if (form.getValues("name") === "") { toast.error("Primer omple el nom de la prova"); return; }
        provaImageState[1](file);
    };

    // Submit
    const onSubmit = (data: CreateChallenge) => {
        setSettingProva(1);
        const challenge = buildChallenge(data);

        if(isCreating){
          createProva(selectedYear, challenge, provaImage, () => {
            toast.success("Prova creada correctament");
            setSettingProva(2);
            setTimeout(() => navigateWithQuery(navigate, `/admin/prova`, { provaId: form.getValues("name"), year: selectedYear }), 2000); 
          }, (error) => {
            setSettingProva(0);
            console.error(error);
            toast.error("Error al crear la prova. Mira la consola per mes detalls");
          });
        } else if(provaId) {
        // Preserve existing imageUrl if no new image
          challenge.imageUrl = provaImage ? undefined : existingImageUrl;
      
          updateProva(selectedYear, provaId, challenge, provaImage)
            .then(() => {
              toast.success("Prova actualitzada correctament");
              setSettingProva(2);
              setTimeout(
                () =>
                  navigateWithQuery(navigate, `/admin/prova`, {
                    provaId,
                    year: selectedYear,
                  }),
                1500
              );
            })
            .catch((error) => {
              setSettingProva(0);
              console.error(error);
              toast.error("Error al actualitzar la prova. Mira la consola per mes detalls");
            });
        } else {
          toast.error("Error al actualitzar la prova. No existeix la provaId")
        }
    };

    const onError = (errors: FieldErrors<CreateChallenge>) => {
        const first = Object.keys(errors)[0] as keyof CreateChallenge;
        if (first && fieldStepMap[first] !== undefined) setCurrentStep(fieldStepMap[first]);
        toast.error("Revisa els camps del formulari.");
    };

    // Datos visuales
    const filteredPenyes = penyes.filter(p =>
        p.name.toLowerCase().includes(penyaSearch.toLowerCase())
    );

    if (loadingProva) return <LoadingAnimation />;
    
      if (isFinished) {
        return (
          <div className="max-w-lg mx-auto mt-20 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <h2 className="text-xl font-semibold">Prova finalitzada</h2>
            <p className="text-muted-foreground">
              Aquesta prova ja ha generat resultats finals i no es pot editar.
            </p>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Tornar al panell
            </Button>
          </div>
        );
      }

  const steps = [
    { title: "Info. bàsica", content: (
      <StepBasicInfo
        provaImageUrl={provaImageUrl}
        onImageAdded={onImageAdded}
        watchedStart={watchedStart}
        watchedEnd={watchedEnd}
        onLocationChange={setLocation}
      />
    )},
    { title: "Tipus i penyes", content: (
      isLoading
        ? <LoadingAnimation />
        : <StepTypeAndPenyes
            challengeType={challengeType}
            penyaSearch={penyaSearch}
            setPenyaSearch={setPenyaSearch}
            filteredPenyes={filteredPenyes}
            onTogglePenya={(penyaId, checked) => {
              setPenyes(prev => prev.map((p) => p.penyaId === penyaId ? { ...p, participates: checked } : p));
            }}
          />
    )},
    { title: "Puntuacions", content: (
      <StepPointsRange challengeType={challengeType} />
    )},
    { title: "Confirmació", content: (
      <StepConfirm provaInfo={provaInfo} />
    )},
  ] as const;

  return (
    <div className="fixed inset-0 overflow-hidden pt-4 pb-4">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-3">
      <Tabs defaultValue={steps[0].title} value={steps[currentStep].title}>
        <TabsList className="rounded-3xl w-full pl-1 pr-1">
          {steps.map((s, i) => (
            <TabsTrigger key={i} className="rounded-2xl" value={s.title} onClick={() => goToStep(i)}>
              {s.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col flex-1 min-h-0 pl-6 pr-6">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep}
                  className="space-y-4 py-2"
                  initial={{ opacity: 0, x: directionRef.current * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: directionRef.current * -40 }}
                  transition={{ duration: 0.3 }}
                >
                  {steps[currentStep].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav bar — always pinned at bottom of flex */}
            <div className="flex justify-between py-4 border-t border-border">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)}>
                  <ChevronLeft /> Enrere
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button type="button" className="ml-auto" onClick={() => goToStep(currentStep + 1)}>
                  Següent <ChevronRight />
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button type="submit" className="ml-auto" disabled={submitProva !== 0}>
                  {submitProva === 0 ? (isCreating ? "Crear prova" : "Guardar canvis") : submitProva === 1 ? <LoaderCircle className="animate-spin" /> : (isCreating ? "Prova creada" : "Canvis guardats")}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
      </div>
    </div>
  );
}
