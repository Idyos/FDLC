
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { Prova, PenyaProvaFinalResultData, PenyaProvaResultData } from "@/interfaces/interfaces";
import { db } from "@/firebase/firebase";

export async function generateProvaResults(year: number, provaId: string) {
  const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const provaSnap = await getDoc(provaRef);
  if (!provaSnap.exists()) throw new Error("No s'ha trobat la prova.");

  const provaData = provaSnap.data() as Prova;

  // 1️⃣ Obtener participantes y resultados
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);
  const participantsSnap = await getDocs(participantsRef);
  const participants: PenyaProvaResultData[] = participantsSnap.docs.map((d) => d.data() as PenyaProvaResultData);

  if (participants.length === 0) throw new Error("No hi ha participants.");

  // 2️⃣ Ordenar según tipo de prova
  const sorted = [...participants].sort((a, b) => {
    if (provaData.winDirection === "ASC") return a.result - b.result;
    if (provaData.winDirection === "DESC") return b.result - a.result;
    return 0;
  });

  const results: PenyaProvaFinalResultData[] = sorted.map((p, index) => {
    let position = 0;
    let pointsAwarded = 0;
    
    if(p.participates && p.result > -1){  
      position = index + 1;
      
      const range = provaData.pointsRange.find(r => position >= r.from && position <= r.to);

      if(range) pointsAwarded = range.points;
    } 

    return {
      penyaId: p.penyaId,
      name: p.penyaName,
      position,
      pointsAwarded,
      result: p.result
    };
  });

  // 4️⃣ Guardar en Results
  const resultRef = doc(db, `Circuit/${year}/Results/${provaId}`);
  await setDoc(resultRef, {
    provaId,
    createdAt: serverTimestamp(),
    name: provaData.name,
    challengeType: provaData.challengeType,
    results,
  });

  await updateDoc(provaRef, { isFinished: true });

  return results;
}

export async function openProva(year: number, provaId: string){
    const provaRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
    await updateDoc(provaRef, { isFinished: false });
}
