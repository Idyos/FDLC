
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

export async function generateProvaResults(year: number, provaId: string) {
  const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const provaSnap = await getDoc(provaRef);
  if (!provaSnap.exists()) throw new Error("No s'ha trobat la prova.");

  const provaData = provaSnap.data() as Prova;

  // 1️⃣ Obtener participantes
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const participantsSnap = await getDocs(participantsRef);
  const participants: PenyaProvaResultData[] = participantsSnap.docs.map(
    (d) => d.data() as PenyaProvaResultData
  );

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

  batch.update(provaRef, { isFinished: true });

  await batch.commit();

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
