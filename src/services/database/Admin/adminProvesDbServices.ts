
import {
  doc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Prova, PenyaProvaFinalResultData, PenyaProvaResultData } from "@/interfaces/interfaces";
import { db, functions } from "@/firebase/firebase";
import { deleteUsersWithProva } from "@/services/usersService";
import { getProvaBracket } from "@/services/database/Admin/adminBracketsDbServices";
import { calculateGroupStandings, computeBracketPositions } from "@/features/bracket/bracketDomain";
import type { StoredProvaBracketDoc } from "@/features/bracket/types";
import { assignStandardCompetitionPositions } from "@/utils/sorting";

/** Derives a teamId → position map from a stored bracket doc.
 *  Returns an empty map if the final match has not been played yet. */
export function deriveBracketPositions(saved: StoredProvaBracketDoc): Map<string, number> {
  const { bracket, thirdPlaceMatch } = saved.finalStage;
  const positionMap = computeBracketPositions(bracket, thirdPlaceMatch);

  if (saved.mode === "groups_to_final" && saved.groupStage) {
    const { groups } = saved.groupStage;
    const numGroups = groups.length;
    const groupLoserBasePos = bracket.bracketSize + 1;
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

/** Denormalizes the per-penya position/points onto the Participants docs, so
 *  the public penya page can read them from a doc it already fetches instead
 *  of scanning the whole Results collection. This is a plain overwrite of the
 *  value just computed for this close — not a running counter — so re-closing
 *  a prova can never drift it out of sync. Mutates the given batch. */
function applyResultsToBatch(
  batch: ReturnType<typeof writeBatch>,
  year: number,
  provaId: string,
  results: PenyaProvaFinalResultData[]
) {
  results.forEach((r) => {
    const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${r.penyaId}`);
    batch.update(participantRef, { pointsAwarded: r.pointsAwarded, position: r.position });
  });
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
    else if (typeof rawResult === "string") {
      if (rawResult === "") numResult = -1;
      else {
        const parsed = parseInt(rawResult, 10);
        numResult = Number.isNaN(parsed) ? -1 : parsed;
      }
    }
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

  // 6️⃣ Calcular resultados finales (posicions ex aequo comparteixen posició)
  const validPositions = assignStandardCompetitionPositions(
    valid,
    (a, b) => a.result === b.result
  );
  const results: PenyaProvaFinalResultData[] = sorted.map((p, index) => {
    let position = -1;
    let pointsAwarded = 0;

    if (index < valid.length) {
      position = validPositions[index];
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
      result: p.result > -1 ? String(p.result) : "",
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

  applyResultsToBatch(batch, year, provaId, results);

  await batch.commit();

  // Delete temporary users whose access was limited to this prova
  await deleteUsersWithProva(provaId);

  return results;
}

export async function openProva(year: number, provaId: string){
    const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
    const resultsRef = doc(db, `Circuit/${year}/Results/${provaId}`);

    const resultsSnap = await getDoc(resultsRef);
    const previousResults: PenyaProvaFinalResultData[] = resultsSnap.exists()
      ? (resultsSnap.data().results ?? [])
      : [];

    const batch = writeBatch(db);

    previousResults.forEach((r) => {
      const participantRef = doc(db, `Circuit/${year}/Proves/${provaId}/Participants/${r.penyaId}`);
      batch.update(participantRef, { pointsAwarded: deleteField(), position: deleteField() });
    });

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
  const participants = participantsSnap.docs.map((d) => {
    const r = d.data();
    return {
      penyaId: typeof r.penyaId === "string" ? r.penyaId : d.id,
      penyaName: typeof r.penyaName === "string" ? r.penyaName : "",
      result: typeof r.result === "string" ? r.result : "",
    };
  });

  if (participants.length === 0) throw new Error("No hi ha participants.");

  // 4. Find the final match and validate it has been played
  const totalRounds = Math.max(...matches.map((m) => m.roundNumber));
  const finalMatch = matches.find((m) => m.roundNumber === totalRounds);
  if (!finalMatch?.winnerTeamId) throw new Error("La final encara no s'ha jugat.");

  // 5. Build teamId → position map
  const positionMap = computeBracketPositions(bracket, thirdPlaceMatch);

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
    const position = positionMap.get(p.penyaId) ?? -1;
    let pointsAwarded = 0;
    if (position > 0) {
      const range = provaData.pointsRange?.find((r) => position >= r.from && position <= r.to);
      if (range) pointsAwarded = range.points;
    }
    return { penyaId: p.penyaId, name: p.penyaName, position, pointsAwarded, result: p.result };
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
  applyResultsToBatch(batch, year, provaId, results);
  await batch.commit();

  await deleteUsersWithProva(provaId);
  return results;
}

/** Manual escape hatch: re-runs the same recompute the onWrite Cloud
 *  Functions do automatically, on demand — see recomputeProvaParticipantsFn
 *  in functions/src/proves/updateProvaParticipants.ts. Use when the public
 *  `penyes` field looks stale and a trigger may have failed. */
export const recomputeProvaParticipants = async (year: number, provaId: string): Promise<void> => {
  const fn = httpsCallable(functions, "recomputeProvaParticipants");
  await fn({ year, provaId });
};
