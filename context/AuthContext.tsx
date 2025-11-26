"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { requestNotificationPermission } from "@/lib/firebaseMessaging";

interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          let role = "veli";
          let name = firebaseUser.displayName || firebaseUser.email || "";
          let photoURL = firebaseUser.photoURL || "/default-avatar.png";
          let phone: string | null = null;

          if (snap.exists()) {
            const data = snap.data();
            role = data.role || role;
            name = data.name || name;
            photoURL = data.photoURL || photoURL;
            phone = data.phone || null;
          } else {
            await setDoc(userRef, {
              email: firebaseUser.email,
              name,
              role: "veli",
              photoURL,
              phone: null,
              createdAt: serverTimestamp(),
            });
            role = "veli";
          }

          await addDoc(collection(db, "logs"), {
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email,
            role,
            date: new Date().toISOString(),
            timestamp: serverTimestamp(),
          });

          const currentUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name,
            role,
            photoURL,
            phone,
          };

          setUser(currentUser);

          const hasToken = localStorage.getItem("fcm_token");
          if (!hasToken) {
            await requestNotificationPermission(firebaseUser.uid);
          }
        } catch (err) {
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const unsubSnapshot = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            name: data.name || prev.name,
            phone: data.phone || prev.phone,
            photoURL: data.photoURL || prev.photoURL,
          };
        });
      }
    });

    return () => unsubSnapshot();
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
