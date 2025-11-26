"use client";

import { useEffect } from "react";
import { requestNotificationPermission, listenForMessages } from "@/lib/firebaseMessaging";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase";

export default function NotificationBootstrap({ userId }: { userId: string }) {
  useEffect(() => {
    async function initNotifications() {
      try {
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
              scope: "/",
            });
            
            await navigator.serviceWorker.ready;
          } catch (swError) {
          }
        }

        const token = await requestNotificationPermission(userId);

        if (Notification.permission === "granted") {
          setTimeout(() => {
            listenForMessages((title, body) => {
            });
          }, 500);
        }
      } catch (err) {
      }
    }

    if (userId) initNotifications();
  }, [userId]);

  return null;
}
