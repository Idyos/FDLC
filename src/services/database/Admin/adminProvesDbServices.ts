
import {
  doc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { Prova, PenyaProvaFinalResultData, PenyaProvaResultData } from "@/interfaces/interfaces";
import { db } from "@/firebase/firebase";
import { deleteUsersWithProva } from "@/services/usersService";
import { getProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";
import { calculateGroupStandings } from "@/features/bracket/bracketDomain";
import type { StoredProvaBracketDoc } from "@/features/bracket/types";

/** Derives a teamId → position map from a stored bracket doc.
 *  Returns an empty map if the final match has not been played yet. */
export function deriveBracketPositions(saved: StoredProvaBracketDoc): Map<string, number> {
  const { bracket, thirdPlaceMatch } = saved.finalStage;
  const { matches, bracketSize } = bracket;
  const positionMap = new Map<string, number>();

  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  const finalMatch = matches.find((m) => m.roundNumber === totalRounds);
  if (!finalMatch?.winnerTeamId) return positionMap;

  const semifinalRound = totalRounds - 1;

  positionMap.set(finalMatch.winnerTeamId, 1);
  const finalLoserIdx = finalMatch.winnerSlot === "A" ? 1 : 0;
  const finalLoserTeamId = finalMatch.teams[finalLoserIdx]?.teamId;
  if (finalLoserTeamId) positionMap.set(finalLoserTeamId, 2);

  if (thirdPlaceMatch?.status === "finished" && thirdPlaceMatch.winnerTeamId) {
    positionMap.set(thirdPlaceMatch.winnerTeamId, 3);
    if (thirdPlaceMatch.loserTeamId) positionMap.set(thirdPlaceMatch.loserTeamId, 4);
  }

  for (let r = totalRounds - 1; r >= 1; r--) {
    const roundMatches = matches.filter((m) => m.roundNumber === r && m.status === "finished");
    for (const m of roundMatches) {
      if (!m.winnerSlot || !m.winnerTeamId) continue;
      const loserIdx = m.winnerSlot === "A" ? 1 : 0;
      const loserTeamId = m.teams[loserIdx]?.teamId;
      if (!loserTeamId || positionMap.has(loserTeamId)) continue;
      if (r === semifinalRound) {
        positionMap.set(loserTeamId, 3);
      } else {
        positionMap.set(loserTeamId, bracketSize / Math.pow(2, r) + 1);
      }
    }
  }

  if (saved.mode === "groups_to_final" && saved.groupStage) {
    const { groups } = saved.groupStage;
    const numGroups = groups.length;
    const groupLoserBasePos = bracketSize + 1;
    for (const group of groups) {
      const standings = calculateGroupStandings(group.matches, group.teamIds);
      let loserTier = 0;
      for (const standing of standings) {
        if (positionMap.has(standing.teamId)) continue;
        positionMap.set(standing.teamId, groupLoserBasePos + loserTier * numGroups);
        loserTier++;
      }
    }
  }

  return positionMap;
}

export async function generateProvaResults(year: number, provaId: string) {
  const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const provaSnap = await getDoc(provaRef);
  if (!provaSnap.exists()) throw new Error("No s'ha trobat la prova.");

  const provaData = provaSnap.data() as Prova;

  // 1️⃣ Obtener participantes
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const participantsSnap = await getDocs(participantsRef);
  const participants: PenyaProvaResultData[] = participantsSnap.docs.map((d) => {
    const r = d.data();
    const rawResult = r.result;
    let numResult: number;
    if (rawResult == null) numResult = -1;
    else if (typeof rawResult === "number") numResult = rawResult;
    else if (typeof rawResult === "string") numResult = rawResult === "" ? -1 : (parseInt(rawResult) || -1);
    else numResult = -1;
    return new PenyaProvaResultData(
      `Circuit/${year}/Proves/${provaId}`,
      r.provaType ?? provaData.challengeType,
      r.penyaId ?? d.id,
      r.penyaName ?? "",
      numResult,
      r.participates ?? true,
    );
  });

  if (participants.length === 0) throw new Error("No hi ha participants.");

  // 2️⃣ Separar válidos e inválidos
  const valid = participants.filter((p) => p.participates && p.result > -1);
  const invalid = participants.filter((p) => !p.participates || p.result <= -1 || p.result == null);

  // 3️⃣ Ordenar válidos según winDirection
  if (provaData.winDirection === "ASC") {
    valid.sort((a, b) => a.result - b.result);
  } else if (provaData.winDirection === "DESC") {
    valid.sort((a, b) => b.result - a.result);
  }

  // 4️⃣ Ordenar inválidos alfabéticamente
  invalid.sort((a, b) => (a.penyaName || "").localeCompare(b.penyaName || ""));

  // 5️⃣ Combinar ambos
  const sorted = [...valid, ...invalid];

  // 6️⃣ Calcular resultados finales
  const results: PenyaProvaFinalResultData[] = sorted.map((p, index) => {
    let position = 0;
    let pointsAwarded = 0;

    if (p.participates && p.result > -1) {
      position = index + 1;
      const range = provaData.pointsRange.find(
        (r) => position >= r.from && position <= r.to
      );
      if (range) pointsAwarded = range.points;
    }

    return {
      penyaId: p.penyaId,
      name: p.penyaName,
      position,
      pointsAwarded,
      result: p.result,
    };
  });

  // 7️⃣ Guardar en batch
  const batch = writeBatch(db);
  const resultRef = doc(db, `Circuit/${year}/Results/${provaId}`);

  batch.set(resultRef, {
    provaId,
    createdAt: serverTimestamp(),
    name: provaData.name,
    challengeType: provaData.challengeType,
    results,
  });

  batch.update(provaRef, { isFinished: true, finishDate: serverTimestamp() });

  await batch.commit();

  // Delete temporary users whose access was limited to this prova
  await deleteUsersWithProva(provaId);

  return results;
}

export async function openProva(year: number, provaId: string){
    const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
    const resultsRef = doc(db, `Circuit/${year}/Results/${provaId}`);

    const batch = writeBatch(db);

    batch.delete(resultsRef);
    batch.update(provaRef, { isFinished: false });

    await batch.commit();
}

export async function generateBracketResults(year: number, provaId: string) {
  // 1. Load prova
  const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const provaSnap = await getDoc(provaRef);
  if (!provaSnap.exists()) throw new Error("No s'ha trobat la prova.");
  const provaData = provaSnap.data() as Prova;

  // 2. Load bracket
  const saved = await getProvaBracket(year, provaId);
  if (!saved) throw new Error("No hi ha cap quadre generat.");

  const { bracket, thirdPlaceMatch } = saved.finalStage;
  const { matches, bracketSize } = bracket;

  // 3. Load participants
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const participantsSnap = await getDocs(participantsRef);
  const participants = participantsSnap.docs.map((d) => d.data() as PenyaProvaResultData);

  if (participants.length === 0) throw new Error("No hi ha participants.");

  // 4. Find the final match and validate it has been played
  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  const finalMatch = matches.find((m) => m.roundNumber === totalRounds);
  if (!finalMatch?.winnerTeamId) throw new Error("La final encara no s'ha jugat.");

  // 5. Build teamId → position map
  const positionMap = new Map<string, number>();
  const semifinalRound = totalRounds - 1;

  // Final: winner → 1, loser → 2
  positionMap.set(finalMatch.winnerTeamId, 1);
  const finalLoserIdx = finalMatch.winnerSlot === "A" ? 1 : 0;
  const finalLoserTeamId = finalMatch.teams[finalLoserIdx]?.teamId;
  if (finalLoserTeamId) positionMap.set(finalLoserTeamId, 2);

  // 3rd place match (when played): winner → 3, loser → 4
  if (thirdPlaceMatch?.status === "finished" && thirdPlaceMatch.winnerTeamId) {
    positionMap.set(thirdPlaceMatch.winnerTeamId, 3);
    if (thirdPlaceMatch.loserTeamId) positionMap.set(thirdPlaceMatch.loserTeamId, 4);
  }

  // All other rounds: loser gets startPos = bracketSize / 2^round + 1
  for (let r = totalRounds - 1; r >= 1; r--) {
    const roundMatches = matches.filter((m) => m.roundNumber === r && m.status === "finished");
    for (const m of roundMatches) {
      if (!m.winnerSlot || !m.winnerTeamId) continue;
      const loserIdx = m.winnerSlot === "A" ? 1 : 0;
      const loserTeamId = m.teams[loserIdx]?.teamId;
      if (!loserTeamId || positionMap.has(loserTeamId)) continue;

      if (r === semifinalRound) {
        // Semifinal losers: 3rd place match not played → share position 3
        positionMap.set(loserTeamId, 3);
      } else {
        const startPos = bracketSize / Math.pow(2, r) + 1;
        positionMap.set(loserTeamId, startPos);
      }
    }
  }

  // 5b. Groups-to-final: assign positions to group-stage losers
  if (saved.mode === "groups_to_final" && saved.groupStage) {
    const { groups } = saved.groupStage;
    const numGroups = groups.length;
    const groupLoserBasePos = bracketSize + 1;

    for (const group of groups) {
      const standings = calculateGroupStandings(group.matches, group.teamIds);
      let loserTier = 0;
      for (const standing of standings) {
        if (positionMap.has(standing.teamId)) continue; // already positioned by the final bracket
        positionMap.set(standing.teamId, groupLoserBasePos + loserTier * numGroups);
        loserTier++;
      }
    }
  }

  // 6. Build result entries
  const results: PenyaProvaFinalResultData[] = participants.map((p) => {
    const position = positionMap.get(p.penyaId) ?? 0;
    let pointsAwarded = 0;
    if (position > 0) {
      const range = provaData.pointsRange?.find((r) => position >= r.from && position <= r.to);
      if (range) pointsAwarded = range.points;
    }
    return { penyaId: p.penyaId, name: p.penyaName, position, pointsAwarded, result: p.result ?? -1 };
  });

  // 7. Batch write results + mark finished
  const batch = writeBatch(db);
  const resultRef = doc(db, `Circuit/${year}/Results/${provaId}`);
  batch.set(resultRef, {
    provaId,
    createdAt: serverTimestamp(),
    name: provaData.name,
    challengeType: provaData.challengeType,
    results,
  });
  batch.update(provaRef, { isFinished: true, finishDate: serverTimestamp() });
  await batch.commit();

  await deleteUsersWithProva(provaId);
  return results;
}
