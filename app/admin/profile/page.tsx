"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Save, Lock, Upload } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setRole(data.role || "");
          setPhotoURL(data.photoURL || null);
        }
      } catch (err) {
        toast.error("Profil bilgileri alınamadı ❌");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile || !user) {
      toast.error("Lütfen bir resim seçin!");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", "userImage");
      formData.append("folder", "users");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/drdbrenqb/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!data.secure_url) {
        const msg = data.error?.message || "Yükleme başarısız!";
        throw new Error(msg);
      }

      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { photoURL: data.secure_url });

      setPhotoURL(data.secure_url);
      setPreviewUrl(null);
      setSelectedFile(null);
      toast.success("Profil fotoğrafı güncellendi ✅");
    } catch (err: any) {
      toast.error(err.message || "Yükleme sırasında hata oluştu ❌");
    } finally {
      setUploading(false);
    }
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Lütfen mevcut ve yeni şifreyi giriniz");
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        toast.error("Kullanıcı oturumu geçerli değil");
        return;
      }

      const cred = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPassword);

      toast.success("Şifreniz başarıyla güncellendi ✅");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        toast.error("Mevcut şifre yanlış ❌");
      } else if (err.code === "auth/weak-password") {
        toast.error("Yeni şifre çok zayıf (en az 6 karakter) ❌");
      } else {
        toast.error("Şifre değiştirilemedi ❌");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ios-blue dark:text-ios-teal" />
          <span className="text-ios-gray dark:text-gray-400 font-medium">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <Lock className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Profilim
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Profil bilgilerinizi ve şifrenizi güncelleyin
        </p>
      </div>

      <div className="ios-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 
                          shadow-ios-lg">
              <Image
                src={previewUrl || photoURL || "/default-avatar.png"}
                alt="Profil"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>
            {previewUrl && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full 
                            bg-ios-green text-white text-xs font-semibold shadow-ios">
                Yeni
              </div>
            )}
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="px-6 py-3 rounded-ios-sm font-medium
                          bg-gray-100 dark:bg-gray-800
                          hover:bg-gray-200 dark:hover:bg-gray-700
                          text-gray-700 dark:text-gray-300
                          active:scale-95 transition-all
                          border border-gray-200 dark:border-gray-700">
              📂 Fotoğraf Seç
            </div>
          </label>

          {selectedFile && (
            <button
              onClick={handleImageUpload}
              disabled={uploading}
              className="ios-button px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Fotoğrafı Güncelle
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Ad Soyad
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              placeholder="Adınız ve soyadınız"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              E-posta
            </label>
            <input
              value={email}
              disabled
              className="ios-input w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 
                       text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Rol
            </label>
            <input
              value={role === "idareci" ? "İdareci" : "Öğretmen"}
              disabled
              className="ios-input w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 
                       text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              if (!user?.uid) return;
              const ref = doc(db, "users", user.uid);
              await updateDoc(ref, { name });
              toast.success("Bilgiler güncellendi ✅");
            } catch (err) {
              toast.error("Profil güncellenemedi ❌");
            }
          }}
          className="ios-button w-full py-3.5 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Kaydet
        </button>
      </div>

      <form
        onSubmit={handlePasswordChange}
        className="ios-card p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <Lock className="w-5 h-5 text-ios-blue dark:text-ios-teal" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Şifre Değiştir
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Mevcut Şifre
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              placeholder="Mevcut şifrenizi girin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Yeni Şifre
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              placeholder="Yeni şifrenizi girin (min. 6 karakter)"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="ios-button w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Şifreyi Güncelle
            </>
          )}
        </button>
      </form>
    </div>
  );
}
