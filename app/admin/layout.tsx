"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import NotificationBootstrap from "@/components/NotificationBootstrap";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [parentList, setParentList] = useState<any[]>([]);
  const [unreadMap, setUnreadMap] = useState<any>({});

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/admin/login");
      } else if (user.role !== "idareci" && user.role !== "ogretmen") {
        router.push("/veli/duyurular");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) return;

    const qParents = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid)
    );

    const unsub1 = onSnapshot(qParents, (snap) => {
      const map: any = {};
      snap.forEach((d) => {
        const data = d.data() as any;
        map[data.senderId] = {
          id: data.senderId,
          name: data.senderName,
          email: data.senderEmail,
        };
      });
      setParentList(Object.values(map));
    });

    const qUnread = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub2 = onSnapshot(qUnread, (snap) => {
      const unreadTemp: any = {};
      snap.forEach((d) => {
        const data = d.data() as any;
        unreadTemp[data.senderId] = true;
      });
      setUnreadMap(unreadTemp);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.uid]);

  function openChat(parentId: string) {
    setDrawerOpen(false);
    router.push(`/admin/mesajlar?parent=${parentId}`);
  }

  if (loading) {
    return (
      <div className={`${inter.className} flex items-center justify-center h-screen`}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Yükleniyor...
      </div>
    );
  }

  if (pathname.includes("/admin/login")) {
    return (
      <div className={`${inter.className} min-h-screen bg-gray-100 dark:bg-neutral-900`}>
        <Toaster position="top-right" />
        {children}
      </div>
    );
  }

  return (
    <div className={`${inter.className} flex h-screen bg-gray-50 dark:bg-neutral-900 overflow-hidden`}>
      <AdminSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <div className="flex flex-col flex-1 h-full overflow-y-auto">
        <AdminHeader setMenuOpen={setMenuOpen} />
        {user && <NotificationBootstrap userId={user.uid} />}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <Toaster position="top-right" />

      {pathname === "/admin/mesajlar" && (
        <>
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl md:hidden z-[999] active:scale-95"
          >
            <MessageSquare size={32} />
          </button>

          {drawerOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-[998]"
              onClick={() => setDrawerOpen(false)}
            >
              <div
                className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-neutral-800 shadow-2xl p-5 animate-slideIn"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-bold mb-4">Veliler</h2>

                <div className="space-y-3 max-h-[85vh] overflow-y-auto">
                  {parentList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openChat(p.id)}
                      className="relative w-full text-left p-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    >
                      {unreadMap[p.id] && (
                        <span className="absolute right-3 top-3 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                      )}
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs opacity-70">{p.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            @keyframes slideIn {
              from {
                transform: translateX(-120px);
                opacity: 0.4;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slideIn {
              animation: slideIn 0.25s ease-out;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
