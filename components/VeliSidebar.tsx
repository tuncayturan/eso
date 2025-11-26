"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Menu, X, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface Props {
  onSelectUser: (user: User) => void;
}

export default function VeliSidebar({ onSelectUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchUsers() {
      const q = query(
        collection(db, "users"),
        where("role", "in", ["ogretmen", "idareci"]),
        orderBy("name")
      );
      const snap = await getDocs(q);
      const list: User[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (data.verified || data.emailVerified) {
          list.push({
            id: d.id,
            name: data.name || "İsimsiz Kullanıcı",
            email: data.email,
            role: data.role,
            photoURL: data.photoURL || "/default-avatar.png",
          });
        }
      });

      setUsers(list);
    }
    fetchUsers();
  }, []);

  return (
    <>
      {/* 🔹 Mobil Sidebar Aç/Kapat */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-blue-600 text-white p-2 rounded-md shadow"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 🔹 SIDEBAR */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-white dark:bg-neutral-800 border-r dark:border-neutral-700 p-4 transition-transform duration-300 z-50
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-600">👥 Öğretmenler</h2>
          <button onClick={() => setOpen(false)} className="md:hidden text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🔵 Buraya MESAJLAR butonunu ekliyoruz */}
        <button
          onClick={() => {
            router.push("/mesajlar");
            setOpen(false);
          }}
          className="w-full flex items-center gap-3 p-3 mb-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Mesajlar</span>
        </button>

        {/* 🔹 Kullanıcı (Öğretmen/İdareci) listesi */}
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)]">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onSelectUser(u);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-neutral-700 transition"
            >
              <img
                src={u.photoURL}
                alt={u.name}
                className="w-10 h-10 rounded-full border border-gray-300 dark:border-neutral-700 object-cover"
              />

              <div className="text-left">
                <p className="font-medium text-gray-800 dark:text-gray-100">
                  {u.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {u.role}
                </p>
              </div>
            </button>
          ))}

          {users.length === 0 && (
            <div className="text-center text-gray-500 mt-6 text-sm">
              Henüz öğretmen veya idareci bulunamadı.
            </div>
          )}
        </div>
      </aside>

      {/* 🔹 Mobil karartma */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}
    </>
  );
}
