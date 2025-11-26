"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // 1) Giriş yok → public ana sayfa
    if (!user) {
      router.replace("/veli/duyurular");
      return;
    }

    // 2) Rol kontrolü
    const role = user.role;

    if (role === "veli") {
      router.replace("/veli/duyurular");
      return;
    }

    if (role === "ogretmen" || role === "idareci") {
      router.replace("/admin/anasayfa");
      return;
    }

    // fallback
    router.replace("/login");
  }, [user, loading, router]);

  return null;
}
