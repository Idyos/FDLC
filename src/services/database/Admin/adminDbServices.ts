import { Prova, PenyaInfo, EmptyProva, PenyaProvaResultData, ParticipatingPenya } from "@/interfaces/interfaces";
import { db } from "../../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { addImageToChallenges, addImageToPenyes } from "../../storageService";

//#region PROVES
export const getProves = async (
  year: number,
  callback: (data: Prova[]) => void
) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);

  try {
    const snap = await getDocs(provesRef);

    const proves: Prova[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();

      let prova = new EmptyProva();

      prova.id = docSnap.id;
      prova.reference = provesRef.path;
      prova.name = d.name || docSnap.id;
      prova.description = d.description || "";
      prova.imageUrl = d.imageUrl || undefined;
      prova.isSecret = d.isSecret || false;
      prova.isFinished = d.isFinished || false;
      prova.startDate = d.startDate?.toDate?.() ?? new Date(0);
      prova.finishDate = d.finishDate?.toDate?.() ?? undefined;
      prova.challengeType = d.challengeType || "null";
      prova.winDirection = d.winDirection || "NONE";
      prova.location = d.location || undefined;
      prova.pointsRange = d.pointsRange || [];
      prova.penyes = Array.isArray(d.penyes) ? d.penyes : [];

      return prova;
    });

    callback(proves);
  } catch (error) {
    console.error("Error obtenint proves:", error);
  }
};

export const createProva = async (
  year: number,
  data: Prova,
  image: File | null,
  onSuccess: (data: number[]) => void,
  onError?: (error: unknown) => void
) => {
  const provaRef = doc(db, `Circuit/${year}/Proves/${data.name}`);
  const batch = writeBatch(db);

      try {
        const url = await addImageToChallenges(image, year, data.name)
        console.log(url);
        batch.set(provaRef, {
          imageUrl: url ?? null,
          name: data.name ?? "",
          description: data.description ?? "",
          startDate: data.startDate ?? null,
          finishDate: data.finishDate ?? null,
          challengeType: data.challengeType,
          location: data.location ?? null,
          pointsRange: data.pointsRange,
          winDirection: data.winDirection ?? null,
          isFinished: false,
        });

        data.penyes.forEach((penyaInfo) => {
          const participantRef = doc(
            db,
            `Circuit/${year}/Proves/${data.name}/Participants/${penyaInfo.penyaId}`
          );

          let participantObject: {
            penyaId: string;
            penyaName: string;
            participates: boolean;
            result?: number;
          } = {
            penyaId: penyaInfo.penyaId,
            penyaName: penyaInfo.name,
            participates: penyaInfo.participates,
            result: -1,
          }

          batch.set(participantRef, participantObject);
        });

        await batch.commit();
        onSuccess([year]);
      } catch (error) {
        // manejar error
        console.error("Error al crear la prova:", error);
        toast.error("Error al crear la prova: " + error);
        if (onError) onError(error);
      }
};

export const updateProvaTimeResult = async (
  provaReference: string,
  penyaId: string,
  timeInSeconds: number,
  successCallback?: () => void,
  errorCallback?: (error: unknown) => void
) => {
  const participantRef = doc(db, provaReference, "Participants", penyaId);

  try {
    await updateDoc(participantRef, {
      result: timeInSeconds,
    });
    if (successCallback){
      successCallback();
    } 
  } catch (error) {
    console.error("Error updating prova time result:", error);
    if (errorCallback) errorCallback(error);
  }
}

export async function getProvaInfo(
  year: number,
  provaId: string
): Promise<Prova | null> {
  const provaDocRef = doc(db, `Circuit/${year}/Proves/${provaId}`);
  const participantsRef = collection(db, `Circuit/${year}/Proves/${provaId}/Participants`);

  const provaSnap = await getDoc(provaDocRef);
  if (!provaSnap.exists()) return null;

  const d = provaSnap.data();

  // 🔹 Crear instancia correcta según challengeType
  let prova = new EmptyProva();

  // 🔹 Asignar campos base del documento
  prova.id = provaSnap.id;
  prova.name = d.name || provaSnap.id;
  prova.description = d.description || "";
  prova.reference = provaDocRef.path;
  prova.imageUrl = d.imageUrl || undefined;
  prova.isSecret = d.isSecret || false;
  prova.isFinished = d.isFinished || false;
  prova.startDate = d.startDate?.toDate?.() ?? new Date(0);
  prova.finishDate = d.finishDate?.toDate?.() ?? undefined;
  prova.challengeType = d.challengeType || "null";
  prova.winDirection = d.winDirection || "NONE";
  prova.location = d.location || undefined;
  prova.pointsRange = Array.isArray(d.pointsRange) ? d.pointsRange : [];
  prova.penyes = [];

  // 🔹 Cargar participantes
  const participantsSnap = await getDocs(participantsRef);
  const participants = participantsSnap.docs
    .map((p) => {
      const r = p.data() as any;
      return {
        provaReference: provaDocRef.path,
        participates: r.participates ?? true,
        penyaName: r.penyaName ?? "",
        penyaId: r.penyaId ?? p.id,
        result: r.result ?? 0,
      };
    })
    .filter((p) => p.participates);

  // 🔹 Convertir a objetos ProvaResultData
  const results: ParticipatingPenya[] = participants.map(
    (p, index) =>{
      return {
        penyaId: p.penyaId,
        name: p.penyaName,
        index: index + 1,
        participates: p.participates,
        result: p.result,
      }
    }
  );

  prova.penyes = results;

  // 🔹 Si el tipo de prova tiene resultados específicos, puedes asignarlos
  // (por ejemplo para ChallengeByTime)
  if ("resultados" in prova && Array.isArray(prova["resultados"])) {
    prova["resultados"] = participants.map((p) => ({
      penyaId: p.penyaId,
      tiempo: p.result ?? 0,
    }));
  }

  return prova;
}

//#endregion

//#region PENYES
export const getPenyes = async (year: number, callback: (data: PenyaInfo[]) => void) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);

  return getDocs(penyesRef)
  .then((data) => {
    const dataConstructed = data.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || doc.id,
      totalPoints: doc.data().totalPoints || 0,
      description: doc.data().description || "",
      imageUrl: doc.data().imageUrl || undefined,
      position: 0,
      isSecret: doc.data().isSecret || false,
    }));

    callback(dataConstructed);
  }).catch((error) => {
    console.error("Error fetching rankings:", error);
  });
};

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

export const updatePenyaInfo = async (year: number, penyaId: string, name: string, isSecret: boolean, description: string, image: File | null) => {
  const penyaRef = doc(db, `Circuit/${year}/Penyes`, penyaId);

  try {
    const url = await addImageToPenyes(image, year, penyaId);
    await updateDoc(penyaRef, {
      name: name,
      isSecret: isSecret,
      description: description,
      imageUrl: url,
    });
    console.log("Penya updated successfully:", penyaId);
  } catch (error) {
    console.error("Error updating penya:", error);
  }
}

//#endregion