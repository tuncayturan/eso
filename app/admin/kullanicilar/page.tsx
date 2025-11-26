"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Trash2, Plus, Search, Users, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";

type User = {
  id: string;
  name: string;
  email: string;
  role: "idareci" | "ogretmen";
  photoURL?: string | null;
};

export default function KullaniciYonetimiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"idareci" | "ogretmen">("ogretmen");
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && user && user.role !== "idareci") {
      toast.error("Bu sayfaya erişim yetkiniz yok ❌");
      router.push("/admin/anasayfa");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "in", ["idareci", "ogretmen"]),
      orderBy("name")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: User[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setUsers(list);
        setDataLoading(false);
      },
      (error) => {
        toast.error("Kullanıcı verileri alınamadı");
      }
    );

    return () => unsub();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Tüm alanlar zorunludur");
      return;
    }

    if (!user || user.role !== "idareci") {
      toast.error("Sadece idareciler kullanıcı ekleyebilir ❌");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Kullanıcı oluşturuldu ✅");
        setName("");
        setEmail("");
        setPassword("");
        setRole("ogretmen");
      } else toast.error(data.message || "Kullanıcı oluşturulamadı ❌");
    } catch (err) {
      toast.error("Sunucu hatası ❌");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", deleteUser.id));
      toast.success("Kullanıcı silindi ✅");
      setDeleteUser(null);
    } catch (err) {
      toast.error("Silme hatası ❌");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRoleChange(id: string, newRole: "idareci" | "ogretmen") {
    try {
      await updateDoc(doc(db, "users", id), { role: newRole });
      toast.success(`Rol ${newRole} olarak güncellendi ✅`);
    } catch (err) {
      toast.error("Rol değiştirilemedi ❌");
    }
  }

  const filtered = useMemo(() => {
    if (!searchText.trim()) return users;
    const q = searchText.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchText]);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <Users className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Kullanıcı Yönetimi
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Öğretmen ve idareci kullanıcılarını yönetin
        </p>
      </div>

      <form
        onSubmit={handleAddUser}
        className="ios-card p-6 sm:p-8 space-y-6"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Kullanıcı Ekle</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Ad Soyad
            </label>
            <input
              placeholder="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              E-posta
            </label>
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Geçici Parola
            </label>
            <input
              type="password"
              placeholder="Geçici parola"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "idareci" | "ogretmen")}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
            >
              <option value="ogretmen">Öğretmen</option>
              <option value="idareci">İdareci</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="ios-button px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Ekleniyor...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Kullanıcı Ekle
            </>
          )}
        </button>
      </form>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray">
          <Search className="w-5 h-5" />
        </div>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="🔍 Ad, e-posta veya rol ara..."
          className="ios-input w-full pl-12 pr-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
        />
      </div>

      <div className="overflow-x-auto ios-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200/50 dark:border-gray-700/50">
              <th className="px-4 py-4 text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Fotoğraf
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Ad Soyad
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                E-posta
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Rol
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                İşlem
              </th>
            </tr>
          </thead>

          <tbody>
            {dataLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin w-6 h-6 text-ios-blue dark:text-ios-teal" />
                    <span className="text-ios-gray dark:text-gray-400 font-medium">Yükleniyor...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Users className="w-8 h-8 text-ios-gray dark:text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Kayıt bulunamadı
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-gray-100/50 dark:border-gray-700/30 
                            hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 
                                  bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Image
                        src={u.photoURL || "/default-avatar.png"}
                        alt={u.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </td>

                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{u.email}</td>

                  <td className="px-4 py-4">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as "idareci" | "ogretmen")
                      }
                      className="ios-input px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="ogretmen">Öğretmen</option>
                      <option value="idareci">İdareci</option>
                    </select>
                  </td>

                  <td className="px-4 py-4 text-right">
                    {u.role !== "idareci" && (
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                                 bg-ios-red/10 dark:bg-ios-red/20
                                 hover:bg-ios-red/20 dark:hover:bg-ios-red/30
                                 text-ios-red dark:text-ios-red
                                 border border-ios-red/20 dark:border-ios-red/30
                                 active:scale-95 transition-all"
                        title="Kullanıcıyı sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-sm text-center animate-scaleIn">
            <button
              onClick={() => setDeleteUser(null)}
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center 
                       rounded-ios-sm bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       text-gray-600 dark:text-gray-400
                       active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full 
                          bg-ios-red/10 dark:bg-ios-red/20
                          flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-ios-red" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Kullanıcıyı Sil?
            </h2>
            <p className="text-sm text-ios-gray dark:text-gray-400 mb-6">
              <strong>{deleteUser.name}</strong> adlı kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-6 py-3 rounded-ios-sm font-medium
                         bg-gray-100 dark:bg-gray-800
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         text-gray-700 dark:text-gray-300
                         active:scale-95 transition-all"
              >
                İptal
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-6 py-3 rounded-ios-sm font-semibold
                         bg-ios-red text-white
                         hover:bg-ios-red/90
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-all
                         shadow-ios-button"
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Siliniyor...
                  </span>
                ) : (
                  "Evet, Sil"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
