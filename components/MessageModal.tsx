"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { X, Send } from "lucide-react";

interface Props {
  receiver: { id: string; name: string; email: string };
  sender: { id: string; name: string; email: string };
  onClose: () => void;
}

export default function MessageModal({ receiver, sender, onClose }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!text.trim()) return toast.error("Mesaj boş olamaz!");

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        // 🔹 Gönderen
        senderId: sender.id,
        senderName: sender.name,
        senderEmail: sender.email,

        // 🔹 Alıcı
        receiverId: receiver.id,
        receiverName: receiver.name,
        receiverEmail: receiver.email,

        // 🔹 Mesaj
        message:text.trim(),

        timestamp: serverTimestamp(),
        read: false,
      });

      toast.success("Mesaj gönderildi ✅");
      setText("");
      onClose();
    } catch (err) {
      toast.error("Mesaj gönderilemedi ❌");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {receiver.name}’e Mesaj Gönder
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesajınızı yazın..."
          className="w-full p-2 h-28 border border-gray-300 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-900 resize-none text-sm"
        />

        <button
          onClick={handleSend}
          disabled={sending}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold disabled:opacity-60"
        >
          {sending ? "Gönderiliyor..." : <><Send className="w-4 h-4" /> Gönder</>}
        </button>
      </div>
    </div>
  );
}
