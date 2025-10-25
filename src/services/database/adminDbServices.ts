import { BaseChallenge, PenyaInfo, ProvaInfo } from "@/interfaces/interfaces";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { addImageToChallenges, addImageToPenyes } from "../storageService";

//#region PROVES
export const getProves = async (year: number, callback: (data: ProvaInfo[]) => void) => {
  const provesRef = collection(db, `Circuit/${year}/Proves`);

  return getDocs(provesRef)
  .then((data) => {
    const dataConstructed = data.docs.map((doc) => ({
        provaId: doc.id,
        challengeType: doc.data().challengeType,
        name: doc.data().name || doc.id,
        description: doc.data().description || undefined,
        isSecret: doc.data().isSecret || false,
        imageUrl: doc.data().imageUrl || undefined,
        location: doc.data().location || undefined,
        startDate: doc.data().startDate?.toDate?.() ?? null,
        finishDate: doc.data().finishDate?.toDate?.() ?? null,
        winDirection: doc.data().winDirection,
        pointsRange: doc.data().pointsRange || [],
        results: doc.data().results || [],
    }));

    callback(dataConstructed);
  }).catch((error) => {
    console.error("Error fetching rankings:", error);
  });
};

export const createProva = async (
  year: number,
  data: BaseChallenge,
  image: File | null,
  onSuccess: (data: number[]) => void,
  onError?: (error: unknown) => void
) => {
  const provaRef = doc(db, `Circuit/${year}/Proves/${data.name}`);
  const batch = writeBatch(db);

      try {
        const url = await addImageToChallenges(image, year, data.name)
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
        });

        data.penyes.forEach((penyaInfo) => {
          if (penyaInfo.participates) {
            const participantRef = doc(
              db,
              `Circuit/${year}/Proves/${data.name}/Participants/${penyaInfo.penya.penyaId}`
            );

            let participantObject: {
              penyaId: string;
              penyaName: string;
              participates: boolean;
              result?: any;
            } = {
              penyaId: penyaInfo.penya.penyaId,
              penyaName: penyaInfo.penya.name,
              participates: penyaInfo.participates,
            }

            switch(data.challengeType){
              case "Temps":
              case "Punts":
                participantObject = { ...participantObject, result: 0 };
                break;
              case "Participació":
                participantObject = { ...participantObject, result: false };
                break;
            }

            batch.set(participantRef, participantObject);
          }
        });
      } catch (error) {
        // manejar error
        console.error("Error al pujar la imatge:", error);
        toast.error("Error al pujar la imatge: " + error);
      }
  try {
    await batch.commit();
    onSuccess([year]);
  } catch (error) {
    console.error("Error creant la prova:", error);
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
    if (successCallback) successCallback();
  } catch (error) {
    console.error("Error updating prova time result:", error);
    if (errorCallback) errorCallback(error);
  }
}
//#endregion

//#region PENYES
export const getPenyes = async (year: number, callback: (data: PenyaInfo[]) => void) => {
  const penyesRef = collection(db, `Circuit/${year}/Penyes`);

  return getDocs(penyesRef)
  .then((data) => {
    const dataConstructed = data.docs.map((doc) => ({
      penyaId: doc.id,
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