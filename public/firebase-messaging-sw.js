importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAoj_egDTY3p-5F0k79cIK6vfdVZUY36cM",
  authDomain: "okulapp-6726d.firebaseapp.com",
  projectId: "okulapp-6726d",
  storageBucket: "okulapp-6726d.firebasestorage.app",
  messagingSenderId: "46089914173",
  appId: "1:46089914173:web:c654b3e2e22c1aefb3a754",
});

self.addEventListener("install", (e) => {
  console.log("[SW] INSTALLED");
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("[SW] ACTIVATED");
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[SW] PUSH EVENT RAW:", event);

  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
      console.log("[SW] PARSED PAYLOAD:", payload);
    } else {
      console.warn("[SW] event.data is null");
    }
  } catch (err) {
    console.error("[SW] JSON PARSE ERROR:", err);
    try {
      payload = { notification: { title: "Yeni Bildirim", body: event.data?.text() || "" } };
    } catch (e) {
      payload = { notification: { title: "Yeni Bildirim", body: "" } };
    }
  }

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Yeni Bildirim";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "";

  let url =
    payload?.fcmOptions?.link ||
    payload?.webpush?.fcm_options?.link ||
    payload?.data?.url ||
    payload?.data?.click_action ||
    "/";

  console.log("[SW] ORJ URL:", url);

  try {
    if (url && url.startsWith("http")) {
      const u = new URL(url, self.location.origin);
      url = u.pathname + u.search;
    }
  } catch (err) {
    console.warn("[SW] URL PARSE ERROR:", err);
    url = "/";
  }

  if (url.startsWith("/mesajlar")) url = "/veli" + url;
  if (url.startsWith("/duyuru/")) url = "/veli" + url;

  console.log("[SW] FINAL URL:", url);

  const options = {
    body,
    icon: "/icons/icon-512.png",
    badge: "/icons/icon-192.png",
    data: { url },
    tag: payload?.data?.annId || payload?.data?.type || "notification",
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  console.log("[SW] SHOW NOTIFICATION with options:", options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log("[SW] ✅ Notification başarıyla gösterildi");
      })
      .catch((err) => {
        console.error("[SW] ❌ SHOW NOTIFICATION ERROR:", err);
        console.error("[SW] Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] NOTIFICATION CLICK:", event.notification.data);
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        console.log("[SW] FOUND OPEN TAB");
        client.focus();
        client.navigate(url);
        return;
      }
      console.log("[SW] OPEN NEW TAB:", url);
      return clients.openWindow(url);
    })
  );
});
