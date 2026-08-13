import { Github, Instagram, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SponsorBanner from "@/components/public/sponsorBanner";

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
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Les sombres
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
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
