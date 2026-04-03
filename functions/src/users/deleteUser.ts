import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";

export const deleteUserFn = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per eliminar usuaris.");
  }

  const { uid } = request.data as { uid: string };

  if (!uid) {
    throw new HttpsError("invalid-argument", "Cal un uid d'usuari.");
  }

  await Promise.all([
    admin.auth().deleteUser(uid),
    admin.firestore().doc(`Users/${uid}`).delete(),
  ]);
});
