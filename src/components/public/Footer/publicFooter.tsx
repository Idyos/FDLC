import { Github, Instagram, Linkedin, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SponsorBanner from "@/components/public/sponsorBanner";

const sombresImg = (fileName: string) => `/sombres/${encodeURIComponent(fileName)}`;

const nuriMember: { name: string; img?: string } = { name: "Nuri", img: sombresImg("NURI.jpg") };

const sombresMembers: { name: string; img?: string }[] = [
  { name: "Alex", img: sombresImg("ALEX.jpg") },
  { name: "Blasco", img: sombresImg("BLASCO.jpg") },
  { name: "Chris", img: sombresImg("CHRIS.jpg") },
  { name: "Claudio", img: sombresImg("CLAUDIO.jpg") },
  { name: "Estrada", img: sombresImg("ESTRADA.jpg") },
  { name: "Marc", img: sombresImg("MARC.jpg") },
  { name: "Mariona", img: sombresImg("MARIONA.jpg") },
  { name: "Marta", img: sombresImg("MARTA.jpg") },
  { name: "Martorell", img: sombresImg("MARTORELL.jpg") },
  { name: "Oriol", img: sombresImg("ORIOL.jpg") },
  { name: "Panisel", img: sombresImg("PANISEL 2.jpg") },
];

const socialLinks = [
  {
    label: "Envia'ns un correu",
    href: "mailto:javi.gauxachs@gmail.com",
    icon: Mail,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/javigauxachs",
    icon: Instagram,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/javigauxachsmonserrat",
    icon: Linkedin,
  },
  {
    label: "GitHub",
    href: "https://github.com/Idyos",
    icon: Github,
  },
];

export default function PublicFooter() {
  return (
    <footer className="mt-8 pt-6 px-4 md:px-6 pb-20 md:pb-6 border-t border-border bg-gray-100 dark:bg-neutral-900 flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Les sombres
          </h2>
          <div className="flex w-full shrink-0 flex-col items-center justify-center gap-1">
            <div
              title={nuriMember.name}
              className="flex h-25 w-25 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border shadow-sm"
            >
              {nuriMember.img ? (
                <img src={nuriMember.img} alt={nuriMember.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-bold">{nuriMember.name}</span>
          </div>

          <div className="mt-3 flex w-full flex-wrap justify-center">
            {sombresMembers.map(({ name, img }) => (
              <div key={name} className="flex w-1/4 shrink-0 flex-col items-center gap-1 px-1.5 py-2 sm:w-1/6 sm:py-3">
                <div
                  title={name}
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border shadow-sm"
                >
                  {img ? (
                    <img src={img} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <span className="w-full truncate text-center text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Som l'equip que organitza el Circuit de penyes: preparem les proves, mantenim el
            rànquing al dia i som a peu de pista sempre que cal.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Si tens dubtes sobre una prova, una puntuació o vols proposar-nos alguna cosa,
            contacta amb una de les sombres el dia de la prova o escriu-nos.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Creador de la web
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aquesta web ha estat dissenyada i desenvolupada per Javier Gauxachs.
          </p>
          <div className="mt-3 flex items-center gap-1">
            {socialLinks.map(({ label, href, icon: Icon }) => {
              const isExternal = !href.startsWith("mailto:");
              return (
                <Button key={label} asChild variant="ghost" size="icon" title={label}>
                  <a href={href} {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}>
                    <Icon />
                    <span className="sr-only">{label}</span>
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <Separator />

      <SponsorBanner variant="slim" />
    </footer>
  );
}
