import { db, auth, functions } from "@/firebase/firebase";
import { User } from "@/interfaces/userInterface";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export const createUser = async (user: User, password: string): Promise<void> => {
  const fn = httpsCallable<{ user: User; password?: string }, { uid: string; email: string }>(
    functions,
    "createUser"
  );
  const result = await fn({ user, password: user.isTemporary ? password : undefined });
  const { email } = result.data;

  if (!user.isTemporary) {
    await sendPasswordResetEmail(auth, email);
  }
};

export const getUsers = async (callback: (data: User[]) => void) => {
  const usersRef = collection(db, "Users");

  try {
    const snap = await getDocs(usersRef);

    const users: User[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        uid: d.uid,
        photoURL: d.photoURL || "",
        displayName: d.displayName || "",
        email: d.email || "",
        isTemporary: d.isTemporary || false,
        permissions: {
          penyes: Array.isArray(d.permissions?.penyes) ? d.permissions.penyes : [],
          proves: Array.isArray(d.permissions?.proves) ? d.permissions.proves : [],
          specificProvaId: d.permissions?.specificProvaId ?? undefined,
          users: Array.isArray(d.permissions?.users) ? d.permissions.users : [],
        },
      };
    });

    callback(users);
  } catch (error) {
    console.error("Error obtenint usuaris:", error);
  }
};

export const deleteUsersWithProva = async (provaId: string): Promise<void> => {
  const usersRef = collection(db, `Users`);
  const snap = await getDocs(usersRef);

  const affected = snap.docs.filter(
    (d) => d.data().permissions?.specificProvaId === provaId
  );

  if (affected.length === 0) return;

  for (const docSnap of affected) {
    const d = docSnap.data();
    const penyes: string[] = Array.isArray(d.permissions?.penyes) ? d.permissions.penyes : [];
    const users: string[] = Array.isArray(d.permissions?.users) ? d.permissions.users : [];
    const proves: string[] = Array.isArray(d.permissions?.proves) ? d.permissions.proves : [];

    const hasOtherPermissions =
      penyes.length > 0 ||
      users.length > 0 ||
      proves.some((p: string) => p !== "editResults");

    if (hasOtherPermissions) {
      // Keep the user but strip the prova-specific permission
      const updatedProves = proves.filter((p: string) => p !== "editResults");
      await updateDoc(docSnap.ref, {
        "permissions.specificProvaId": null,
        "permissions.proves": updatedProves,
      });
    } else {
      // Delete completely from Auth + Firestore via Cloud Function
      await deleteUser(d.uid);
    }
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  const fn = httpsCallable(functions, "deleteUser");
  await fn({ uid });
};

export const updateUser = async (user: User): Promise<void> => {
  const docRef = doc(db, `Users/${user.uid}`);

  if (auth.currentUser && auth.currentUser.uid === user.uid) {
    await updateProfile(auth.currentUser, {
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  }

  await updateDoc(docRef, {
    photoURL: user.photoURL,
    displayName: user.displayName,
    isTemporary: user.isTemporary,
    permissions: {
      penyes: user.permissions.penyes,
      proves: user.permissions.proves,
      ...(user.permissions.specificProvaId
        ? { specificProvaId: user.permissions.specificProvaId }
        : { specificProvaId: null }),
      users: user.permissions.users,
    },
  });
};
