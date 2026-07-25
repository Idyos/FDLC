import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelector } from "@/components/admin/locationSelector";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Ubication } from "@/interfaces/interfaces";
import { FileText, X } from "lucide-react";

type Props = {
  provaImageUrl: string | null;
  onImageAdded: (f: File) => void;
  provaRulesName: string | null;
  provaRulesUrl: string | null;
  onRulesAdded: (f: File) => void;
  onRulesRemoved: () => void;
  watchedStart: Date | null | undefined;
  watchedEnd: Date | null | undefined;
  onLocationChange: (location: Ubication) => void;

};

export default function StepBasicInfo({ provaImageUrl, onImageAdded, provaRulesName, provaRulesUrl, onRulesAdded, onRulesRemoved, watchedStart, watchedEnd, onLocationChange }: Props) {
  return (
    <>
      <FormField name="image" render={() => (
        <FormItem>
          <TooltipProvider>
            <Tooltip delayDuration={250}>
              <TooltipTrigger asChild className="left-0"><FormLabel>Imatge:</FormLabel></TooltipTrigger>
              <TooltipContent>Es recomana utilitzar imatges en format horitzontal</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <FormControl>
            <div
              className="h-43 w-full relative flex items-center justify-center border-2 border-dashed rounded-lg bg-center bg-contain bg-no-repeat"
              style={{ backgroundImage: provaImageUrl ? `url(${provaImageUrl})` : "none" }}
            >
              {!provaImageUrl && <span className="text-sm text-gray-500">Arrossega una imatge o fes clic</span>}
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
      )} />

      <FormField name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nom: *</FormLabel>
          <FormControl><Input placeholder="Nom de la prova" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Descripció:</FormLabel>
          <FormControl><Textarea placeholder="Descripció de la prova" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField name="location" render={() => (
        <FormItem>
          <FormLabel>Ubicació:</FormLabel>
          <FormControl><LocationSelector onLocationChange={onLocationChange} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField name="imagesLink" render={({ field }) => (
        <FormItem>
          <FormLabel>Enllaç d'imatges:</FormLabel>
          <FormControl>
            <Input type="url" placeholder="https://... (p. ex. galeria de fotos)" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField name="rules" render={() => (
        <FormItem>
          <FormLabel>Normes (PDF):</FormLabel>
          <FormControl>
            <div className="h-16 w-full relative flex items-center gap-3 border-2 border-dashed rounded-lg px-4">
              <FileText className="shrink-0 text-gray-500" />
              <span className="text-sm text-gray-500 truncate">
                {provaRulesName ?? (provaRulesUrl ? "PDF de normes carregat" : "Arrossega un PDF de normes o fes clic")}
              </span>
              {provaRulesUrl && (
                <a
                  href={provaRulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 ml-auto text-sm underline shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  Veure
                </a>
              )}
              {provaRulesUrl && (
                <button
                  type="button"
                  aria-label="Eliminar PDF"
                  className="relative z-10 shrink-0 rounded-full p-1 text-gray-500 hover:bg-muted hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRulesRemoved();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Input
                type="file"
                accept="application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onRulesAdded(file);
                }}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Fechas */}
      <div className="flex flex-row space-x-8">
        <FormField name="startDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Inici: *</FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                max={watchedEnd ? new Date(watchedEnd.getTime() - watchedEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                value={field.value ? new Date(new Date(field.value).getTime() - new Date(field.value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="endDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Finalització:</FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                min={watchedStart ? new Date(watchedStart.getTime() - watchedStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                value={field.value ? new Date(new Date(field.value).getTime() - new Date(field.value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = v ? new Date(v) : null;
                  const start = watchedStart;
                  if (next && start && next < start) { field.onChange(start); return; }
                  field.onChange(next);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );
}
