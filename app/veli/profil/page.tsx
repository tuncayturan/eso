"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  KeyRound,
  Phone,
  User,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import VeliHeader from "@/components/VeliHeader";

export default function ProfilPage() {
  const { user } = useAuth();
  const router = useRouter();
  const currentUser = user as any;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const [preferredGrades, setPreferredGrades] = useState<string[]>(["all"]);

  const gradeOptions = [
    { key: "5", label: "5. Sınıflar" },
    { key: "6", label: "6. Sınıflar" },
    { key: "7", label: "7. Sınıflar" },
    { key: "8", label: "8. Sınıflar" },
    { key: "all", label: "Tüm Okul (Zorunlu)" },
  ];

  useEffect(() => {
    async function load() {
      if (!currentUser?.uid) return;

      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const d = snap.data();
        setName(d.name || "");
        setPhone(d.phone || "");

        const loadedGrades = d.preferredGrades || [];
        const fixed = Array.from(new Set([...loadedGrades, "all"]));
        setPreferredGrades(fixed);
      }
    }
    load();
  }, [currentUser]);

  function toggleGrade(key: string) {
    if (key === "all") return;

    let updated = [...preferredGrades];

    if (updated.includes(key)) {
      updated = updated.filter((g) => g !== key);
    } else {
      updated.push(key);
    }

    if (!updated.includes("all")) updated.push("all");
    setPreferredGrades(updated);
  }

  async function save() {
    if (!currentUser?.uid) return;

    const phoneRegex = /^05\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Telefon formatı geçerli değil (05xx...).");
      return;
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name,
        phone,
        preferredGrades,
      });

      toast.success("Profil güncellendi!");
    } catch {
      toast.error("Hata oluştu.");
    }
  }

  async function changePassword() {
    if (!currentPass || !newPass) {
      toast.error("Tüm alanları doldurun.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPass
      );

      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPass);

      toast.success("Şifre güncellendi!");
      setCurrentPass("");
      setNewPass("");
    } catch (err) {
      toast.error("Şifre değiştirme hatası.");
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-ios-grayLight via-white to-blue-50/30
                        dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Toaster
        position="top-center"
        containerStyle={{
          marginTop: 50,
        }}
      />

      <div className="max-w-2xl mx-auto p-5 md:p-6">

        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-ios-sm 
                     bg-white/80 dark:bg-gray-800/80 
                     shadow-ios active:scale-95 transition-all backdrop-blur-sm
                     border border-gray-200/50 dark:border-gray-700/50
                     text-gray-900 dark:text-white font-medium mb-6"
        >
          <ArrowLeft size={18} /> Geri
        </button>

        <div className="ios-card p-6 md:p-8 space-y-6 animate-scaleIn">

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profil Bilgileri</h2>
          <p className="text-sm text-ios-gray dark:text-gray-400 mb-6">
            Kişisel bilgilerinizi ve bildirim tercihlerinizi güncelleyin
          </p>

          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
              <User size={16} className="text-ios-blue" /> Ad Soyad
            </label>
            <input
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
              <Phone size={16} className="text-ios-blue" /> Telefon
            </label>
            <input
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
              placeholder="05xx xxx xx xx"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Duyuru Almak İstediğim Sınıflar
            </h3>

            <div className="grid gap-3">
              {gradeOptions.map((g) => (
                <label
                  key={g.key}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-ios-sm 
                           bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50
                           active:scale-98 transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={preferredGrades.includes(g.key)}
                    disabled={g.key === "all"}
                    onChange={() => toggleGrade(g.key)}
                    className="w-5 h-5 rounded text-ios-blue focus:ring-ios-blue"
                  />
                  <span className={`flex-1 ${g.key === "all" ? "opacity-75" : "font-medium"} text-gray-900 dark:text-white`}>
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            className="ios-button w-full py-3.5 text-base font-semibold mt-4"
          >
            Bilgileri Kaydet
          </button>

          <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <KeyRound size={18} className="text-ios-blue" /> Şifre Değiştir
            </h3>

            <input
              type="password"
              placeholder="Mevcut Şifre"
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
            />

            <input
              type="password"
              placeholder="Yeni Şifre"
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />

            <button
              onClick={changePassword}
              className="w-full bg-ios-green hover:opacity-90 text-white py-3.5 rounded-ios-sm font-semibold 
                       shadow-ios-button active:scale-98 transition-all"
            >
              Şifreyi Güncelle
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
