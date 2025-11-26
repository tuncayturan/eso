"use client";

import firebase, { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || "";

let messagingInstance: firebase.messaging.Messaging | null = null;

async function getMessagingIfSupported() {
  if (typeof window === "undefined") return null;
  try {
    const supported = firebase.messaging.isSupported();
    if (!supported) {
      return null;
    }
    if (!firebase.apps.length) {
      return null;
    }
    if (!messagingInstance) {
      messagingInstance = firebase.messaging();
    }
    return messagingInstance;
  } catch (err) {
    return null;
  }
}

async function getOrRegisterSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existing = registrations.find(reg => 
      reg.active?.scriptURL?.includes("firebase-messaging-sw.js")
    );
    
    if (existing && existing.active) {
      return existing;
    }
    
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (err) {
    return null;
  }
}

async function upsertDeviceDoc(token: string, userId?: string) {
  const uid = userId || auth.currentUser?.uid || "anonymous";
  const email = auth.currentUser?.email || null;

  await setDoc(
    doc(db, "devices", token),
    {
      uid,
      email,
      token,
      platform: "web",
      createdAt: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { merge: true }
  );
}

export async function requestNotificationPermission(userId?: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const storedToken = localStorage.getItem("fcm_token");
  const storedUid = localStorage.getItem("fcm_uid");

  if (storedToken && storedUid === (userId || auth.currentUser?.uid || "anonymous")) {
    return storedToken;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  const swReg = await getOrRegisterSW();
  if (!swReg) return null;

  const token = await messaging.getToken({
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) {
    return null;
  }

  const currentUser = auth.currentUser;
  const finalUserId = userId || currentUser?.uid || "anonymous";

  try {
    await upsertDeviceDoc(token, finalUserId);

    if (currentUser) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        tokens: arrayUnion(token),
        tokensUpdatedAt: serverTimestamp(),
      });
    }

    localStorage.setItem("fcm_token", token);
    localStorage.setItem("fcm_uid", finalUserId);
  } catch (err) {
  }

  return token;
}

export async function listenForMessages(
  onNotify?: (title: string, body?: string) => void
) {
  if (typeof window === "undefined") {
    return;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return;
  }

  messaging.onMessage((payload) => {
    const title = payload?.notification?.title ?? payload?.data?.title ?? "Yeni duyuru";
    const body = payload?.notification?.body ?? payload?.data?.body ?? "";
    const url = payload?.data?.url ?? payload?.data?.click_action ?? "/";

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body,
          icon: "/icons/icon-512.png",
          badge: "/icons/icon-192.png",
          tag: payload?.data?.annId || payload?.data?.type || "notification",
          requireInteraction: false,
          data: { url },
        });

        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (url && url !== "/") {
            window.location.href = url;
          }
          notification.close();
        };
      } catch (err) {
      }
    }

    if (onNotify) onNotify(title, body);
  });
}
