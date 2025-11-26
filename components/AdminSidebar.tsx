"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Bell,
  ClipboardList,
  LogOut,
  MessageCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import Image from "next/image";

interface SidebarProps {
  menuOpen: boolean;
  setMenuOpen: (val: boolean) => void;
}

export default function AdminSidebar({ menuOpen, setMenuOpen }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function fetchUserData() {
      if (!user?.uid) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setPhotoURL(data.photoURL || null);
          setDisplayName(data.name || user.email || "");
        }
      } catch (err) {
      }
    }
    fetchUserData();
  }, [user]);

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
  }, [user]);

  const isActive = (path: string) =>
    pathname === path
      ? "bg-ios-blue text-white shadow-ios-button"
      : "text-gray-700 dark:text-gray-300";

  const handleLogout = async () => {
    await signOut(auth);
  };

  const menuItems = [
    { name: "Duyurular", icon: Bell, path: "/admin/duyurular" },
    { name: "Mesajlar", icon: MessageCircle, path: "/admin/mesajlar" },
    { name: "Profil", icon: ClipboardList, path: "/admin/profile" },
  ];

  const adminItems = [
    { name: "Anasayfa", icon: LayoutDashboard, path: "/admin/anasayfa" },
    { name: "Kullanıcı Yönetimi", icon: Users, path: "/admin/kullanicilar" },
    { name: "Veliler", icon: UsersRound, path: "/admin/veliler" },
  ];

  const visibleMenus =
    user?.role === "idareci" ? [...adminItems, ...menuItems] : menuItems;

  return (
    <>
      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 ios-card border-r border-white/20 dark:border-white/10 
                   flex flex-col transform transition-transform duration-300 z-40
                   ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-ios-sm overflow-hidden border-2 border-ios-blue/20 shadow-ios">
              <Image
                src={photoURL || "/default-avatar.png"}
                alt="Profil"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>

            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                {user?.role === "idareci" ? "İdare Paneli" : "Öğretmen Paneli"}
              </h1>
              <p className="text-xs text-ios-gray dark:text-gray-400 truncate max-w-[130px]">
                {displayName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMenuOpen(false)}
            className="md:hidden w-10 h-10 flex items-center justify-center 
                       rounded-ios-sm bg-gray-100 dark:bg-gray-800 active:scale-95 transition"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleMenus.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMenuOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-ios-sm font-medium transition-all
                ${isActive(item.path)
                  ? "bg-ios-blue text-white shadow-ios-button"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                } active:scale-98`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>

              {item.name === "Mesajlar" && unreadCount > 0 && (
                <span className="ml-auto bg-ios-red text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center shadow-lg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 
                     bg-red-50 dark:bg-red-900/20 text-ios-red 
                     py-3 rounded-ios-sm font-semibold
                     border border-red-200/50 dark:border-red-800/50
                     active:scale-98 transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-fadeIn"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
