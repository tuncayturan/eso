"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import { deleteDoc } from "firebase/firestore";


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
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

import { Send, X, Check, CheckCheck, Trash2, Search, MessageCircle } from "lucide-react";

import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function MesajlarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;

  const [veliler, setVeliler] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");

  const [unreadMap, setUnreadMap] = useState<any>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  useEffect(() => {
    const parent = params.get("parent");

    if (parent && veliler.length > 0) {
      const found = veliler.find((v) => v.id === parent);
      if (found) {
        selectParent(found);
      }
    }
  }, [params, veliler]);

  const t = (m: any) =>
    m.timestamp?.toDate ? m.timestamp.toDate().getTime() : 0;

  useEffect(() => {
    async function load() {
      const q = query(
        collection(db, "messages"),
        where("receiverId", "==", userId)
      );

      const snap = await getDocs(q);
      const parentsMap: any = {};

      snap.forEach((d) => {
        const msg = d.data() as any;
        parentsMap[msg.senderId] = {
          id: msg.senderId,
          name: msg.senderName,
          email: msg.senderEmail,
        };
      });

      setVeliler(Object.values(parentsMap));
    }
    if (userId) load();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const qUnread = query(
      collection(db, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const unsub = onSnapshot(qUnread, (snap) => {
      const temp: any = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        temp[data.senderId] = true;
      });
      setUnreadMap(temp);
    });

    return () => unsub();
  }, [userId]);

  async function selectParent(parent: any) {
    try {
      const ref = doc(db, "users", parent.id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const full = { id: parent.id, ...snap.data() };
        setSelected(full);
      } else {
        setSelected(parent);
      }

      loadChat(parent.id);
    } catch (e) {
      setSelected(parent);
      loadChat(parent.id);
    }
  }

  async function loadChat(parentId: string) {
    if (!userId) return;

    const q1 = query(
      collection(db, "messages"),
      where("senderId", "==", parentId),
      where("receiverId", "==", userId)
    );

    const q2 = query(
      collection(db, "messages"),
      where("senderId", "==", userId),
      where("receiverId", "==", parentId)
    );

    const s1 = await getDocs(q1);
    const s2 = await getDocs(q2);

    const all = [...s1.docs, ...s2.docs]
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => t(a) - t(b));

    setChat(all);

    all.forEach(async (m) => {
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

    const ref = await addDoc(collection(db, "messages"), {
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
          url: `${SITE}/veli/mesajlar?teacher=${userId}`,
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

  function handleEnter(e: any) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) sendMessage();
    }
  }


async function clearChat() {
  if (!selected || !userId) return;

  try {
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

    const allDocs = [...s1.docs, ...s2.docs];

    await Promise.all(allDocs.map((d) => deleteDoc(d.ref)));

    setChat([]);
    toast.success("Bu veli ile olan sohbet tamamen silindi.");

  } catch (err) {
    toast.error("Sohbet silinemedi.");
  }
}

  const filtered = veliler.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="p-4 sm:p-6">
      <Toaster />

      {/* iOS Premium Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <div className="p-2 rounded-ios-sm bg-gradient-to-br from-ios-blue/10 to-ios-indigo/10 
                        dark:from-ios-blue/20 dark:to-ios-indigo/20
                        border border-ios-blue/20 dark:border-ios-blue/30">
            <MessageCircle className="w-6 h-6 text-ios-blue dark:text-ios-teal" />
          </div>
          Mesajlar
        </h1>
        <p className="text-sm text-ios-gray dark:text-gray-400">
          Velilerle mesajlaşın ve iletişim kurun
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4 sm:gap-6">
        {/* iOS Premium VELİ PANELİ */}
        <div className="hidden md:block ios-card p-5">
          <h2 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">
            Mesaj Gönderen Veliler
          </h2>

          <div className="relative mb-4">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray">
              <Search className="w-4 h-4" />
            </div>
            <input
              placeholder="🔍 Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ios-input w-full pl-10 pr-4 py-3 text-gray-900 dark:text-white placeholder:text-ios-gray"
            />
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-ios-gray dark:text-gray-400 text-sm">
                  Veli bulunamadı
                </p>
              </div>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectParent(v)}
                  className={`relative w-full text-left p-4 rounded-ios-sm border-2 transition-all
                    ${
                      selected?.id === v.id
                        ? "bg-ios-blue text-white border-ios-blue shadow-ios-button"
                        : "ios-card border-gray-200/50 dark:border-gray-700/50 hover:border-ios-blue/30"
                    }`}
                >
                  {/* UNREAD BADGE */}
                  {unreadMap[v.id] && (
                    <span className="absolute right-3 top-3 w-3 h-3 bg-ios-red rounded-full animate-pulse border-2 border-white dark:border-gray-900" />
                  )}

                  <div className={`font-semibold mb-1 ${
                    selected?.id === v.id ? "text-white" : "text-gray-900 dark:text-white"
                  }`}>
                    {v.name}
                  </div>
                  <div className={`text-xs ${
                    selected?.id === v.id ? "text-white/80" : "text-ios-gray dark:text-gray-400"
                  }`}>
                    {v.email}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* iOS Premium SOHBET PANELİ */}
        <div className="ios-card p-5 sm:p-6 flex flex-col min-h-[70vh]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Send className="w-10 h-10 text-ios-gray dark:text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Bir veli seçin
              </p>
              <p className="text-sm text-ios-gray dark:text-gray-500">
                Mesajlaşmaya başlamak için soldan bir veli seçin
              </p>
            </div>
          ) : (
            <>
              {/* iOS Premium ÜST BAR */}
              <div className="flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50 pb-4 mb-4">
                <div>
                  <h2 className="font-bold text-xl text-gray-900 dark:text-white mb-1">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-ios-gray dark:text-gray-400">{selected.email}</p>
                  {selected.phone && (
                    <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">
                      📞 {selected.phone}
                    </p>
                  )}
                </div>

                <button
                  onClick={clearChat}
                  className="w-10 h-10 flex items-center justify-center rounded-ios-sm
                           bg-ios-red/10 dark:bg-ios-red/20
                           hover:bg-ios-red/20 dark:hover:bg-ios-red/30
                           text-ios-red dark:text-ios-red
                           border border-ios-red/20 dark:border-ios-red/30
                           active:scale-95 transition-all"
                  title="Sohbeti temizle"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* iOS Premium MESAJLAR */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chat.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-ios-gray dark:text-gray-400">
                      Henüz mesaj yok. İlk mesajı gönderin!
                    </p>
                  </div>
                ) : (
                  chat.map((msg) => {
                    const mine = msg.senderId === userId;
                    const d = msg.timestamp?.toDate?.();
                    const timeLabel =
                      d &&
                      `${d.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} • ${d.toLocaleDateString("tr-TR")}`;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          mine ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-3 rounded-ios-lg max-w-[75%] text-sm shadow-ios ${
                            mine
                              ? "bg-ios-blue text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          }`}
                        >
                          {msg.message}
                        </div>

                        <div
                          className={`flex items-center gap-2 mt-1.5 text-xs ${
                            mine ? "justify-end" : ""
                          } text-ios-gray dark:text-gray-400`}
                        >
                          <span>{timeLabel}</span>

                          {mine &&
                            (msg.read ? (
                              <CheckCheck className="w-4 h-4 text-ios-blue dark:text-ios-teal" />
                            ) : (
                              <Check className="w-4 h-4" />
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={chatEndRef}></div>
              </div>

              {/* iOS Premium YAZMA ALANI */}
              <div className="flex gap-3 border-t border-gray-200/50 dark:border-gray-700/50 pt-4">
                <input
                  className="ios-input flex-1 px-4 py-3.5 text-gray-900 dark:text-white placeholder:text-ios-gray"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleEnter}
                  placeholder="Mesaj yazın..."
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim()}
                  className="ios-button w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
