import { db } from "@/firebase/firebase";
import { User } from "@/interfaces/userInterface";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const createUser = async (user: User, password: string): Promise<void> => {
  const email: string =
    user.email.length === 0 ? `${user.displayName}@fdlc.com` : user.email;

  // Use a secondary Firebase app so the current admin session is not interrupted
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );
    const uid = userCredential.user.uid;

    const docRef = doc(db, `Users/${uid}`);
    await setDoc(docRef, {
      uid,
      displayName: user.displayName,
      email,
      photoURL: user.photoURL,
      isTemporary: user.isTemporary,
      permissions: {
        penyes: user.permissions.penyes,
        proves: user.permissions.proves,
        ...(user.permissions.specificProvaId
          ? { specificProvaId: user.permissions.specificProvaId }
          : {}),
        users: user.permissions.users,
      },
    });
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const getUsers = async (callback: (data: User[]) => void) => {
  const usersRef = collection(db, `Users`);

  try {
    const snap = await getDocs(usersRef);

    const users: User[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      const user: User = {
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
      return user;
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

  const batch = writeBatch(db);

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
      batch.delete(docSnap.ref);
    }
  }

  await batch.commit();
};

export const deleteUser = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, `Users/${uid}`));
};

export const updateUser = async (user: User): Promise<void> => {
  const docRef = doc(db, `Users/${user.uid}`);
  await updateDoc(docRef, {
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
