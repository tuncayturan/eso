import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  try {
    const a = getAuth();
    const user = a.currentUser;

    if (!user) {
      return NextResponse.json({ role: "anonymous" });
    }

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json({ role: "anonymous" });
    }

    const data = snap.data();
    return NextResponse.json({ role: data.role || "anonymous" });

  } catch (err) {
    return NextResponse.json({ role: "anonymous" });
  }
}
