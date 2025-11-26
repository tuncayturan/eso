"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Send,
  X,
  Check,
  CheckCheck,
  Trash2,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

export default function MesajlarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const teacherIdFromURL = params.get("teacher");

  const { user, loading } = useAuth();
  const userId = user?.uid;

  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [unreadMap, setUnreadMap] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    if (user && (user as any).role !== "veli") router.replace("/login");
  }, [user, loading]);

  useEffect(() => {
    async function loadTeachers() {
      const q = query(
        collection(db, "users"),
        where("role", "in", ["ogretmen", "idareci"]),
        orderBy("name")
      );

      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setTeachers(arr);
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const qUnread = query(
      collection(db, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const unsub = onSnapshot(qUnread, (snap) => {
      const map: any = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (!data.hiddenFor || !data.hiddenFor.includes(userId)) {
          map[data.senderId] = true;
        }
      });
      setUnreadMap(map);
    });

    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!teacherIdFromURL) return;
    if (!teachers.length) return;
    if (selected) return;

    const t = teachers.find((x) => x.id === teacherIdFromURL);
    if (t) {
      setSelected(t);
      loadChat(t.id);
      setSidebarOpen(false);
    }
  }, [teacherIdFromURL, teachers, selected]);

  async function loadChat(teacherId: string) {
    if (!userId) return;

    const q1 = query(
      collection(db, "messages"),
      where("senderId", "==", teacherId),
      where("receiverId", "==", userId)
    );

    const q2 = query(
      collection(db, "messages"),
      where("senderId", "==", userId),
      where("receiverId", "==", teacherId)
    );

    const s1 = await getDocs(q1);
    const s2 = await getDocs(q2);

    const allRaw = [...s1.docs, ...s2.docs].map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const all = allRaw
      .filter((m) => !m.hiddenFor || !m.hiddenFor.includes(userId))
      .sort(
        (a, b) =>
          (a.timestamp?.toDate?.()?.getTime?.() || 0) -
          (b.timestamp?.toDate?.()?.getTime?.() || 0)
      );

    setChat(all);

    allRaw.forEach(async (m) => {
      if (!m.read && m.receiverId === userId) {
        await updateDoc(doc(db, "messages", m.id), { read: true });
      }
    });
  }

  useEffect(() => {
    if (!selected || !userId) return;

    const qLive = query(
      collection(db, "messages"),
      where("senderId", "==", selected.id),
      where("receiverId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(qLive, () => loadChat(selected.id));
    return () => unsub();
  }, [selected, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function sendMessage() {
    if (!text.trim() || !selected || !userId) return;

    const messageText = text.trim();

    await addDoc(collection(db, "messages"), {
      senderId: userId,
      senderName: (user as any)?.name || user?.email,
      senderEmail: user?.email,
      receiverId: selected.id,
      receiverName: selected.name,
      receiverEmail: selected.email,
      message: messageText,
      timestamp: serverTimestamp(),
      read: false,
      hiddenFor: [],
    });

    setText("");

    try {
      const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost:3443";
      await fetch("/api/sendMessageNotification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUid: selected.id,
          title: `${user?.name || user?.email} size mesaj gönderdi`,
          body: messageText,
          url: `${SITE}/admin/mesajlar?parent=${userId}`,
          data: {
            senderId: userId,
            type: "message",
          },
        }),
      });
    } catch (err) {
    }

    loadChat(selected.id);
  }

  function onEnterSend(e: any) {
    if (e.key === "Enter" && text.trim()) sendMessage();
  }

  async function clearChat() {
    if (!selected || !userId) return;

    const q1 = query(
      collection(db, "messages"),
      where("senderId", "==", selected.id),
      where("receiverId", "==", userId)
    );

    const q2 = query(
      collection(db, "messages"),
      where("senderId", "==", userId),
      where("receiverId", "==", selected.id)
    );

    const s1 = await getDocs(q1);
    const s2 = await getDocs(q2);

    const arr = [...s1.docs, ...s2.docs];

    await Promise.all(
      arr.map((x) =>
        updateDoc(x.ref, {
          hiddenFor: arrayUnion(userId),
        })
      )
    );

    setChat([]);
    toast.success("Sohbet silindi.");
  }

  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    );
  });

  return (
    <section className="bg-gray-50 dark:bg-neutral-900 min-h-screen text-gray-800 dark:text-gray-100 pt-[0px]">
      <Toaster position="top-center" containerStyle={{ marginTop: 50 }} />

      <div className="md:max-w-6xl md:mx-auto md:grid md:grid-cols-[260px,minmax(0,1fr)] md:gap-6">

        <aside
          className={`fixed md:static left-0 top-[60px] md:top-0 h-[calc(100vh-80px)] w-64 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 p-4 z-40 transform transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-blue-600 dark:text-blue-400 font-semibold text-sm">👥 Öğretmenler / İdareciler</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-600 dark:text-gray-300"
            >
              <X size={18} />
            </button>
          </div>

          <input
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            placeholder="Öğretmen ara..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 outline-none mb-3"
          />

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
            {filteredTeachers.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelected(t);
                  setSidebarOpen(false);
                  loadChat(t.id);
                }}
                className={`relative w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                  selected?.id === t.id
                    ? "bg-blue-600 text-white border-blue-700 shadow"
                    : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700/60"
                }`}
              >
                <img
                  src={t.photoURL || "/default-avatar.png"}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border dark:border-neutral-600"
                />

                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-xs opacity-70">{t.role}</span>
                </div>

                {unreadMap[t.id] && (
                  <span className="absolute right-3 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-30 md:hidden animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <div className="px-4 py-8 md:px-0 md:py-10">
          <div
            style={{ height: "calc(100vh - 120px)" }}
            className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm p-5 sm:p-6 flex flex-col"
          >
            {!selected ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm text-center">
                Menüden öğretmen / idareci seçerek mesaj gönderin 📩
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b dark:border-neutral-700 pb-2 mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">{selected.name}</h2>
                    <p className="text-xs opacity-70">{selected.email}</p>
                  </div>

                  <button
                    onClick={clearChat}
                    className="text-red-500 hover:text-red-600 p-2 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {chat.map((m) => {
                    const mine = m.senderId === userId;

                    const dateObj = m.timestamp?.toDate?.();
                    let timeLabel = "";
                    if (dateObj) {
                      const t = dateObj.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const d = dateObj.toLocaleDateString("tr-TR");
                      timeLabel = `${t} • ${d}`;
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${mine ? "items-end" : "items-start"} animate-message`}
                      >
                        <div
                          className={`px-4 py-2 max-w-[70%] rounded-2xl text-sm ${
                            mine
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-gray-50"
                          }`}
                        >
                          {m.message}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                          <span>{timeLabel}</span>
                          {mine &&
                            (m.read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={chatEndRef}></div>
                </div>

                <div className="flex items-center gap-3 border-t dark:border-neutral-700 pt-3 mt-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onEnterSend}
                    placeholder="Mesaj yaz..."
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-neutral-700 outline-none"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!text.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl disabled:opacity-60"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center active:scale-90 transition-all hover:bg-blue-700 animate-fab"
      >
        <Users size={20} />
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-message {
          animation: slideIn 0.2s ease-out;
        }

        @keyframes fabPop {
          from { transform: scale(0.7); }
          to { transform: scale(1); }
        }
        .animate-fab {
          animation: fabPop 0.25s ease-out;
        }
      `}</style>
    </section>
  );
}
