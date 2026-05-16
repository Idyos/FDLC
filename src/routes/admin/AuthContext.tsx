import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { User } from "@/interfaces/userInterface";

type AuthContextType = {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }

      unsubscribeDoc = onSnapshot(doc(db, `Users/${firebaseUser.uid}`), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUserData({
            uid: d.uid,
            email: d.email ?? "",
            displayName: d.displayName ?? "",
            photoURL: d.photoURL ?? "",
            isTemporary: d.isTemporary ?? false,
            hasResetPassword: d.hasResetPassword ?? false,
            permissions: {
              penyes: d.permissions?.penyes ?? [],
              proves: d.permissions?.proves ?? [],
              specificProvaId: d.permissions?.specificProvaId ?? undefined,
              users: d.permissions?.users ?? [],
            },
          });
        } else {
          setUserData(null);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [auth]);

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
