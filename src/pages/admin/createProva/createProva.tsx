import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldErrors, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { LocationSelector } from "@/components/admin/locationSelector";
import { CreateChallenge, createChallengeSchema, fieldStepMap, ParticipatingPenya } from "./createProvaData";
import { BaseChallenge, ChallengeByDiscalification, ChallengeByParticipation, ChallengeByPoints, ChallengeByTime, MultiChallenge, PenyaInfo, ProvaType, provaTypes, Ubication } from "@/interfaces/interfaces";
import { toast } from "sonner";
import { useYear } from "@/components/shared/YearContext";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createProva, getPenyes } from "@/services/database/adminDbServices";
import LoadingAnimation from "@/components/shared/loadingAnim";

export default function CreateProva() {
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
  const [currentStep, setCurrentStep] = useState(0);
  const [location, setLocation] = useState<Ubication>({ lat: null, lng: null, name: null });

  const [provaImage, setProvaImage] = useState<File | null>(null);
  const provaImageUrl = useMemo(() => {
    return provaImage ? URL.createObjectURL(provaImage) : null;
  }, [provaImage]);

  const [penyes, setPenyes] = useState<ParticipatingPenya[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [penyaSearch, setPenyaSearch] = useState("");

  const watchedStart = form.watch("startDate");
  const watchedEnd = form.watch("endDate");

  document.title = "Crear Prova";

  useEffect(() => {
    form.setValue(
      "penyes",
      penyes.map((penya) => ({
        penya: { id: penya.penya.penyaId || "", name: penya.penya.name },
        participates: penya.participates,
      }))
    );
  }, [penyes]);

  useEffect(() => {
    setIsLoading(true);

    getPenyes(selectedYear, (data) => {
      setPenyes(
        data.map((penya: PenyaInfo) => ({ penya, participates: true }))
      );

      setIsLoading(false);
    });
  }, [selectedYear]);

  useEffect(() => {
    const finalLocation = {
      lat: location.lat,
      lng: location.lng,
      name: location.name,
    };
    form.setValue("location", finalLocation);

    console.log(form.getValues("startDate")?.toISOString().slice(0, 16), form.getValues("endDate")?.toISOString().slice(0, 16));

  }, [location]);

  const onSubmit = (data: CreateChallenge) => {
    console.log("Formulario enviado:", data);
    let challenge: BaseChallenge;
    switch(data.challengeType){
      case "Participació":
        challenge = new ChallengeByParticipation();
        break;
      case "Temps":
        challenge = new ChallengeByTime();
        break;
      case "Punts":
        challenge = new ChallengeByPoints();
        break;
      case "Rondes":
        challenge = new ChallengeByDiscalification();
        break;
      case "MultiProva":
        challenge = new MultiChallenge();
        break;
      default:
        toast.error("Tipus de prova no vàlid");
        return;
    }
    challenge.name = data.name;
    challenge.description = data.description;
    challenge.location = data.location;
    challenge.startDate = data.startDate;
    challenge.finishDate = data.endDate;
    challenge.challengeType = data.challengeType;
    challenge.winDirection = data.winDirection;
    challenge.penyes = data.penyes?.map((p) => ({
      penya: {
        penyaId: p.penya.id,
        name: p.penya.name,
      },
      participates: p.participates,
    })) ?? [];
    challenge.pointsRange = data.pointsRange.map((range) => ({
      from: range.from,
      to: range.to,
      points: range.points,
    }));

    createProva(selectedYear, challenge, provaImage, (sucessData) => {
      toast.success("Prova creada correctament");
      console.log("Prova creada:", sucessData);
    }, (error) => {
      console.error("Error al crear la prova:", error);
      toast.error("Error al crear la prova");
    })
  };


  const onError = (errors: FieldErrors<CreateChallenge>) => {
    const firstErrorKey = Object.keys(errors)[0] as keyof CreateChallenge;

    console.log("Errors:", errors);

    if (firstErrorKey && fieldStepMap[firstErrorKey] !== undefined) {
      setCurrentStep(fieldStepMap[firstErrorKey]);
    }

    toast.error("Revisa els camps del formulari.");
};


  const filteredPenyes = penyes.filter((penya) =>
    penya.penya.name.toLowerCase().includes(penyaSearch.toLowerCase())
  );
  const challengeType = form.watch("challengeType");

  const steps = [
    {
      title: "Info. bàsica",
      content: (
        <>
        <FormField
            name="image"
            render={() => (
              <FormItem>
                <TooltipProvider>
                <Tooltip delayDuration={250} >
                  <TooltipTrigger asChild className="left-0"><FormLabel>Imatge:</FormLabel></TooltipTrigger>
                  <TooltipContent>
                    <p>Es recomana utilitzar imatges en format horitzontal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
                
                <FormControl>
                  <div
                    className="h-43 w-full relative flex items-center justify-center border-2 border-dashed rounded-lg bg-center bg-contain bg-no-repeat"
                    style={{
                      backgroundImage: provaImageUrl ? `url(${provaImageUrl})` : "none",
                    }}
                  >
                    {!provaImage  && (
                      <span className="text-sm text-gray-500">Arrossega una imatge o fes clic</span>
                    )}

                    <Input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageAdded(file);
                      }}
                    />
                  </div>

                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom: *</FormLabel>
                <FormControl>
                  <Input placeholder="Nom de la prova" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripció:</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descripció de la prova" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <FormField
            control={form.control}
            name="location"
            render={() => (
              <FormItem>
                <FormLabel>Ubicació:</FormLabel>
                <FormControl>
                  <LocationSelector onLocationChange={setLocation}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-row space-x-8">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inici: *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    max={
                      watchedEnd
                        ? new Date(
                            watchedEnd.getTime() - watchedEnd.getTimezoneOffset() * 60000
                          ).toISOString().slice(0, 16)
                        : undefined
                    }
                    value={
                      field.value
                        ? new Date(
                            new Date(field.value).getTime() -
                            new Date(field.value).getTimezoneOffset() * 60000
                          ).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? new Date(value) : null);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Finalització:</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    min={
                      watchedStart
                        ? new Date(
                            watchedStart.getTime() - watchedStart.getTimezoneOffset() * 60000
                          ).toISOString().slice(0, 16)
                        : undefined
                    }
                    value={
                      
                      field.value
                        ? new Date(
                            new Date(field.value).getTime() -
                            new Date(field.value).getTimezoneOffset() * 60000
                          ).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      const next = value ? new Date(value) : null;
                      const start = watchedStart;
                      if (next && start && next < start) {
                        field.onChange(start);
                        return;
                      }
                      field.onChange(next);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>
        </>
      ),
    },
    {
      title: "Tipus i penyes",
      content: (
        <>
          <div className="flex flex-row space-x-8">
              <FormField
                control={form.control}
                name="challengeType"
                render={({ field }) => (
                  <FormItem id="challengeType">
                    <FormLabel htmlFor="challengeType">
                      Tipus de prova: *
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger id="challengeType">
                          <SelectValue placeholder="Selecciona tipus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {provaTypes.map((type: ProvaType, index) => (
                          <SelectItem key={index} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage /> {/* Aquí se muestran errores */}
                  </FormItem>
                )}
              />
              {challengeType === "Temps" || challengeType === "Punts" ? (
                <FormField
                  control={form.control}
                  name="winDirection"
                  render={({ field }) => (
                    <FormItem id="winDirection">
                      <FormLabel>Com es guanya: *</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger id="winDirection">
                            <SelectValue placeholder="Selecciona forma de guanyar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper">
                          <SelectItem value="NONE">Cap</SelectItem>
                          <SelectItem value="ASC">
                            {challengeType === "Punts"
                              ? "Com més punts millor"
                              : "Com més temps millor"}
                          </SelectItem>
                          <SelectItem value="DESC">
                            {challengeType === "Punts"
                              ? "Com menys punts millor"
                              : "Com menys temps millor"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
            {challengeType == undefined ||
            challengeType == "Participació" ? null : isLoading ? (
              <LoadingAnimation />
            ) : (
              <FormField
                control={form.control}
                name="penyes"
                render={({ field }) => (
                  <FormItem id="penyes">
                    <FormLabel>Penyes que hi participen: *</FormLabel>
                    <Input
                      value={penyaSearch}
                      id="penya"
                      placeholder="Buscar penya"
                      onChange={(e) => setPenyaSearch(e.target.value)}
                    />
                    <div className="grid grid-cols-[repeat(auto-fit,_minmax(160px,_1fr))] gap-2 w-full">
                      {filteredPenyes.map((penya, index) => (
                        <Card
                          className="h-15 flex flex-row justify-center items-center"
                          key={index}
                        >
                          <Checkbox
                            id={`penya-${index}`}
                            checked={penya.participates}
                            onCheckedChange={(checked) => {
                              const updatedPenyes = [...(field.value || [])];
                              updatedPenyes[index] = {
                                ...updatedPenyes[index],
                                participates: Boolean(checked),
                              };
                              field.onChange(updatedPenyes);

                              setPenyes((prevPenyes) =>
                                prevPenyes.map((p, i) =>
                                  i === index
                                    ? { ...p, participates: !p.participates }
                                    : p
                                )
                              );
                            }}
                          />
                          <Label
                            htmlFor={`penya-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {penya.penya.name}
                          </Label>
                        </Card>
                      ))}
                    </div>
                    <FormMessage /> {/* Aquí se muestran errores */}
                  </FormItem>
                )}
              />
            )}
        </>
      ),
    },
    {
      title: "Puntuacións",
      content: (
        <>
            <FormField
              control={form.control}
              name="pointsRange"
              render={({ field }) => (
                <FormItem id="pointsRange">
                  <FormLabel>Rangs de punts:</FormLabel>
                  {field.value?.map((pointsRange, index) => (
                    <div
                      key={index}
                      className="flex flex-row items-center gap-4 mb-2"
                    >
                      <p>Desde:</p>
                      <Input
                        className="max-w-16"
                        type="number"
                        max={pointsRange.to}
                        value={pointsRange.from}
                        onChange={(e) => {
                          const updated = field.value.map((range, i) =>
                            i === index
                              ? { ...range, from: parseInt(e.target.value) }
                              : range
                          );
                          field.onChange(updated);
                        }}
                      />
                      <p>fins a:</p>
                      <Input
                        className="max-w-16"
                        type="number"
                        min={pointsRange.from || 1}
                        value={pointsRange.to}
                        onChange={(e) => {
                          const updated = field.value.map((range, i) =>
                            i === index
                              ? { ...range, to: parseInt(e.target.value) }
                              : range
                          );
                          field.onChange(updated);
                        }}
                      />
                      <p>guanyaran:</p>
                      <Input
                        className="max-w-16"
                        type="number"
                        value={pointsRange.points}
                        onChange={(e) => {
                          const updated = field.value.map((range, i) =>
                            i === index
                              ? { ...range, points: parseInt(e.target.value) }
                              : range
                          );
                          field.onChange(updated);
                        }}
                      />
                      <p>punts</p>
                    </div>
                  ))}
                  <div className="flex gap-3">
                  <Badge
                    className="hover: cursor-pointer"
                    onClick={() => {
                      if(form.getValues("challengeType") == "Participació" && field.value.length > 0) {
                        toast.warning("No es pot afegir un rang més de punts, ja que el tipus de prova és 'Participació'");
                        return;
                      }
                      if (field.value.length > 0) {
                        const newRange = {
                          from: field.value[field.value.length - 1].to + 1,
                          to: field.value[field.value.length - 1].to + 1,
                          points: 1,
                        }

                        const updated = [...field.value, newRange];
                        field.onChange(updated);
                      } else {
                        toast.error(
                          `No es pot eliminar el rang de punts , ja que és l'únic que hi ha`
                        );
                      }
                    }}
                  >
                    +
                  </Badge>
                  <Badge
                    className="hover: cursor-pointer"
                    onClick={() => {
                      if (field.value.length > 1) {
                        const updated = field.value.slice(0, -1);
                        field.onChange(updated);
                      } else {
                        toast.error(`No es pot eliminar el rang de punts, ja que és l'únic que hi ha`);
                      }
                    }}
                  >
                    -
                  </Badge>
                  </div>
                  <FormMessage /> {/* Aquí se muestran errores */}
                </FormItem>
              )}
            />
        </>
      ),
    },
    {
      title: "Confirmació",
      content: <Button type="submit">Crear prova</Button>,
    },
  ];

  const onImageAdded = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Només es permeten fitxers d'Imatge (.jpg, .png o .webp)");
        return;
      }

      if(form.getValues("name") == "") {
        toast.error("El nom de la prova no pot estar buit");
        return;
      }

      setProvaImage(file);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue={steps[0].title} value={steps[currentStep].title}>
        <TabsList className="rounded-3xl w-full mb-4 pl-1 pr-1">
          {steps.map((step, index) => (
            <TabsTrigger
              className="rounded-2xl"
              key={index}
              value={step.title}
              onClick={() => setCurrentStep(index)}
            >
              {step.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="max-h-[88svh] overflow-y-auto">
        {/* <h2 className="text-xl font-semibold mb-4">
          {steps[currentStep].title}
        </h2> */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)}className="space-y-4 pl-6 pr-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
              className="space-y-4"
                key={currentStep}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Enrere
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Següent
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
