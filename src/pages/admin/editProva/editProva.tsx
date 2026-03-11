import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldErrors, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { useYear } from "@/components/shared/Contexts/YearContext";
import {
  getProvaInfo,
  getPenyes,
  updateProva,
} from "@/services/database/Admin/adminDbServices";
import {
  CreateChallenge,
  createChallengeSchema,
  fieldStepMap,
} from "../createProva/createProvaData";
import {
  Prova,
  PenyaInfo,
  ProvaType,
  Ubication,
  EmptyProva,
  ParticipatingPenya,
} from "@/interfaces/interfaces";
import StepBasicInfo from "../createProva/components/steps/stepBasicInfo";
import StepTypeAndPenyes from "../createProva/components/steps/stepTypeAndPenyes";
import StepConfirm from "../createProva/components/steps/stepConfirm";
import StepPointsRange from "../createProva/components/steps/stepPointsRange";
import { buildChallenge } from "../createProva/challengeFactory";
import { useProvaPreviewSync } from "../createProva/useProvaPreviewSync";
import LoadingAnimation from "@/components/shared/loadingAnim";
import { navigateWithQuery } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import ProvaInfoCard from "@/components/shared/Prova/provaInfoCard";

export default function EditProva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const provaId = searchParams.get("provaId") ?? "";
  const { selectedYear } = useYear();

  const form = useForm<CreateChallenge>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      pointsRange: [],
    },
  });

  const [loadingProva, setLoadingProva] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [savingProva, setSavingProva] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [location, setLocation] = useState<Ubication>({
    lat: undefined,
    lng: undefined,
    name: undefined,
  });
  const [penyes, setPenyes] = useState<ParticipatingPenya[]>([]);
  const [isPenyesLoading, setIsPenyesLoading] = useState(false);
  const [penyaSearch, setPenyaSearch] = useState("");
  const [provaInfo, setProvaInfo] = useState<Prova>(new EmptyProva());

  const provaImageState = useState<File | null>(null);
  const [provaImage] = provaImageState;
  const provaImageUrl = useMemo(
    () => (provaImage ? URL.createObjectURL(provaImage) : existingImageUrl ?? null),
    [provaImage, existingImageUrl]
  );

  useProvaPreviewSync(form, provaImage, provaInfo, setProvaInfo);

  // Load prova and penyes on mount
  useEffect(() => {
    if (!provaId) return;

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

      // Build the set of participating penyaIds from the prova
      const participatingSet = new Set(prova.penyes.map((p) => p.penyaId));

      // Merge all penyes with their participation status
      const mergedPenyes: ParticipatingPenya[] = allPenyes.map((p) => ({
        index: -1,
        penyaId: p.id,
        name: p.name,
        participates: participatingSet.has(p.id),
        result: -1,
      }));
      setPenyes(mergedPenyes);

      // Sync location state
      setLocation({
        lat: prova.location?.lat ?? undefined,
        lng: prova.location?.lng ?? undefined,
        name: prova.location?.name ?? undefined,
      });

      // Pre-populate form
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
  }, [provaId, selectedYear]);

  // Sync location → form
  useEffect(() => {
    form.setValue("location", {
      lat: location.lat ?? null,
      lng: location.lng ?? null,
      name: location.name ?? null,
    });
  }, [location, form]);

  // Sync penyes → form
  useEffect(() => {
    form.setValue(
      "penyes",
      penyes.map((p) => ({
        penya: { id: p.penyaId || "", name: p.name },
        participates: p.participates,
      }))
    );
  }, [penyes, form]);

  const watchedStart = form.watch("startDate");
  const watchedEnd = form.watch("endDate");
  const challengeType = form.watch("challengeType") as ProvaType | undefined;

  const onImageAdded = async (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Només s'accepta .jpg .png .webp o .gif");
      return;
    }
    provaImageState[1](file);
  };

  const onSubmit = (data: CreateChallenge) => {
    setSavingProva(1);
    const challenge = buildChallenge(data);
    // Preserve existing imageUrl if no new image
    challenge.imageUrl = provaImage ? undefined : existingImageUrl;

    updateProva(selectedYear, provaId, challenge, provaImage)
      .then(() => {
        toast.success("Prova actualitzada correctament");
        setSavingProva(2);
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
        setSavingProva(0);
        console.error(error);
      });
  };

  const onError = (errors: FieldErrors<CreateChallenge>) => {
    const first = Object.keys(errors)[0] as keyof CreateChallenge;
    if (first && fieldStepMap[first] !== undefined) setCurrentStep(fieldStepMap[first]);
    toast.error("Revisa els camps del formulari.");
  };

  const filteredPenyes = penyes.filter((p) =>
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

  const confirmStep = (
    <>
      <ProvaInfoCard prova={provaInfo} />
      <Button type="submit" disabled={savingProva !== 0}>
        {savingProva === 0 ? (
          "Guardar canvis"
        ) : savingProva === 1 ? (
          <LoaderCircle className="animate-spin mr-2" />
        ) : (
          "Canvis guardats!"
        )}
      </Button>
    </>
  );

  const steps = [
    {
      title: "Info. bàsica",
      content: (
        <StepBasicInfo
          provaImageUrl={provaImageUrl}
          onImageAdded={onImageAdded}
          watchedStart={watchedStart}
          watchedEnd={watchedEnd}
          onLocationChange={setLocation}
        />
      ),
    },
    {
      title: "Tipus i penyes",
      content: isPenyesLoading ? (
        <LoadingAnimation />
      ) : (
        <StepTypeAndPenyes
          challengeType={challengeType}
          penyaSearch={penyaSearch}
          setPenyaSearch={setPenyaSearch}
          filteredPenyes={filteredPenyes}
          onTogglePenya={(i, checked) => {
            setPenyes((prev) =>
              prev.map((p, idx) => (idx === i ? { ...p, participates: checked } : p))
            );
          }}
        />
      ),
    },
    {
      title: "Puntuaciós",
      content: <StepPointsRange challengeType={challengeType} />,
    },
    {
      title: "Confirmació",
      content: confirmStep,
    },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue={steps[0].title} value={steps[currentStep].title}>
        <TabsList className="rounded-3xl w-full mb-4 pl-1 pr-1">
          {steps.map((s, i) => (
            <TabsTrigger
              key={i}
              className="rounded-2xl"
              value={s.title}
              onClick={() => setCurrentStep(i)}
            >
              {s.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="max-h-[88svh] overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-4 pl-6 pr-6"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                className="space-y-4"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-6">
              {currentStep > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Enrere
                </button>
              )}
              {currentStep < steps.length - 1 && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Següent
                </button>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
