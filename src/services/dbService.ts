// src/services/dbService.js
import { PenyaInfo, PenyaProvaSummary, PenyaRankingSummary } from "@/interfaces/interfaces";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, onSnapshot, orderBy, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";

export const getYears = async (
  onSuccess: (data: number[]) => void,
  onError?: (error: unknown) => void
) => {
  const yearsRef = collection(db, "Circuit");

  return getDocs(yearsRef)
    .then((snapshot) => {
      const years = snapshot.docs.map((doc) => parseInt(doc.id));
      onSuccess(years);
    })
    .catch((error) => {
      toast.error(`Error al recuperar els anys: ${error.message}`);
      console.error("Error fetching years:", error);
      if (onError) {
        onError(error);
      }
    });
}

export const addPenyes = async (
  year: number,
  penyesNames: string[],
  callback: (result: boolean[]) => void
) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);
  const batch = writeBatch(db);

  const snapshot = await getDocs(penyesRef);
  const existingNames = snapshot.docs.map((doc) => doc.data().name);

  const results: boolean[] = [];

  penyesNames.forEach((name) => {
    if (!existingNames.includes(name)) {
      const newDocRef = doc(penyesRef, name);
      batch.set(newDocRef, {
        name: name,
        totalPoints: 0,
        isSecret: false,
      });
      results.push(true);
    } else {
      results.push(false);
    }
  });

  try {
    await batch.commit();
    console.log("Penyes afegides correctament.");
    callback(results);
  } catch (error) {
    console.error("Error afegint penyes:", error);
    callback(penyesNames.map(() => false));
  }
};

export const updatePenyaInfo = async (year: number, penyaId: string, name: string, isSecret: boolean) => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  try {
    await updateDoc(penyaRef, {
      name: name,
      isSecret: isSecret,
    });
    console.log("Penya updated successfully:", penyaId);
  } catch (error) {
    console.error("Error updating penya:", error);
  }
}

export const getPenyes = (year: number, callback: (data: PenyaInfo[]) => void) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);

  return getDocs(penyesRef)
  .then((data) => {
    const dataConstructed = data.docs.map((doc) => ({
      penyaId: doc.id,
      name: doc.data().name || doc.id,
      totalPoints: doc.data().totalPoints || 0,
      imageUrl: doc.data().imageUrl || undefined,
      position: 0,
      isSecret: doc.data().isSecret || false,
    }));

    callback(dataConstructed);
  }).catch((error) => {
    console.error("Error fetching rankings:", error);
  });
};

export const getRankingRealTime = (year: number, callback: (data: PenyaRankingSummary[]) => void) => {
  const rankingsRef = collection(db, `Circuit/${year}/Penyes`);
  const q = query(rankingsRef, orderBy("totalPoints", "desc"));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc, index) => ({
      penyaId: doc.id,
      name: doc.data().name || doc.id,
      totalPoints: doc.data().totalPoints || 0,
      imageUrl: doc.data().imageUrl || undefined,
      position: index + 1,
      directionChange: null,
      isSecret: doc.data().isSecret || false,
    }));

    callback(data);
  });
};

export const getPenyaInfoRealTime = (year: number, penyaId: string, callback: (data: PenyaInfo | null) => void) => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  return onSnapshot(penyaRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("No data found for penya:", penyaId);
      callback(null);
      return;
    }

    const data : PenyaInfo = {
      penyaId: snapshot.id,
      name: snapshot.data().name || snapshot.id,
      totalPoints: snapshot.data().totalPoints || 0,
      position: 0,
    };

    callback(data);
  });
};

export const getPenyaProvesRealTime = (year: number, penyaId: string, callback: (data: PenyaProvaSummary[]) => void) => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  const resultsRef = collection(db, `Circuit/${year}/Results`);

  const q = query(
    resultsRef,
    where("penyaReference", "==", penyaRef),
    orderBy("resultsDate", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      provaId: doc.id,
      provaReference: doc.data().provaReference.path,
      name: doc.data().name || doc.id,
      position: doc.data().position || 0,
      points: doc.data().points || 0,
      resultsDate: doc.data().resultsDate.toDate() || new Date(),
    }));

    callback(data);
  });
}