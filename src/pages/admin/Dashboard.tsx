import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  Trophy,
  CheckCircle2,
  Clock,
  CalendarDays,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useYear } from "@/components/shared/Contexts/YearContext";
import { navigateWithQuery } from "@/utils/url";
import { cn } from "@/lib/utils";
import { PenyaInfo, PenyaProvaSummary, ChallengeResult } from "@/interfaces/interfaces";
import {
  getRankingRealTime,
  getProvesRealTime,
  getResultsInfoRealTime,
} from "@/services/database/publicDbService";

// ─── Colors per tipus de prova (hex per compatibilitat SVG) ───────────────────
const PROVA_TYPE_COLORS: Record<string, string> = {
  "Participació": "#6366f1",
  "Temps":        "#f59e0b",
  "Punts":        "#10b981",
  "Rondes":       "#ef4444",
  "MultiProva":   "#8b5cf6",
  "null":         "#6b7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: Date) =>
  d
    ? d.toLocaleDateString("ca-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ─── KpiCard ──────────────────────────────────────────────────────────────────
type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
};

function KpiCard({ icon, label, value, sub, accent }: KpiCardProps) {
  return (
    <Card className={cn(accent && "border-primary/50 bg-primary/5")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold truncate">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── ClassamentChart ──────────────────────────────────────────────────────────
function ClassamentChart({ data }: { data: { name: string; pts: number }[] }) {
  if (data.length === 0)
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sense penyes registrades
      </div>
    );

  const height = Math.max(240, data.length * 38);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: 8,
            fontSize: 13,
          }}
          cursor={{ fill: "rgba(128,128,128,0.08)" }}
          formatter={(v: number) => [v, "Punts"]}
        />
        <Bar
          dataKey="pts"
          fill="#6366f1"
          radius={[0, 4, 4, 0]}
          label={{ position: "right", fill: "#9ca3af", fontSize: 11 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── ProvaTypesChart ──────────────────────────────────────────────────────────
function ProvaTypesChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0)
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sense proves creades
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={PROVA_TYPE_COLORS[entry.name] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(v: number, name: string) => [v, name]}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── ProvesGrid ───────────────────────────────────────────────────────────────
function ProvesGrid({
  proves,
  onClickProva,
}: {
  proves: PenyaProvaSummary[];
  onClickProva: (id: string) => void;
}) {
  if (proves.length === 0)
    return (
      <p className="text-muted-foreground text-sm">Sense proves per a aquest any.</p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {proves.map((p) => (
        <button
          key={p.id}
          onClick={() => onClickProva(p.id)}
          className="text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "font-medium truncate flex-1",
                p.isSecret && "italic text-muted-foreground"
              )}
            >
              {p.isSecret ? "Secreta" : p.name}
            </span>
            {p.isFinished ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              style={{
                borderColor: PROVA_TYPE_COLORS[p.challengeType],
                color: PROVA_TYPE_COLORS[p.challengeType],
              }}
            >
              {p.challengeType}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmtDate(p.startDate)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── UltimesProvesTable ───────────────────────────────────────────────────────
function UltimesProvesTable({
  proves,
  winnerByProvaId,
}: {
  proves: PenyaProvaSummary[];
  winnerByProvaId: Record<string, string>;
}) {
  if (proves.length === 0)
    return <p className="text-muted-foreground text-sm">Sense proves acabades.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left pb-2 font-medium pr-4">Prova</th>
            <th className="text-left pb-2 font-medium pr-4">Tipus</th>
            <th className="text-left pb-2 font-medium pr-4">Guanyadora</th>
            <th className="text-left pb-2 font-medium">Data final</th>
          </tr>
        </thead>
        <tbody>
          {proves.map((p) => (
            <tr
              key={p.id}
              className="border-b last:border-0 hover:bg-accent/30 transition-colors"
            >
              <td className="py-2 pr-4 font-medium max-w-[160px] truncate">
                {p.isSecret ? (
                  <span className="italic text-muted-foreground">Secreta</span>
                ) : (
                  p.name
                )}
              </td>
              <td className="py-2 pr-4">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: PROVA_TYPE_COLORS[p.challengeType],
                    color: PROVA_TYPE_COLORS[p.challengeType],
                  }}
                >
                  {p.challengeType}
                </Badge>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {winnerByProvaId[p.id] ?? "—"}
              </td>
              <td className="py-2 text-muted-foreground whitespace-nowrap">
                {fmtDate(p.finishDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ParticipacioStats ────────────────────────────────────────────────────────
function ParticipacioStats({
  avgPart,
  minPts,
  maxPts,
  avgPts,
  hasData,
}: {
  avgPart: number;
  minPts: number;
  maxPts: number;
  avgPts: number;
  hasData: boolean;
}) {
  if (!hasData)
    return (
      <p className="text-muted-foreground text-sm">Sense resultats disponibles.</p>
    );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Participació mitjana per prova</span>
          <span className="font-semibold">{avgPart}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${avgPart}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Punts mínims", value: minPts },
          { label: "Punts mitjos", value: avgPts },
          { label: "Punts màxims", value: maxPts },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-lg font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  document.title = "Dashboard";
  const navigate = useNavigate();
  const { selectedYear } = useYear();

  const [ranking, setRanking] = useState<PenyaInfo[]>([]);
  const [proves, setProves] = useState<PenyaProvaSummary[]>([]);
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    let loaded = 0;
    const tryFinish = () => {
      if (++loaded >= 3) setIsLoading(false);
    };

    const unsubRanking = getRankingRealTime(selectedYear, (d) => {
      setRanking(d);
      tryFinish();
    });
    const unsubProves = getProvesRealTime(selectedYear, (d) => {
      setProves(d);
      tryFinish();
    });
    const unsubResults = getResultsInfoRealTime(selectedYear, (d) => {
      setResults(d);
      tryFinish();
    });

    return () => {
      unsubRanking();
      unsubProves();
      unsubResults();
    };
  }, [selectedYear]);

  const stats = useMemo(() => {
    const finished = proves.filter((p) => p.isFinished);
    const pending = proves.filter((p) => !p.isFinished);
    const pct =
      proves.length > 0 ? Math.round((finished.length / proves.length) * 100) : 0;

    const now = new Date();
    const nextProva =
      pending
        .filter((p) => p.startDate > now)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null;

    const leader = ranking.find((p) => p.position === 1) ?? null;

    const top10 = ranking.slice(0, 10).map((p) => ({
      name: p.isSecret ? "Secreta" : p.name,
      pts: p.totalPoints ?? 0,
    }));

    const typeCounts: Record<string, number> = {};
    proves.forEach((p) => {
      typeCounts[p.challengeType] = (typeCounts[p.challengeType] ?? 0) + 1;
    });
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

    const winnerByProvaId: Record<string, string> = {};
    results.forEach((r) => {
      if (r.index === 1) {
        const pid = r.provaReference.split("/").at(-1) ?? "";
        winnerByProvaId[pid] = r.penyaName;
      }
    });

    const lastFinished = [...finished]
      .sort((a, b) => (b.finishDate?.getTime() ?? 0) - (a.finishDate?.getTime() ?? 0))
      .slice(0, 5);

    const byProva: Record<string, { total: number; part: number }> = {};
    results.forEach((r) => {
      const pid = r.provaReference.split("/").at(-1) ?? "";
      if (!byProva[pid]) byProva[pid] = { total: 0, part: 0 };
      byProva[pid].total++;
      if (r.participates) byProva[pid].part++;
    });
    const rates = Object.values(byProva)
      .filter((v) => v.total > 0)
      .map((v) => v.part / v.total);
    const avgPart =
      rates.length > 0
        ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100)
        : 0;

    const penyaTotalsMap = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.penyaId] = (acc[r.penyaId] ?? 0) + r.pointsAwarded;
      return acc;
    }, {});
    const penyaTotals = Object.values(penyaTotalsMap);
    const minPts = penyaTotals.length ? Math.min(...penyaTotals) : 0;
    const maxPts = penyaTotals.length ? Math.max(...penyaTotals) : 0;
    const avgPts = penyaTotals.length
      ? Math.round(penyaTotals.reduce((a, b) => a + b, 0) / penyaTotals.length)
      : 0;

    return {
      totalPenyes: ranking.length,
      totalProves: proves.length,
      finishedCount: finished.length,
      pendingCount: pending.length,
      pct,
      nextProva,
      leader,
      top10,
      typeData,
      lastFinished,
      winnerByProvaId,
      avgPart,
      minPts,
      maxPts,
      avgPts,
    };
  }, [ranking, proves, results]);

  const handleProva = (id: string) =>
    navigateWithQuery(navigate, "/admin/prova", { provaId: id });

  return (
    <div className="space-y-6 p-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Carregant dades…
        </div>
      ) : (
        <>
          {/* Fila de KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label="Penyes registrades"
              value={stats.totalPenyes}
            />
            <KpiCard
              icon={<Trophy className="h-4 w-4" />}
              label="Proves creades"
              value={stats.totalProves}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Proves completades"
              value={stats.finishedCount}
              sub={stats.totalProves > 0 ? `${stats.pct}% del total` : undefined}
            />
            <KpiCard
              icon={<Clock className="h-4 w-4" />}
              label="Proves pendents"
              value={stats.pendingCount}
            />
            <KpiCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Pròxima prova"
              value={
                stats.nextProva
                  ? stats.nextProva.isSecret
                    ? "Secreta"
                    : stats.nextProva.name
                  : "Cap"
              }
              sub={
                stats.nextProva
                  ? fmtDate(stats.nextProva.startDate)
                  : "Sense proves pendents"
              }
            />
            <KpiCard
              icon={<Star className="h-4 w-4" />}
              label="Líder del circuit"
              value={
                stats.leader
                  ? stats.leader.isSecret
                    ? "Secreta"
                    : stats.leader.name
                  : "—"
              }
              sub={
                stats.leader ? `${stats.leader.totalPoints ?? 0} punts` : undefined
              }
              accent
            />
          </div>

          {/* Gràfics */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Classament (top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ClassamentChart data={stats.top10} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Distribució de proves</CardTitle>
              </CardHeader>
              <CardContent>
                <ProvaTypesChart data={stats.typeData} />
              </CardContent>
            </Card>
          </div>

          {/* Totes les proves */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Totes les proves ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProvesGrid proves={proves} onClickProva={handleProva} />
            </CardContent>
          </Card>

          {/* Últimes proves acabades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimes proves acabades</CardTitle>
            </CardHeader>
            <CardContent>
              <UltimesProvesTable
                proves={stats.lastFinished}
                winnerByProvaId={stats.winnerByProvaId}
              />
            </CardContent>
          </Card>

          {/* Estadístiques de participació */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Estadístiques de participació
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipacioStats
                avgPart={stats.avgPart}
                minPts={stats.minPts}
                maxPts={stats.maxPts}
                avgPts={stats.avgPts}
                hasData={results.length > 0}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
