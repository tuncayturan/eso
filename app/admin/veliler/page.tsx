"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Trash2, UsersRound, X, Pencil, Search, MessageCircle, Send } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  orderBy,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";

type Parent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string | null;
};

export default function VelilerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [parents, setParents] = useState<Parent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [deleteItem, setDeleteItem] = useState<Parent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editItem, setEditItem] = useState<Parent | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [messageItem, setMessageItem] = useState<Parent | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "idareci") {
      toast.error("Bu sayfaya erişim izniniz yok ❌");
      router.push("/admin/anasayfa");
    }
  }, [user, loading]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "veli"),
      orderBy("name")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Parent[] = [];
        snap.forEach((doc) =>
          list.push({
            id: doc.id,
            ...(doc.data() as any),
          })
        );
        setParents(list);
        setDataLoading(false);
      },
      (err) => {
        toast.error("Veliler alınamadı!");
      }
    );

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return parents;
    const q = searchText.toLowerCase();

    return parents.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
    );
  }, [parents, searchText]);

  async function handleConfirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);

    try {
      await deleteDoc(doc(db, "users", deleteItem.id));
      toast.success("Veli silindi");
      setDeleteItem(null);
    } catch (err) {
      toast.error("Silme hatası");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    setSavingEdit(true);

    try {
      await updateDoc(doc(db, "users", editItem.id), {
        name: editItem.name.trim(),
        email: editItem.email.trim(),
        phone: editItem.phone?.trim() || "",
      });

      toast.success("Veli bilgisi güncellendi");
      setEditItem(null);
    } catch (err) {
      toast.error("Güncelleme hatası");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSendMessage() {
    if (!messageItem || !messageText.trim() || !user) return;
    setSendingMessage(true);

    try {
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderName: user.name || user.email,
        senderEmail: user.email,
        receiverId: messageItem.id,
        receiverName: messageItem.name,
        receiverEmail: messageItem.email,
        message: messageText.trim(),
        timestamp: serverTimestamp(),
        read: false,
        hiddenFor: [],
      });

      try {
        const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost:3443";
        await fetch("/api/sendMessageNotification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverUid: messageItem.id,
            title: `${user.name || user.email} size mesaj gönderdi`,
            body: messageText.trim(),
            url: `${SITE}/veli/mesajlar?teacher=${user.uid}`,
            data: {
              senderId: user.uid,
              type: "message",
            },
          }),
        });
      } catch (err) {
      }

      toast.success("Mesaj gönderildi ✅");
      setMessageText("");
      setMessageItem(null);
    } catch (err) {
      toast.error("Mesaj gönderilemedi ❌");
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <UsersRound className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Veliler
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Veli bilgilerini görüntüleyin ve yönetin
        </p>
      </div>

      <div className="relative max-w-md">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray">
          <Search className="w-5 h-5" />
        </div>
        <input
          placeholder="🔍 Veli adı, e-posta veya telefon ara..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
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
                Telefon
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Mesaj
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Güncelle
              </th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Sil
              </th>
            </tr>
          </thead>

          <tbody>
            {dataLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-ios-blue dark:text-ios-teal" />
                    <span className="text-ios-gray dark:text-gray-400 font-medium">Yükleniyor...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <UsersRound className="w-8 h-8 text-ios-gray dark:text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Sonuç bulunamadı
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-100/50 dark:border-gray-700/30 
                            hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 
                                  bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={p.photoURL || "/default-avatar.png"}
                        width={48}
                        height={48}
                        alt={p.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </td>

                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{p.name}</td>

                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{p.email}</td>

                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{p.phone || "-"}</td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setMessageItem(p)}
                      className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                               bg-ios-green/10 dark:bg-ios-green/20
                               hover:bg-ios-green/20 dark:hover:bg-ios-green/30
                               text-ios-green dark:text-ios-green
                               border border-ios-green/20 dark:border-ios-green/30
                               active:scale-95 transition-all"
                      title="Veliye mesaj gönder"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setEditItem(p)}
                      className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                               bg-ios-blue/10 dark:bg-ios-blue/20
                               hover:bg-ios-blue/20 dark:hover:bg-ios-blue/30
                               text-ios-blue dark:text-ios-teal
                               border border-ios-blue/20 dark:border-ios-blue/30
                               active:scale-95 transition-all"
                      title="Veli bilgisini düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setDeleteItem(p)}
                      className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                               bg-ios-red/10 dark:bg-ios-red/20
                               hover:bg-ios-red/20 dark:hover:bg-ios-red/30
                               text-ios-red dark:text-ios-red
                               border border-ios-red/20 dark:border-ios-red/30
                               active:scale-95 transition-all"
                      title="Veliyi sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-sm text-center animate-scaleIn">
            <button
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center 
                       rounded-ios-sm bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       text-gray-600 dark:text-gray-400
                       active:scale-95 transition-all"
              onClick={() => setDeleteItem(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full 
                          bg-ios-red/10 dark:bg-ios-red/20
                          flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-ios-red" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Veliyi Sil?
            </h2>
            <p className="text-sm text-ios-gray dark:text-gray-400 mb-6">
              <strong>{deleteItem.name}</strong> adlı veliyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteItem(null)}
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

      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-sm animate-scaleIn">
            <button
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center 
                       rounded-ios-sm bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       text-gray-600 dark:text-gray-400
                       active:scale-95 transition-all"
              onClick={() => setEditItem(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Veli Bilgisi Düzenle
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={editItem.name}
                  onChange={(e) =>
                    setEditItem({ ...editItem, name: e.target.value })
                  }
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  placeholder="E-posta"
                  value={editItem.email}
                  onChange={(e) =>
                    setEditItem({ ...editItem, email: e.target.value })
                  }
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={editItem.phone || ""}
                  onChange={(e) =>
                    setEditItem({ ...editItem, phone: e.target.value })
                  }
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
              <button
                onClick={() => setEditItem(null)}
                className="px-6 py-3 rounded-ios-sm font-medium
                         bg-gray-100 dark:bg-gray-800
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         text-gray-700 dark:text-gray-300
                         active:scale-95 transition-all"
              >
                İptal
              </button>

              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="ios-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEdit ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </span>
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {messageItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-md animate-scaleIn">
            <button
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center 
                       rounded-ios-sm bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       text-gray-600 dark:text-gray-400
                       active:scale-95 transition-all"
              onClick={() => {
                setMessageItem(null);
                setMessageText("");
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-ios-green/30">
                <Image
                  src={messageItem.photoURL || "/default-avatar.png"}
                  width={56}
                  height={56}
                  alt={messageItem.name}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {messageItem.name}
                </h2>
                <p className="text-sm text-ios-gray dark:text-gray-400">
                  {messageItem.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Mesajınız
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Veliye göndermek istediğiniz mesajı yazın..."
                  rows={4}
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
              <button
                onClick={() => {
                  setMessageItem(null);
                  setMessageText("");
                }}
                className="px-6 py-3 rounded-ios-sm font-medium
                         bg-gray-100 dark:bg-gray-800
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         text-gray-700 dark:text-gray-300
                         active:scale-95 transition-all"
              >
                İptal
              </button>

              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageText.trim()}
                className="px-6 py-3 rounded-ios-sm font-semibold flex items-center gap-2
                         bg-ios-green text-white
                         hover:bg-ios-green/90
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-all
                         shadow-ios-button"
              >
                {sendingMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gönder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
