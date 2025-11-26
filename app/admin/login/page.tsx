"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        toast.error("Kullanıcı kaydı bulunamadı ❌");
        await signOut(auth);
        setLoading(false);
        return;
      }

      const data = snap.data();
      const role = data.role || "veli";

      if (role === "idareci" || role === "ogretmen") {
        toast.success("Yönetim paneline hoş geldiniz ✅");
        router.push("/admin/anasayfa");
      } else if (role === "veli") {
        toast.success("Veli giriş başarılı ✅");
        router.push("/duyurular");
      } else {
        toast.error("Rol tanımlı değil ❌");
        await signOut(auth);
      }
    } catch (err: any) {
      const messages: Record<string, string> = {
        "auth/invalid-credential": "E-posta veya şifre hatalı ❌",
        "auth/user-not-found": "Kullanıcı bulunamadı ❌",
        "auth/wrong-password": "E-posta veya şifre hatalı ❌",
        "auth/too-many-requests": "Çok fazla deneme yapıldı ⏳",
      };
      toast.error(messages[err.code] || "Bir hata oluştu ⚠️");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) return toast.error("Lütfen e-posta girin");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Şifre sıfırlama e-postası gönderildi ✅");
    } catch {
      toast.error("E-posta gönderilemedi ❌");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-ios-grayLight via-white to-blue-50/30
                    dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
                    relative px-4">
      <Toaster position="top-right" />

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center 
                   rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                   shadow-ios active:scale-95 transition-all backdrop-blur-sm
                   border border-gray-200/50 dark:border-gray-700/50"
        title={theme === "dark" ? "Aydınlık Tema" : "Karanlık Tema"}
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
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-ios-lg 
                         bg-white dark:bg-gray-800
                         border-2 border-gray-200/50 dark:border-gray-700/50
                         mb-4 shadow-ios-lg 
                         dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <Image
              src="/icons/icon-512.png"
              alt="Okul Logosu"
              width={50}
              height={50}
              className="rounded-ios-sm"
            />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Yönetim Paneli Giriş
          </h1>
          <p className="text-sm text-ios-gray dark:text-gray-400">
            Öğretmen ve İdareci girişi
          </p>
        </div>

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
          required
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="ios-button w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Giriş Yapılıyor...
            </span>
          ) : (
            "Giriş Yap"
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-sm text-ios-blue dark:text-ios-teal hover:underline font-medium mt-2"
        >
          Şifremi unuttum
        </button>
      </form>
    </div>
  );
}
