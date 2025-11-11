import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Trophy } from "lucide-react";
import { Prova } from "@/interfaces/interfaces";

interface ProvaInfoCardProps {
  prova: Prova;
}

export default function ProvaInfoCard({ prova }: ProvaInfoCardProps) {
  const {
    name,
    description,
    imageUrl,
    startDate,
    finishDate,
    challengeType,
    location,
    pointsRange,
    winDirection,
  } = prova;

  return (
    <Card className="max-h-[96svh] overflow-auto  shadow-md dark:bg-gray-900">
      {/* Imagen de cabecera */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-56 object-cover"
        />
      )}

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">{name}</CardTitle>
          <Badge variant="secondary">{challengeType}</Badge>
        </div>
        {description && (
          <CardDescription className="text-base mt-1">{description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Fecha y hora */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <p className="text-sm opacity-70">
            {startDate.toLocaleDateString()} | {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {finishDate 
              ? startDate.toLocaleDateString() === finishDate.toLocaleDateString()
                ? " - " + finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ` – ${finishDate.toLocaleDateString()} | ${finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ""}
          </p>
        </div>

        {/* Ubicación */}
        {location?.name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{location.name}</span>
          </div>
        )}

        <Separator />

        {/* Dirección de victoria */}
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>
            Com es guanya:{" "}
            <strong>
              {winDirection === "ASC"
                ? "Menor és millor"
                : winDirection === "DESC"
                ? "Major és millor"
                : "Sense direcció"}
            </strong>
          </span>
        </div>

        {/* Rangos de puntos */}
        <div className="mt-4 flex flex-col items-center">
          <h4 className="font-semibold mb-2">Punts per posició</h4>

          <div className="w-full max-w-sm border rounded-xl overflow-hidden divide-y dark:divide-gray-800 divide-gray-200">
            {pointsRange.map((r, idx) => {
              const isSingle = r.from === r.to
              const pos = isSingle ? r.from : undefined

              let badgeClass = "font-mono"
              let labelLeft: React.ReactNode =
                isSingle ? `#${r.from}` : (r.to === Infinity ? `#${r.from}+` : `#${r.from}-#${r.to}`)

              if (isSingle && (pos === 1 || pos === 2 || pos === 3)) {
                if (pos === 1) badgeClass += " bg-yellow-500/15 text-yellow-600 border-yellow-500/40"
                if (pos === 2) badgeClass += " bg-gray-400/15 text-gray-500 border-gray-400/40"
                if (pos === 3) badgeClass += " bg-amber-900/10 text-amber-800 border-amber-800/30"

                labelLeft = (
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> <p>#{pos}</p>
                    <span className="sr-only">Posició {pos}</span>
                  </span>
                )
              }

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center px-4 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={badgeClass}>
                      {labelLeft}
                    </Badge>
                  </div>
                  <span className="font-semibold text-right text-primary">{r.points} pts</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
