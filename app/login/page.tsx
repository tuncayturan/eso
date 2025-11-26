"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";

import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect"); // 🔥 bildirim için özel alan

  const { theme, toggleTheme } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function checkUserExists(email: string) {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isRegister && password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    try {
      const exists = await checkUserExists(email);

      if (isRegister) {
        if (exists) {
          toast.error("Bu e-posta zaten kayıtlı!");
          setIsRegister(false);
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        await updateProfile(cred.user, { displayName: name });

        await setDoc(doc(db, "users", cred.user.uid), {
          name,
          email,
          phone,
          role: "veli",
          preferredGrades: ["all"],
          photoURL: "",
          verified: false,
          createdAt: serverTimestamp(),
        });

        await sendEmailVerification(cred.user);

        toast.success("Kayıt başarılı! E-postanı doğrula.");
        await auth.signOut();
        setIsRegister(false);
        setLoading(false);
        return;
      }

      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData) {
        toast.error("Kullanıcı verisi bulunamadı!");
        await auth.signOut();
        return;
      }

      if (!cred.user.emailVerified && userData.role === "veli") {
        toast.error("E-posta doğrulanmamış!");
        await auth.signOut();
        return;
      }

      toast.success("Giriş başarılı 🎉");

      if (redirect) {
        let fixed = redirect;

        if (redirect.startsWith("/mesajlar")) {
          const url = new URL("https://dummy.com" + redirect);
          const teacher = url.searchParams.get("parent");

          if (teacher) {
            fixed = `/veli/mesajlar?teacher=${teacher}`;
          }
        }

        router.push(fixed);
        return;
      }

      if (userData.role === "veli") {
        router.push("/veli/duyurular");
      } else {
        router.push("/admin/anasayfa");
      }
    } catch (err: any) {
      toast.error("Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) return toast.error("E-posta girin");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Sıfırlama e-postası gönderildi");
    } catch {
      toast.error("Gönderilemedi");
    }
  }

  async function handleGoogleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          name: user.displayName || user.email,
          email: user.email,
          role: "veli",
          preferredGrades: ["all"],
          phone: "",
          photoURL: user.photoURL,
          verified: true,
          createdAt: serverTimestamp(),
        });
      }

      if (redirect) {
        let fixed = redirect;
        if (redirect.startsWith("/mesajlar")) {
          const url = new URL("https://dummy.com" + redirect);
          const teacher = url.searchParams.get("parent");

          if (teacher) {
            fixed = `/veli/mesajlar?teacher=${teacher}`;
          }
        }

        router.push(fixed);
        return;
      }

      router.push("/veli/duyurular");
    } catch {
      toast.error("Google giriş başarısız");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center 
                    bg-gradient-to-br from-ios-grayLight via-white to-blue-50/30
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
                    relative px-4 py-8">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: theme === "dark" ? "#1C1C1E" : "#fff",
            color: theme === "dark" ? "#fff" : "#1C1C1E",
            borderRadius: "16px",
            border: "1px solid rgba(0,0,0,0.05)",
            marginTop: "70px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          },
        }}
      />

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center 
                   rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                   shadow-ios active:scale-95 transition-all backdrop-blur-sm
                   border border-gray-200/50 dark:border-gray-700/50"
      >
        {theme === "dark" ? (
          <Sun size={20} className="text-ios-orange" />
        ) : (
          <Moon size={20} className="text-gray-700" />
        )}
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md ios-card p-8 space-y-5 animate-scaleIn"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-ios-lg 
                         bg-white dark:bg-gray-800
                         border-2 border-gray-200/50 dark:border-gray-700/50
                         mb-4 shadow-ios-lg 
                         dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <Image
              src="/icons/icon-512.png"
              alt="Logo"
              width={50}
              height={50}
              className="rounded-ios-sm"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isRegister ? "Veli Kayıt" : "Giriş Yap"}
          </h1>
          <p className="text-sm text-ios-gray dark:text-gray-400">
            {isRegister 
              ? "Hesabınızı oluşturun ve e-posta doğrulaması yapın" 
              : "Hesabınıza giriş yapın"}
          </p>
        </div>

        {isRegister && (
          <>
            <input
              placeholder="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
            />

            <input
              placeholder="Telefon (05xx xxx xx xx)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
            />
          </>
        )}

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
        />

        <button
          type="submit"
          disabled={loading}
          className="ios-button w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              İşleniyor...
            </span>
          ) : (
            isRegister ? "Kayıt Ol" : "Giriş Yap"
          )}
        </button>

        {!isRegister && (
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-sm text-ios-blue dark:text-ios-teal hover:underline font-medium"
          >
            Şifremi Unuttum
          </button>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full ios-input py-3.5 flex items-center justify-center gap-3 
                     font-medium text-gray-900 dark:text-white
                     active:scale-98 transition-all"
        >
          <img src="/google.svg" className="w-5 h-5" alt="Google" /> 
          <span>{isRegister ? "Google ile Kayıt Ol" : "Google ile Giriş"}</span>
        </button>

        <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {isRegister ? "Zaten hesabınız var mı?" : "Hesabınız yok mu?"}{" "}
            <button
              type="button"
              className="text-ios-blue dark:text-ios-teal font-semibold hover:underline"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          </p>
        </div>
      </form>

      <button
        onClick={() => router.push("/veli/duyurular")}
        className="mt-6 px-6 py-3 text-sm rounded-ios-sm 
                   bg-white/80 dark:bg-gray-800/80 
                   shadow-ios active:scale-95 transition-all backdrop-blur-sm
                   border border-gray-200/50 dark:border-gray-700/50
                   text-gray-700 dark:text-gray-300 font-medium"
      >
        ⬅ Ana Sayfaya Dön
      </button>
    </div>
  );
}
