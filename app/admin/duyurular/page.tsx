"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import { Pencil, Trash2, Loader2, Plus, Search, X, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Announcement = {
  id: string;
  title: string;
  content: string;
  targetGrades: string[];
  notifyAll: boolean;
  createdAt?: Timestamp | null;
  createdBy?: string | null;
  createdByUid?: string | null;
  createdRole?: string | null;
  sentCount?: number;
  readCount?: number;
};

const GRADE_OPTIONS = [
  { key: "5", label: "5. Sınıflar" },
  { key: "6", label: "6. Sınıflar" },
  { key: "7", label: "7. Sınıflar" },
  { key: "8", label: "8. Sınıflar" },
  { key: "all", label: "Tüm Okul" },
];
const FILTER_TARGETS = [
  "Hepsi",
  "Tüm Okul",
  "5. Sınıflar",
  "6. Sınıflar",
  "7. Sınıflar",
  "8. Sınıflar",
];

const PAGE_SIZE = 3;

export default function DuyurularPage() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [notifyAll, setNotifyAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [searchText, setSearchText] = useState("");
  const [filterTarget, setFilterTarget] = useState("Hepsi");
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);
  function toggleGrade(key: string) {
    let updated = [...targetGrades];

    if (updated.includes(key)) {
      updated = updated.filter((g) => g !== key);
    } else {
      updated.push(key);
    }

    setTargetGrades(updated);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Başlık ve içerik zorunludur");
      return;
    }

    if (!user) {
      toast.error("Giriş yapılmamış!");
      return;
    }

    setSaving(true);

    const finalTargetGrades = [...targetGrades];

    try {
      const docRef = await addDoc(collection(db, "announcements"), {
        title,
        content,
        targetGrades: finalTargetGrades,
        notifyAll,
        createdAt: serverTimestamp(),
        createdBy: (user as any).name || user.email,
        createdByUid: user.uid,
        createdRole: (user as any).role,
      });

      try {
        const res = await fetch("/api/sendNotification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body: content,
            annId: docRef.id,
            targetGrades: finalTargetGrades,
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          toast.error("Duyuru kaydedildi ancak bildirim gönderilemedi");
        } else {
          toast.success(`Duyuru eklendi ve ${json.sentTo || 0} kişiye bildirim gönderildi`);
        }
      } catch (err) {
        toast.error("Duyuru kaydedildi fakat bildirim API hatası oluştu");
      }

      toast.success("Duyuru eklendi");

      setTitle("");
      setContent("");
      setTargetGrades(["all"]);
      setNotifyAll(false);

      await refreshTop();
    } catch (err) {
      toast.error("Duyuru eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function addCountsToAnnouncements(arr: Announcement[]) {
    const veliSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "veli"))
    );
    const veliCount = veliSnap.size;

    for (const a of arr) {
      a.sentCount = veliCount;

      const readSnap = await getDocs(
        collection(db, "announcements", a.id, "reads")
      );
      a.readCount = readSnap.size;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const qSnap = await getDocs(
          query(
            collection(db, "announcements"),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
          )
        );

        let arr: Announcement[] = qSnap.docs.map((d) => {
          const data = d.data() as any;
          let targetGrades: string[] = data.targetGrades || [];
          if (!targetGrades.length && data.target) {
            if (data.target === "Tüm Okul") targetGrades = ["all"];
            else if (typeof data.target === "string") {
              const gradeKey = data.target.split(".")[0];
              targetGrades = [gradeKey, "all"];
            }
          }
          if (!targetGrades.includes("all")) targetGrades.push("all");

          return {
            id: d.id,
            ...data,
            targetGrades,
          } as Announcement;
        });

        await addCountsToAnnouncements(arr);

        setItems(arr);
        lastDocRef.current = qSnap.docs.length
          ? qSnap.docs[qSnap.docs.length - 1]
          : null;

        setHasMore(qSnap.docs.length === PAGE_SIZE);
      } catch (err) {
        toast.error("Duyurular yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function fetchMore() {
    if (!hasMore || loadingMore || !lastDocRef.current) return;

    try {
      setLoadingMore(true);

      const qSnap = await getDocs(
        query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
          startAfter(lastDocRef.current),
          limit(PAGE_SIZE)
        )
      );

      let arr: Announcement[] = qSnap.docs.map((d) => {
        const data = d.data() as any;
        let targetGrades: string[] = data.targetGrades || [];
        if (!targetGrades.length && data.target) {
          if (data.target === "Tüm Okul") targetGrades = ["all"];
          else if (typeof data.target === "string") {
            const gradeKey = data.target.split(".")[0];
            targetGrades = [gradeKey, "all"];
          }
        }
        if (!targetGrades.includes("all")) targetGrades.push("all");

        return {
          id: d.id,
          ...data,
          targetGrades,
        } as Announcement;
      });

      await addCountsToAnnouncements(arr);

      setItems((prev) => [...prev, ...arr]);

      lastDocRef.current = qSnap.docs.length
        ? qSnap.docs[qSnap.docs.length - 1]
        : lastDocRef.current;

      setHasMore(qSnap.docs.length === PAGE_SIZE);
    } catch (err) {
      toast.error("Devamı alınırken hata oluştu");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!sentinelRef.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { rootMargin: "1200px" }
    );

    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [sentinelRef.current, hasMore, loadingMore]);

  async function refreshTop() {
    try {
      const qSnap = await getDocs(
        query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
          limit(Math.max(PAGE_SIZE, items.length))
        )
      );

      let arr: Announcement[] = qSnap.docs.map((d) => {
        const data = d.data() as any;
        let targetGrades: string[] = data.targetGrades || [];
        if (!targetGrades.length && data.target) {
          if (data.target === "Tüm Okul") targetGrades = ["all"];
          else if (typeof data.target === "string") {
            const gradeKey = data.target.split(".")[0];
            targetGrades = [gradeKey, "all"];
          }
        }
        if (!targetGrades.includes("all")) targetGrades.push("all");

        return {
          id: d.id,
          ...data,
          targetGrades,
        } as Announcement;
      });

      await addCountsToAnnouncements(arr);

      setItems(arr);
      lastDocRef.current = qSnap.docs.length
        ? qSnap.docs[qSnap.docs.length - 1]
        : null;

      setHasMore(qSnap.docs.length >= PAGE_SIZE);
    } catch (err) {
    }
  }

  async function handleEditSave() {
    if (!editItem) return;

    if (!editItem.title.trim() || !editItem.content.trim()) {
      toast.error("Başlık ve içerik zorunludur");
      return;
    }

    if (user?.role !== "idareci" && editItem.createdByUid !== user?.uid) {
      toast.error("Bu duyuruyu düzenleme yetkin yok");
      return;
    }

    setEditSaving(true);

    const finalTargetGrades = Array.from(
      new Set([...(editItem.targetGrades || []), "all"])
    );

    try {
      await updateDoc(doc(db, "announcements", editItem.id), {
        title: editItem.title,
        content: editItem.content,
        targetGrades: finalTargetGrades,
      });

      toast.success("Duyuru güncellendi");

      setItems((prev) =>
        prev.map((x) =>
          x.id === editItem.id
            ? { ...x, ...editItem, targetGrades: finalTargetGrades }
            : x
        )
      );

      setEditItem(null);
    } catch (err) {
      toast.error("Güncellenemedi");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;

    if (user?.role !== "idareci" && deleteItem.createdByUid !== user?.uid) {
      toast.error("Bu duyuruyu silme yetkin yok");
      return;
    }

    setDeleting(true);

    try {
      await deleteDoc(doc(db, "announcements", deleteItem.id));
      toast.success("Silindi");

      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      setDeleteItem(null);
    } catch (err) {
      toast.error("Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...items];

    if (filterTarget !== "Hepsi") {
      if (filterTarget === "Tüm Okul") {
        list = list.filter((x) => x.targetGrades?.includes("all"));
      } else {
        const gradeKey = filterTarget.split(".")[0];
        list = list.filter((x) => x.targetGrades?.includes(gradeKey));
      }
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.content.toLowerCase().includes(q) ||
          (x.createdBy || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, filterTarget, searchText]);

  function formatDate(ts?: Timestamp | null) {
    if (!ts) return "-";
    try {
      return ts.toDate().toLocaleString("tr-TR");
    } catch {
      return "-";
    }
  }

  function renderTargetGrades(a: Announcement) {
    if (!a.targetGrades || a.targetGrades.length === 0) return "-";

    if (a.targetGrades.includes("all")) {
      return "Tüm Okul";
    }

    const labels = a.targetGrades
      .filter((g) => g !== "all")
      .map((g) => {
        const found = GRADE_OPTIONS.find((opt) => opt.key === g);
        return found?.label || g;
      });

    return labels.join(", ");
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <Toaster position="top-right" />

      {/* iOS Premium Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <Bell className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Duyurular
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Yeni duyuru oluşturun ve mevcut duyuruları yönetin
        </p>
      </div>

      {/* iOS Premium FORM */}
      <form
        onSubmit={handleCreate}
        className="ios-card p-6 sm:p-8 space-y-6"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Başlık
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
              placeholder="Duyuru başlığı..."
              required
            />
          </div>

          {/* Hedef Sınıflar (çoklu seçim) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Hedef Sınıflar
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GRADE_OPTIONS.map((g) => (
                <label
                  key={g.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-ios-sm border-2 cursor-pointer transition-all
                    ${targetGrades.includes(g.key)
                      ? "bg-ios-blue/10 dark:bg-ios-blue/20 border-ios-blue dark:border-ios-blue/50"
                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-ios-blue/30"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={targetGrades.includes(g.key)}
                    onChange={() => toggleGrade(g.key)}
                    className="w-4 h-4 rounded text-ios-blue focus:ring-ios-blue"
                  />
                  <span className={`text-sm font-medium ${
                    targetGrades.includes(g.key)
                      ? "text-ios-blue dark:text-ios-teal"
                      : "text-gray-700 dark:text-gray-300"
                  } ${g.key === "all" ? "opacity-70" : ""}`}>
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-ios-gray dark:text-gray-400 mt-3">
              "Tüm Okul" zorunlu olarak seçilidir ve kaldırılamaz.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            İçerik
          </label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white resize-none"
            placeholder="Duyuru metnini buraya yazın..."
            required
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <label className="inline-flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={notifyAll}
              onChange={(e) => setNotifyAll(e.target.checked)}
              className="w-5 h-5 rounded-ios-sm text-ios-blue focus:ring-ios-blue cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-ios-blue dark:group-hover:text-ios-teal transition-colors">
              Tüm ilgili velilere bildirim gönder
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="ios-button px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Kaydediliyor...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" /> Kaydet
              </>
            )}
          </button>
        </div>
      </form>

      {/* iOS Premium Arama & Filtre */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray">
            <Search className="w-5 h-5" />
          </div>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="🔍 Başlık, içerik, yazar ara..."
            className="ios-input w-full pl-12 pr-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
          />
        </div>

        <select
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
          className="ios-input px-4 py-3.5 text-gray-900 dark:text-white min-w-[180px]"
        >
          {FILTER_TARGETS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* iOS Premium TABLO */}
      <div className="overflow-x-auto ios-card">
        <table className="min-w-full text-sm table-fixed">
          <thead>
            <tr className="text-left border-b border-gray-200/50 dark:border-gray-700/50">
              <th className="px-4 py-4 w-[14%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Başlık
              </th>
              <th className="px-4 py-4 w-[24%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                İçerik
              </th>
              <th className="px-4 py-4 w-[14%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Hedef Sınıflar
              </th>
              <th className="px-4 py-4 w-[12%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Oluşturan
              </th>
              <th className="px-4 py-4 w-[12%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Tarih
              </th>
              <th className="px-4 py-4 w-[8%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Gönderilen
              </th>
              <th className="px-4 py-4 w-[8%] text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Okuyan
              </th>
              <th className="px-4 py-4 w-[4%] text-center text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Düzenle
              </th>
              <th className="px-4 py-4 w-[4%] text-center text-xs font-semibold text-ios-gray dark:text-gray-400 uppercase tracking-wide">
                Sil
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-t border-gray-100/50 dark:border-gray-700/30 
                          hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
              >
                {/* Başlık */}
                <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white truncate">
                  {a.title}
                </td>

                {/* İçerik */}
                <td className="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm">
                  {a.content.length > 50
                    ? a.content.slice(0, 50) + "..."
                    : a.content}
                </td>

                {/* Hedef Sınıflar */}
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                 bg-ios-blue/10 dark:bg-ios-blue/20
                                 text-ios-blue dark:text-ios-teal
                                 border border-ios-blue/20 dark:border-ios-blue/30">
                    {renderTargetGrades(a)}
                  </span>
                </td>

                {/* Oluşturan */}
                <td className="px-4 py-4">
                  {a.createdBy && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                   bg-gray-100 dark:bg-gray-800
                                   text-gray-700 dark:text-gray-300">
                      {a.createdBy}
                    </span>
                  )}
                </td>

                {/* Tarih */}
                <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(a.createdAt)}
                </td>

                {/* Gönderilen */}
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                                 bg-emerald-100 dark:bg-emerald-900/30
                                 text-emerald-700 dark:text-emerald-300">
                    {a.sentCount ?? 0}
                  </span>
                </td>

                {/* Okuyan */}
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                                 bg-blue-100 dark:bg-blue-900/30
                                 text-blue-700 dark:text-blue-300">
                    {a.readCount ?? 0}
                  </span>
                </td>

                {/* Düzenle */}
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => setEditItem(a)}
                    className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                             bg-ios-orange/10 dark:bg-ios-orange/20
                             hover:bg-ios-orange/20 dark:hover:bg-ios-orange/30
                             text-ios-orange dark:text-ios-orange
                             border border-ios-orange/20 dark:border-ios-orange/30
                             active:scale-95 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>

                {/* Sil */}
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => setDeleteItem(a)}
                    className="w-9 h-9 flex items-center justify-center rounded-ios-sm
                             bg-ios-red/10 dark:bg-ios-red/20
                             hover:bg-ios-red/20 dark:hover:bg-ios-red/30
                             text-ios-red dark:text-ios-red
                             border border-ios-red/20 dark:border-ios-red/30
                             active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sonsuz kaydırma sentinel */}
      <div ref={sentinelRef} className="h-10"></div>

      {loadingMore && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-ios-blue dark:text-ios-teal" />
            <span className="text-ios-gray dark:text-gray-400 font-medium">Yükleniyor...</span>
          </div>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="text-center py-6">
          <p className="text-ios-gray dark:text-gray-400 font-medium">
            Tüm duyurular yüklendi
          </p>
        </div>
      )}

      {/* iOS Premium DÜZENLE MODALI */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-md relative animate-scaleIn">
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
              Duyuruyu Düzenle
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Başlık
                </label>
                <input
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white"
                  value={editItem.title}
                  onChange={(e) =>
                    setEditItem({ ...editItem, title: e.target.value })
                  }
                  placeholder="Duyuru başlığı..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  İçerik
                </label>
                <textarea
                  className="ios-input w-full px-4 py-3.5 text-gray-900 dark:text-white resize-none"
                  rows={5}
                  value={editItem.content}
                  onChange={(e) =>
                    setEditItem({ ...editItem, content: e.target.value })
                  }
                  placeholder="Duyuru metnini buraya yazın..."
                />
              </div>
            </div>

            {/* iOS Premium Hedef Sınıflar */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Hedef Sınıflar
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GRADE_OPTIONS.map((g) => (
                  <label
                    key={g.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-ios-sm border-2 cursor-pointer transition-all
                      ${editItem.targetGrades?.includes(g.key)
                        ? "bg-ios-blue/10 dark:bg-ios-blue/20 border-ios-blue dark:border-ios-blue/50"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-ios-blue/30"
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-ios-blue focus:ring-ios-blue"
                      checked={editItem.targetGrades?.includes(g.key)}
                      onChange={() => {
                        let updated = [...(editItem.targetGrades || [])];

                        if (updated.includes(g.key)) {
                          updated = updated.filter((x) => x !== g.key);
                        } else {
                          updated.push(g.key);
                        }

                        setEditItem({
                          ...editItem,
                          targetGrades: updated,
                        });
                      }}
                    />

                    <span className={`text-sm font-medium ${
                      editItem.targetGrades?.includes(g.key)
                        ? "text-ios-blue dark:text-ios-teal"
                        : "text-gray-700 dark:text-gray-300"
                    } ${g.key === "all" ? "opacity-70" : ""}`}>
                      {g.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <button
                className="px-6 py-3 rounded-ios-sm font-medium
                         bg-gray-100 dark:bg-gray-800
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         text-gray-700 dark:text-gray-300
                         active:scale-95 transition-all"
                onClick={() => setEditItem(null)}
              >
                İptal
              </button>

              <button
                disabled={editSaving}
                onClick={handleEditSave}
                className="ios-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSaving ? (
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

      {/* iOS Premium SİL MODALI */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="ios-card p-6 sm:p-8 w-full max-w-sm text-center animate-scaleIn">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full 
                          bg-ios-red/10 dark:bg-ios-red/20
                          flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-ios-red" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Duyuruyu Sil?
            </h3>
            <p className="text-sm text-ios-gray dark:text-gray-400 mb-6">
              "{deleteItem.title}" duyurusunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
                disabled={deleting}
                onClick={handleDelete}
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
