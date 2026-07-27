import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";

export const deleteUserFn = onCall({ cors: true, region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per eliminar usuaris.");
  }

  const { uid } = request.data as { uid: string };

  if (!uid) {
    throw new HttpsError("invalid-argument", "Cal un uid d'usuari.");
  }

  const callerDoc = await admin.firestore().doc(`Users/${request.auth.uid}`).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Usuari no trobat.");
  }
  const callerUsersPerms: string[] = callerDoc.data()?.permissions?.users ?? [];
  if (!callerUsersPerms.includes("delete") && !callerUsersPerms.includes("*")) {
    throw new HttpsError("permission-denied", "No tens permís per eliminar usuaris.");
  }

  await Promise.all([
    admin.auth().deleteUser(uid),
    admin.firestore().doc(`Users/${uid}`).delete(),
  ]);
});
