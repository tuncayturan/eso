"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { ArrowLeft, Eye, Share2, Copy } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.3s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent";

function DuyuruSkeleton() {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 sm:p-8 ${shimmer}`}
    >
      <div className="h-6 w-2/3 bg-gray-200 dark:bg-neutral-700 rounded mb-4" />
      <div className="h-4 w-24 bg-gray-300 dark:bg-neutral-700 rounded mb-6" />
      <div className="h-[2px] w-16 bg-gray-300 dark:bg-neutral-700 rounded-full mb-6" />

      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-3/6 bg-gray-200 dark:bg-neutral-700 rounded" />
      </div>

      <div className="mt-10 flex gap-3">
        <div className="h-10 w-28 bg-gray-200 dark:bg-neutral-700 rounded-xl" />
        <div className="h-10 w-28 bg-gray-200 dark:bg-neutral-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function DuyuruDetayPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();

  const [duyuru, setDuyuru] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readCount, setReadCount] = useState<number | null>(null);

  const annId = id as string;

  useEffect(() => {
    async function fetchData() {
      try {
        const ref = doc(db, "announcements", annId);
        const snap = await getDoc(ref);
        if (snap.exists()) setDuyuru(snap.data());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [annId]);

  useEffect(() => {
    async function handleRead() {
      if (!annId) return;

      const readsCol = collection(db, "announcements", annId, "reads");

      const visitorId = user?.uid || "anon_" + Date.now();
      const readRef = doc(readsCol, visitorId);

      const readSnap = await getDoc(readRef);
      if (!readSnap.exists()) {
        await setDoc(readRef, {
          userId: visitorId,
          seenAt: serverTimestamp(),
        });
      }

      const all = await getDocs(readsCol);
      setReadCount(all.size);
    }

    handleRead();
  }, [annId, user]);

  const tarih = duyuru?.createdAt?.seconds
    ? new Date(duyuru.createdAt.seconds * 1000).toLocaleDateString("tr-TR")
    : "";

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <section className="bg-gray-50 dark:bg-neutral-900 min-h-screen text-gray-800 dark:text-gray-100">
      <Toaster position="top-center" containerStyle={{ marginTop: 60 }} />

      <main className="px-4 sm:px-6 py-6 sm:py-8 max-w-3xl mx-auto">
        
        <button
          onClick={() => router.push("/veli/duyurular")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl backdrop-blur-md bg-white/30 dark:bg-neutral-700/20 border border-white/40 dark:border-neutral-600/40 shadow-lg mb-6"
        >
          <ArrowLeft size={18} /> Geri
        </button>

        {loading && <DuyuruSkeleton />}

        {!loading && !duyuru && (
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-800 text-center">
            Duyuru bulunamadı.
          </div>
        )}

        {!loading && duyuru && (
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 sm:p-8">

            <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
              {duyuru.title}
            </h1>

            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              <span>📅 {tarih}</span>

              {duyuru.createdBy && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  👤 {duyuru.createdBy}
                </span>
              )}

              {readCount !== null && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <Eye size={14} /> {readCount}
                </span>
              )}
            </div>

            <div className="mt-4 h-[2px] w-16 bg-blue-500/70 rounded-full" />

            <div className="mt-6 relative group">
              <p 
                className="text-lg whitespace-pre-line leading-relaxed select-text"
                onDoubleClick={async () => {
                  const fullContent = `${duyuru.title}\n\n${duyuru.content}`;
                  try {
                    await navigator.clipboard.writeText(fullContent);
                    toast.success("İçerik kopyalandı!");
                  } catch {
                    toast.error("Kopyalama başarısız");
                  }
                }}
              >
                {duyuru.content}
              </p>
              
              <button
                onClick={async () => {
                  const fullContent = `${duyuru.title}\n\n${duyuru.content}`;
                  try {
                    await navigator.clipboard.writeText(fullContent);
                    toast.success("İçerik kopyalandı!");
                  } catch {
                    toast.error("Kopyalama başarısız");
                  }
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-gray-100 dark:bg-neutral-800 
                         hover:bg-gray-200 dark:hover:bg-neutral-700 
                         flex items-center gap-2 text-sm font-medium
                         text-gray-700 dark:text-gray-300
                         transition-colors"
                title="İçeriği kopyalamak için tıklayın"
              >
                <Copy size={16} /> İçeriği Kopyala
              </button>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => navigator.share?.({ title: duyuru.title, url: shareUrl })}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2"
              >
                <Share2 size={18} /> Paylaş
              </button>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Bağlantı kopyalandı!");
                  } catch {
                    toast.error("Kopyalama başarısız");
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-neutral-800 flex items-center gap-2"
              >
                <Copy size={18} /> Linki Kopyala
              </button>
            </div>
          </div>
        )}
      </main>
    </section>
  );
}
