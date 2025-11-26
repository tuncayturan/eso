"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import {
  Sun,
  Moon,
  Menu,
  MessageSquare,
  LogOut,
  User,
  Home,
  LogInIcon,
  Bell,
} from "lucide-react";

import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function VeliHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [openSheet, setOpenSheet] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const saved =
      (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  useEffect(() => {
    const handler = () => setShowTopBtn(window.scrollY > 350);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const go = (path: string) => {
    setOpenSheet(false);
    if (pathname !== path) router.push(path);
  };

  const getSubtitle = () => {
    if (pathname?.startsWith("/veli/mesajlar")) return "Mesajlar";
    if (pathname?.startsWith("/veli/profil")) return "Profil";
    return "Duyurular";
  };

  const doLogout = async () => {
    await signOut(auth);
    router.replace("/veli/duyurular?logout=yes");
  };

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });

    return () => unsub();
  }, [user?.uid]);

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 glass sticky top-0 z-50 border-b border-white/20 dark:border-white/10">
        <div
          className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
          onClick={() => go("/veli/duyurular")}
        >
          <div className="relative">
            <Image
              src="/icons/icon-512.png"
              width={44}
              height={44}
              alt="logo"
              className="rounded-ios-sm shadow-ios"
            />
          </div>
          <div className="leading-tight">
            <h2 className="font-semibold text-[16px] text-gray-900 dark:text-white">
              Erdoğan Şahinoğlu Ortaokulu
            </h2>
            <p className="text-xs text-ios-gray dark:text-gray-400">
              {getSubtitle()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-3">
            {!user && (
              <button
                onClick={() => router.push("/login")}
                className="ios-button px-4 py-2 text-sm flex items-center gap-2"
              >
                <LogInIcon size={16} />
                Giriş Yap
              </button>
            )}

            {user && (
              <div className="flex items-center gap-2 px-3">
                {user?.photoURL ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 dark:border-gray-700/50 shadow-ios">
                    <Image
                      src={user.photoURL}
                      alt={user.name || "Kullanıcı"}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center 
                                bg-gradient-to-br from-ios-blue to-ios-indigo 
                                text-white text-sm font-semibold shadow-ios
                                border-2 border-white/50 dark:border-gray-700/50">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </span>
              </div>
            )}

            {/* iOS Premium Mesaj Butonu */}
            {user && (
              <button
                onClick={() => router.push("/veli/mesajlar")}
                className="relative w-11 h-11 flex items-center justify-center 
                rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                shadow-ios active:scale-95 transition-all backdrop-blur-sm
                border border-gray-200/50 dark:border-gray-700/50"
              >
                <MessageSquare
                  size={20}
                  className="text-ios-blue dark:text-ios-teal"
                />

                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[20px] h-[20px]
                    flex items-center justify-center text-[11px] 
                    bg-ios-red text-white rounded-full px-1 font-bold
                    shadow-lg border-2 border-white dark:border-gray-900
                    animate-pulse"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                onClick={() => router.push("/veli/profil")}
                className="w-11 h-11 flex items-center justify-center 
                rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                shadow-ios active:scale-95 transition-all backdrop-blur-sm
                border border-gray-200/50 dark:border-gray-700/50"
              >
                <User size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="w-11 h-11 flex items-center justify-center 
              rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
              shadow-ios active:scale-95 transition-all backdrop-blur-sm
              border border-gray-200/50 dark:border-gray-700/50"
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-ios-orange" />
              ) : (
                <Moon size={18} className="text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {user && (
              <button
                onClick={doLogout}
                className="w-11 h-11 flex items-center justify-center 
                rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                shadow-ios active:scale-95 transition-all backdrop-blur-sm
                border border-gray-200/50 dark:border-gray-700/50"
              >
                <LogOut size={18} className="text-ios-red" />
              </button>
            )}
          </div>

          <button
            onClick={() => setOpenSheet(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center 
            rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
            shadow-ios active:scale-95 transition-all backdrop-blur-sm
            border border-gray-200/50 dark:border-gray-700/50"
          >
            <Menu size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </header>

      {openSheet && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] animate-fadeIn"
          onClick={() => setOpenSheet(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 ios-card p-6 animate-slideDown shadow-ios-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Menü</h3>
              <button
                onClick={() => setOpenSheet(false)}
                className="w-10 h-10 flex items-center justify-center rounded-ios-sm bg-gray-100 dark:bg-gray-800 active:scale-95 transition"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => go("/veli/duyurular")}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                bg-gray-50 dark:bg-gray-800/50 active:scale-98 transition-all
                border border-gray-200/50 dark:border-gray-700/50"
              >
                <Home size={20} className="text-ios-blue" />
                <span className="font-medium text-gray-900 dark:text-white">Duyurular</span>
              </button>

              {user && (
                <button
                  onClick={() => go("/veli/mesajlar")}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                  bg-gray-50 dark:bg-gray-800/50 active:scale-98 transition-all relative
                  border border-gray-200/50 dark:border-gray-700/50"
                >
                  <MessageSquare size={20} className="text-ios-blue" />
                  <span className="font-medium text-gray-900 dark:text-white">Mesajlar</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-ios-red text-white text-xs font-bold rounded-full px-2 py-1 min-w-[24px] text-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {user && (
                <button
                  onClick={() => go("/veli/profil")}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                  bg-gray-50 dark:bg-gray-800/50 active:scale-98 transition-all
                  border border-gray-200/50 dark:border-gray-700/50"
                >
                  <User size={20} className="text-ios-blue" />
                  <span className="font-medium text-gray-900 dark:text-white">Profil</span>
                </button>
              )}

              {!user && (
                <button
                  onClick={() => go("/login")}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                  bg-gray-50 dark:bg-gray-800/50 active:scale-98 transition-all
                  border border-gray-200/50 dark:border-gray-700/50"
                >
                  <LogInIcon size={20} className="text-ios-blue" />
                  <span className="font-medium text-gray-900 dark:text-white">Giriş Yap</span>
                </button>
              )}

              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                bg-gray-50 dark:bg-gray-800/50 active:scale-98 transition-all
                border border-gray-200/50 dark:border-gray-700/50"
              >
                {theme === "dark" ? (
                  <Sun size={20} className="text-ios-orange" />
                ) : (
                  <Moon size={20} className="text-ios-blue" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">Tema Değiştir</span>
              </button>

              {user && (
                <button
                  onClick={doLogout}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-ios-sm 
                  bg-red-50 dark:bg-red-900/20 active:scale-98 transition-all
                  border border-red-200/50 dark:border-red-800/50"
                >
                  <LogOut size={20} className="text-ios-red" />
                  <span className="font-medium text-ios-red">Çıkış Yap</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full 
          ios-button shadow-ios-button flex items-center justify-center 
          active:scale-95 transition-all"
        >
          <span className="text-white text-xl">↑</span>
        </button>
      )}
    </>
  );
}
