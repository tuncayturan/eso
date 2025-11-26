import { NextResponse } from "next/server";
import { JWT } from "google-auth-library";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { receiverUid, title, body, url, data } = await req.json();

    if (!receiverUid) {
      return NextResponse.json(
        { ok: false, message: "receiverUid eksik" },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", receiverUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ ok: false, message: "Kullanıcı yok" });
    }

    const userData = userSnap.data();
    const tokens: string[] = userData.tokens && Array.isArray(userData.tokens) 
      ? userData.tokens 
      : [];

    if (tokens.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Bu kullanıcıda token yok",
      });
    }

    const jwtClient = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const { access_token } = await jwtClient.authorize();

    const sendUrl = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`;

    const results: any[] = [];

    const finalUrl =
      url ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/veli/mesajlar?teacher=${data?.senderId}`;

    for (const token of tokens) {
      const messagePayload = {
        message: {
          token,

          notification: {
            title: title || "Yeni Mesaj",
            body: body || "",
          },

          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              title: title || "Yeni Mesaj",
              body: body || "",
              icon: "/icons/icon-512.png",
              badge: "/icons/icon-192.png",
              requireInteraction: true,
              vibrate: [200, 100, 200],
            },
            fcm_options: {
              link: finalUrl,
            },
          },

          data: {
            ...(data || {}),
            type: "message",
            click_action: finalUrl,
            receiverUid: String(receiverUid),
          },
        },
      };

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      });

      const json = await res.json();
      results.push(json);
    }

    return NextResponse.json({
      ok: true,
      sentTo: tokens.length,
      results,
    });

  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
