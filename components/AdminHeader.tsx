"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

interface HeaderProps {
  setMenuOpen: (val: boolean) => void;
}

export default function AdminHeader({ setMenuOpen }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [unreadCount, setUnreadCount] = useState(0);

  const lastPlayedTimestamp = useRef<number>(0);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;

      const docData = snap.docs[0].data() as any;
      if (!docData.timestamp || !docData.timestamp.toDate) return;

      const msgTime = docData.timestamp.toDate().getTime();

      if (msgTime <= lastPlayedTimestamp.current) return;

      if (docData.read === false) {
        const audio = new Audio("/receive.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }

      lastPlayedTimestamp.current = msgTime;
    });

    return () => unsub();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/10 
                       flex items-center justify-between px-4 md:px-6 py-3">

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden w-10 h-10 flex items-center justify-center 
                     rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                     shadow-ios active:scale-95 transition-all backdrop-blur-sm
                     border border-gray-200/50 dark:border-gray-700/50"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Image
              src="/icons/icon-512.png"
              alt="Okul Logosu"
              width={44}
              height={44}
              className="rounded-ios-sm shadow-ios"
              priority
            />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              Erdoğan Şahinoğlu Ortaokulu
            </h1>
            <p className="text-xs text-ios-gray dark:text-gray-400">
              Yönetim Paneli
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
        <Link 
          href="/admin/mesajlar" 
          className="relative w-11 h-11 flex items-center justify-center 
                     rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                     shadow-ios active:scale-95 transition-all backdrop-blur-sm
                     border border-gray-200/50 dark:border-gray-700/50
                     hover:bg-gray-50 dark:hover:bg-gray-700/80"
        >
          <Bell className="w-5 h-5 text-ios-blue dark:text-ios-teal" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px]
                           flex items-center justify-center text-[11px] 
                           bg-ios-red text-white rounded-full px-1 font-bold
                           shadow-lg border-2 border-white dark:border-gray-900
                           animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <span className="hidden sm:inline font-medium text-gray-900 dark:text-white 
                        truncate max-w-[150px] px-3">
          {user?.name || user?.email}
        </span>

        <button
          onClick={toggleTheme}
          className="w-11 h-11 flex items-center justify-center 
                     rounded-ios-sm bg-white/80 dark:bg-gray-800/80 
                     shadow-ios active:scale-95 transition-all backdrop-blur-sm
                     border border-gray-200/50 dark:border-gray-700/50
                     hover:bg-gray-50 dark:hover:bg-gray-700/80"
          title={theme === "dark" ? "Aydınlık Tema" : "Karanlık Tema"}
        >
          {theme === "dark" ? (
            <span className="text-2xl">🌞</span>
          ) : (
            <span className="text-2xl">🌙</span>
          )}
        </button>
      </div>
    </header>
  );
}
