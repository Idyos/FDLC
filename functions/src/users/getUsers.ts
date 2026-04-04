import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/https";
import { User } from "../types";

export const getUsersFn = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Cal estar autenticat per veure usuaris.");
  }

  // Fetch all Auth users (paginated)
  const authUsers: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    authUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  if (authUsers.length === 0) return [];

  // Batch-fetch Firestore docs for all UIDs
  const refs = authUsers.map((u) => admin.firestore().doc(`Users/${u.uid}`));
  const snapshots = await admin.firestore().getAll(...refs);

  const users: User[] = authUsers.map((authUser, i) => {
    const data = snapshots[i].data();
    return {
      uid: authUser.uid,
      email: authUser.email ?? "",
      displayName: authUser.displayName ?? "",
      photoURL: authUser.photoURL ?? "",
      isTemporary: data?.isTemporary ?? false,
      permissions: data?.permissions ?? {
        penyes: [],
        proves: [],
        users: [],
      },
    };
  });

  return users;
});
