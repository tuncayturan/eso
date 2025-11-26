"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import Link from "next/link";

function mapKategori(k: string) {
  switch (k) {
    case "Tüm Okul":
      return "all";
    case "5. Sınıflar":
      return "5";
    case "6. Sınıflar":
      return "6";
    case "7. Sınıflar":
      return "7";
    case "8. Sınıflar":
      return "8";
    default:
      return "all";
  }
}

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent";

function DuyuruCardSkeleton() {
  return (
    <div
      className={`ios-card p-6 flex flex-col gap-4 ${shimmer}`}
    >
      <div className="h-6 w-3/4 bg-gray-200/50 dark:bg-gray-700/50 rounded-ios-sm" />
      <div className="h-4 w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-ios-sm" />
      <div className="h-4 w-5/6 bg-gray-200/50 dark:bg-gray-700/50 rounded-ios-sm" />
      <div className="h-4 w-4/6 bg-gray-200/50 dark:bg-gray-700/50 rounded-ios-sm" />
      <div className="h-3 w-24 bg-gray-300/50 dark:bg-gray-700/50 rounded-ios-sm mt-auto" />
    </div>
  );
}

export default function VeliDuyurularPage() {
  const [duyurular, setDuyurular] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [kategori, setKategori] = useState("Tüm Okul");
  const [search, setSearch] = useState("");

  const PAGE_SIZE = 6;
  const lastDocRef = useRef<any>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const kategoriler = [
    "Tüm Okul",
    "5. Sınıflar",
    "6. Sınıflar",
    "7. Sınıflar",
    "8. Sınıflar",
  ];

  useEffect(() => {
    async function load() {
      setLoading(true);

      let q;
      if (kategori === "Tüm Okul") {
        q = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      } else {
        const grade = mapKategori(kategori);
        q = query(
          collection(db, "announcements"),
          where("targetGrades", "array-contains", grade),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;

      setDuyurular(arr);
      setLoading(false);
    }

    load();
  }, [kategori]);

  async function fetchMore() {
    if (!lastDocRef.current) return;

    setLoadMoreLoading(true);

    let q;

    if (kategori === "Tüm Okul") {
      q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
    } else {
      const grade = mapKategori(kategori);
      q = query(
        collection(db, "announcements"),
        where("targetGrades", "array-contains", grade),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (snap.docs.length > 0) {
      lastDocRef.current = snap.docs[snap.docs.length - 1];
    } else {
      lastDocRef.current = null;
    }

    setDuyurular((prev) => [...prev, ...arr]);
    setLoadMoreLoading(false);
  }

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadMoreLoading &&
          lastDocRef.current
        ) {
          fetchMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, loadMoreLoading, kategori]);

  const filtered = duyurular.filter(
    (d) =>
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">

      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Duyurular
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Okul duyurularını buradan takip edebilirsiniz
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl 
                       p-1.5 rounded-ios-lg shadow-ios border border-gray-200/50 dark:border-gray-700/50
                       overflow-x-auto">
          {kategoriler.map((k) => (
            <button
              key={k}
              onClick={() => setKategori(k)}
              className={`px-4 py-2 whitespace-nowrap text-sm font-medium rounded-ios-sm transition-all
                ${
                  kategori === k
                    ? "bg-ios-blue text-white shadow-ios-button"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                }
              `}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <input
            placeholder=" Duyuru ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ios-input w-full px-4 py-3.5 pl-12 text-gray-900 dark:text-white 
                     placeholder:text-ios-gray"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DuyuruCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                         bg-gray-100 dark:bg-gray-800 mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                 className="text-ios-gray dark:text-gray-400">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
            Bu başlıkta duyuru bulunamadı
          </p>
          <p className="text-sm text-ios-gray dark:text-gray-500 mt-2">
            Farklı bir içerik yazmayı deneyin
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const tarih = d.createdAt?.seconds
                ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })
                : "";

              const targetGrades = d.targetGrades || [];
              
              let gradeLabel = "Tüm Okul";
              if (kategori !== "Tüm Okul") {
                const currentGrade = mapKategori(kategori);
                if (targetGrades.includes(currentGrade)) {
                  gradeLabel = kategori;
                } else if (targetGrades.includes("all")) {
                  gradeLabel = "Tüm Okul";
                } else if (targetGrades.length > 0) {
                  const grades = targetGrades
                    .filter((g: string) => g !== "all")
                    .map((g: string) => `${g}. Sınıflar`)
                    .join(", ");
                  gradeLabel = grades || "Tüm Okul";
                }
              } else {
                if (targetGrades.includes("all") && targetGrades.length === 1) {
                  gradeLabel = "Tüm Okul";
                } else if (targetGrades.length > 0) {
                  const grades = targetGrades
                    .filter((g: string) => g !== "all")
                    .map((g: string) => `${g}. Sınıflar`)
                    .join(", ");
                  gradeLabel = grades || "Tüm Okul";
                }
              }

              return (
                <Link
                  key={d.id}
                  href={`/veli/duyuru/${d.id}`}
                  className="ios-card p-6 flex flex-col group 
                           hover:scale-[1.02] active:scale-[0.98]
                           transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold
                                  bg-gradient-to-r from-ios-blue/10 to-ios-indigo/10
                                  dark:from-ios-blue/20 dark:to-ios-indigo/20
                                  text-ios-blue dark:text-ios-teal
                                  border border-ios-blue/20 dark:border-ios-blue/30">
                      {gradeLabel}
                    </span>
                    {d.createdBy && (
                      <span className="px-2 py-1 rounded-full text-xs
                                    bg-gray-100 dark:bg-gray-800
                                    text-gray-600 dark:text-gray-400">
                        {d.createdBy}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-xl mb-3 line-clamp-2 
                                text-gray-900 dark:text-white
                                group-hover:text-ios-blue dark:group-hover:text-ios-teal
                                transition-colors">
                    {d.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 flex-1 mb-4 leading-relaxed">
                    {d.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 text-xs text-ios-gray dark:text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{tarih}</span>
                    </div>
                    <div className="text-ios-blue dark:text-ios-teal group-hover:translate-x-1 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {loadMoreLoading && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <DuyuruCardSkeleton key={i} />
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="h-12"></div>
        </>
      )}
    </div>
  );
}
