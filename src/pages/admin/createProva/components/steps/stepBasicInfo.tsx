import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelector } from "@/components/admin/locationSelector";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type Props = {
  provaImageUrl: string | null;
  onImageAdded: (f: File) => void;
  watchedStart: Date | null | undefined;
  watchedEnd: Date | null | undefined;
};

export default function StepBasicInfo({ provaImageUrl, onImageAdded, watchedStart, watchedEnd }: Props) {
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
          <FormControl><LocationSelector onLocationChange={() => { /* lo inyectas desde fuera si quieres */ }} /></FormControl>
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
