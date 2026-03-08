import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  allGroupMatchesPlayed,
  calculateGroupStandings,
  getSuggestedGroupWinner,
} from "@/features/bracket/bracketDomain";
import type {
  BracketTeamSnapshot,
  GroupState,
} from "@/features/bracket/types";

interface GroupMatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupState;
  teamById: Map<string, BracketTeamSnapshot>;
  onMatchResultChange: (
    matchId: string,
    scoreA: number | null,
    scoreB: number | null,
  ) => void;
  onWinnerChange: (groupId: string, teamId: string | null) => void;
}

export function GroupMatchesDialog({
  open,
  onOpenChange,
  group,
  teamById,
  onMatchResultChange,
  onWinnerChange,
}: GroupMatchesDialogProps) {
  const standings = useMemo(
    () => calculateGroupStandings(group.matches, group.teamIds),
    [group.matches, group.teamIds],
  );

  const allPlayed = useMemo(
    () => allGroupMatchesPlayed(group.matches),
    [group.matches],
  );

  const suggestedWinnerId = useMemo(
    () => (allPlayed ? getSuggestedGroupWinner(standings) : null),
    [allPlayed, standings],
  );

  const handleScoreChange = (
    matchId: string,
    rawScoreA: string,
    rawScoreB: string,
  ) => {
    if (rawScoreA !== "" && !/^\d+$/.test(rawScoreA)) return;
    if (rawScoreB !== "" && !/^\d+$/.test(rawScoreB)) return;

    const a = rawScoreA === "" ? null : parseInt(rawScoreA, 10);
    const b = rawScoreB === "" ? null : parseInt(rawScoreB, 10);

    onMatchResultChange(matchId, a, b);
  };

  const handleClearMatch = (matchId: string) => {
    onMatchResultChange(matchId, null, null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <DialogTitle>{group.groupName}</DialogTitle>
            {allPlayed && (
              <Badge variant="secondary">Tots els partits jugats</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Standings table */}
          <div>
            <p className="text-sm font-medium mb-2">Classificació</p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-xs">
                    <th className="px-3 py-2 text-left font-medium">Equip</th>
                    <th className="px-2 py-2 text-center font-medium w-10">PJ</th>
                    <th className="px-2 py-2 text-center font-medium w-10">V</th>
                    <th className="px-2 py-2 text-center font-medium w-10">E</th>
                    <th className="px-2 py-2 text-center font-medium w-10">D</th>
                    <th className="px-2 py-2 text-center font-medium w-10">GF</th>
                    <th className="px-2 py-2 text-center font-medium w-10">GC</th>
                    <th className="px-2 py-2 text-center font-medium w-12">Dif</th>
                    <th className="px-2 py-2 text-center font-medium w-12">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, index) => {
                    const name = teamById.get(s.teamId)?.name ?? s.teamId;
                    const isLeader = index === 0 && s.played > 0;
                    return (
                      <tr
                        key={s.teamId}
                        className={`border-t transition-colors ${isLeader ? "bg-primary/5 font-medium" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-4">
                              {index + 1}
                            </span>
                            {name}
                            {s.teamId === group.winnerTeamId && (
                              <Badge variant="secondary" className="text-xs py-0">
                                Guanyador
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">{s.played}</td>
                        <td className="px-2 py-2 text-center">{s.wins}</td>
                        <td className="px-2 py-2 text-center">{s.draws}</td>
                        <td className="px-2 py-2 text-center">{s.losses}</td>
                        <td className="px-2 py-2 text-center">{s.goalsFor}</td>
                        <td className="px-2 py-2 text-center">{s.goalsAgainst}</td>
                        <td className="px-2 py-2 text-center">
                          {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                        </td>
                        <td className="px-2 py-2 text-center font-bold">
                          {s.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Match list */}
          <div>
            <p className="text-sm font-medium mb-3">Partits</p>
            <div className="space-y-2">
              {group.matches.map((match) => {
                const nameA = teamById.get(match.teamAId)?.name ?? match.teamAId;
                const nameB = teamById.get(match.teamBId)?.name ?? match.teamBId;
                const isPlayed = match.scoreA !== null && match.scoreB !== null;

                let resultLabel: string | null = null;
                if (isPlayed) {
                  if (match.isDraw) resultLabel = "Empat";
                  else if (match.winnerTeamId === match.teamAId)
                    resultLabel = `Guanya ${nameA}`;
                  else resultLabel = `Guanya ${nameB}`;
                }

                return (
                  <div
                    key={match.matchId}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isPlayed ? "bg-muted/30" : ""
                    }`}
                  >
                    <span className="flex-1 text-right truncate">{nameA}</span>
                    <div className="w-14 shrink-0">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-8 px-1 text-center"
                        value={match.scoreA === null ? "" : String(match.scoreA)}
                        placeholder="—"
                        onChange={(e) =>
                          handleScoreChange(
                            match.matchId,
                            e.target.value,
                            match.scoreB === null ? "" : String(match.scoreB),
                          )
                        }
                      />
                    </div>
                    <span className="text-muted-foreground font-medium">–</span>
                    <div className="w-14 shrink-0">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-8 px-1 text-center"
                        value={match.scoreB === null ? "" : String(match.scoreB)}
                        placeholder="—"
                        onChange={(e) =>
                          handleScoreChange(
                            match.matchId,
                            match.scoreA === null ? "" : String(match.scoreA),
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <span className="flex-1 truncate">{nameB}</span>
                    {isPlayed && resultLabel && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {resultLabel}
                      </Badge>
                    )}
                    {isPlayed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => handleClearMatch(match.matchId)}
                        title="Esborrar resultat"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Winner selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Guanyador del grup</p>

            {allPlayed && suggestedWinnerId && (
              <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="text-sm flex-1">
                  Guanyador suggerit:{" "}
                  <span className="font-medium">
                    {teamById.get(suggestedWinnerId)?.name ?? suggestedWinnerId}
                  </span>
                </span>
                {group.winnerTeamId !== suggestedWinnerId && (
                  <Button
                    size="sm"
                    onClick={() => onWinnerChange(group.groupId, suggestedWinnerId)}
                  >
                    Confirmar
                  </Button>
                )}
                {group.winnerTeamId === suggestedWinnerId && (
                  <Badge variant="secondary">Confirmat</Badge>
                )}
              </div>
            )}

            {allPlayed && !suggestedWinnerId && (
              <p className="text-sm text-muted-foreground">
                Empat de punts — selecciona manualment el guanyador.
              </p>
            )}

            <Select
              value={group.winnerTeamId ?? "__NONE__"}
              onValueChange={(value) =>
                onWinnerChange(group.groupId, value === "__NONE__" ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sense seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Sense seleccionar</SelectItem>
                {standings.map((s) => (
                  <SelectItem key={s.teamId} value={s.teamId}>
                    {teamById.get(s.teamId)?.name ?? s.teamId}{" "}
                    <span className="text-muted-foreground">({s.points} pts)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
