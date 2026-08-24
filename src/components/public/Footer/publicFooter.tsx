import { Github, Instagram, Linkedin, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SponsorBanner from "@/components/public/sponsorBanner";

const sombresImg = (fileName: string) => `/sombres/${encodeURIComponent(fileName)}`;

const nuriMember: { name: string; img?: string } = { name: "Nuri", img: sombresImg("NURI.jpg") };

const sombresMembers: { name: string; img?: string }[] = [
  { name: "Alex", img: sombresImg("Alex.jpg") },
  { name: "Blasco", img: sombresImg("Blasco.jpg") },
  { name: "Chris", img: sombresImg("Chris.jpg") },
  { name: "Claudio", img: sombresImg("Claudio.jpg") },
  // { name: "Estrada", img: sombresImg("ESTRADA.jpg") },
  { name: "Marc", img: sombresImg("Marc.jpg") },
  { name: "Mariona", img: sombresImg("Mariona.jpg") },
  { name: "Marta", img: sombresImg("Marta.jpg") },
  { name: "Oriol M.", img: sombresImg("Martorell.jpg") },
  // { name: "Oriol", img: sombresImg("ORIOL.jpg") },
  { name: "Panisel", img: sombresImg("Panisel.jpg") },
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
    <footer className="mt-8 pt-6 pb-20 md:pb-6 border-t border-border bg-neutral-200 dark:bg-neutral-900 w-screen relative left-1/2 right-1/2 -mx-[50vw]">
      <div className="max-w-[1280px] mx-auto px-4 md:pr-6 md:pl-24 flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-1">
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
                <div key={name} className="flex w-1/5 shrink-0 flex-col items-center gap-1 px-1.5 py-2 sm:w-1/9 sm:py-3">
                  <div
                    title={name}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border shadow-sm"
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
            <p className="mt-2 text-sm text-muted-foreground">
              Fet en ❤️ per
            </p>
            <div className="mt-2 mx-auto flex flex-row items-center gap-2 bg-secondary rounded-4xl p-3 w-fit">
              <div
                title="Javi"
                className="flex h-25 w-25 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border shadow-sm"
              >
                {nuriMember.img ? (
                  <img src="/yo.jpg" alt="Javi" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1>Javi Gauxachs Monserrat</h1>
                <div className="mt-3 flex items-start">
                  {socialLinks.map(({ label, href, icon: Icon }) => {
                    const isExternal = !href.startsWith("mailto:");
                    return (
                      <Button key={label} asChild variant="ghost" size="lg" title={label}>
                        <a href={href} {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}>
                          <Icon className="size-5" />
                          <span className="sr-only">{label}</span>
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <SponsorBanner variant="slim" />
      </div>
    </footer>
  );
}
