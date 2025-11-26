import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    // JSON body al
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: "Eksik veri gönderildi" },
        { status: 400 }
      );
    }

    // 🔹 Auth'ta kullanıcı oluştur
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    // 🔹 Firestore'a yaz
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        uid: userRecord.uid,
        message: "Kullanıcı başarıyla oluşturuldu",
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Bilinmeyen bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
