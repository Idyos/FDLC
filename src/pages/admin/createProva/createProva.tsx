// pages/admin/createProva/CreateProva.tsx
import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldErrors, useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { createProva, getPenyes } from "@/services/database/Admin/adminDbServices";
import { CreateChallenge, createChallengeSchema, fieldStepMap,  } from "./createProvaData";
import { Prova, PenyaInfo, ProvaType, Ubication, EmptyProva, ParticipatingPenya } from "@/interfaces/interfaces";
import StepBasicInfo from "./components/steps/stepBasicInfo";
import StepTypeAndPenyes from "./components/steps/stepTypeAndPenyes";
import StepConfirm from "./components/steps/stepConfirm";
import { buildChallenge } from "./challengeFactory";
import { useProvaPreviewSync } from "./useProvaPreviewSync";
import LoadingAnimation from "@/components/shared/loadingAnim";
import StepPointsRange from "./components/steps/stepPointsRange";
import { navigateWithQuery } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

export default function CreateProva() {
  const navigate = useNavigate();
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

  const { selectedYear } = useYear();
  const [creatingProva, setCreatingProva] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const directionRef = useRef(1);

  const goToStep = (next: number) => {
    directionRef.current = next > currentStep ? 1 : -1;
    setCurrentStep(next);
  };
  const [location, setLocation] = useState<Ubication>({ lat: undefined, lng: undefined, name: undefined });
  const [penyes, setPenyes] = useState<ParticipatingPenya[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [penyaSearch, setPenyaSearch] = useState("");
  const [provaInfo, setProvaInfo] = useState<Prova>(new EmptyProva());

  const provaImageState = useState<File | null>(null);
  const [provaImage] = provaImageState;
  const provaImageUrl = useMemo(() => provaImage ? URL.createObjectURL(provaImage) : null, [provaImage]);

  // Previsualización sincronizada
  useProvaPreviewSync(form, provaImage, provaInfo, setProvaInfo);

  // Penyes
  useEffect(() => {
    setIsLoading(true);
    getPenyes(selectedYear, (data) => {
      setPenyes(data.map((p: PenyaInfo) => ({ index: -1, penyaId: p.id, name: p.name, participates: true, result: -1 })));
      setIsLoading(false);
    });
  }, [selectedYear]);

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
    setCreatingProva(1);
    const challenge = buildChallenge(data);

    createProva(selectedYear, challenge, provaImage, () => {
      toast.success("Prova creada correctament");
      setCreatingProva(2);
      setTimeout(() => navigateWithQuery(navigate, `/admin/prova`, { provaId: form.getValues("name"), year: selectedYear }), 2000); 
    }, (error) => {
      setCreatingProva(0);
      console.error(error);
      toast.error("Error al crear la prova");
    });
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
                <Button type="submit" className="ml-auto" disabled={creatingProva !== 0}>
                  {creatingProva === 0 ? "Crear prova" : creatingProva === 1 ? <LoaderCircle className="animate-spin" /> : "Prova creada!"}
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
