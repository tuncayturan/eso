import { NextResponse } from "next/server";
import { JWT } from "google-auth-library";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { title, body, annId, targetGrades } = await req.json();

    if (!annId) {
      return NextResponse.json({ ok: false, message: "annId eksik" });
    }

    const gradesFilter =
      Array.isArray(targetGrades) && targetGrades.length > 0
        ? targetGrades
        : null;

    let q;

    if (gradesFilter) {
      q = query(
        collection(db, "users"),
        where("role", "==", "veli"),
        where("preferredGrades", "array-contains-any", gradesFilter)
      );
    } else {
      q = query(collection(db, "users"), where("role", "==", "veli"));
    }

    const userSnap = await getDocs(q);
    if (userSnap.size === 0) {
      return NextResponse.json({
        ok: false,
        message: "Sınıf filtresi sonrası veli bulunamadı",
      });
    }

    const tokens: string[] = [];

    for (const userDoc of userSnap.docs) {
      const userData = userDoc.data();
      if (userData.tokens && Array.isArray(userData.tokens)) {
        tokens.push(...userData.tokens);
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Hiç token yok",
      });
    }

    const jwtClient = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const { access_token } = await jwtClient.authorize();

    const SITE =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? "https://" + process.env.NEXT_PUBLIC_VERCEL_URL
        : "https://localhost:3443");

    const finalUrl = `${SITE}/veli/duyuru/${annId}`;

    const sendUrl = `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`;

    const results: any[] = [];

    for (const token of tokens) {
      const msg = {
        message: {
          token,

          notification: { title, body },

          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              title,
              body,
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
            type: "duyuru",
            click_action: finalUrl,
            annId: String(annId),
            url: finalUrl,
          },
        },
      };

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msg),
      });

      results.push(await res.json());
    }

    return NextResponse.json({ ok: true, sentTo: tokens.length, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
