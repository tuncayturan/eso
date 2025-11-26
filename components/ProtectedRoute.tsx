"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  allowedRoles: ("idareci" | "ogretmen")[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const currentUser = user as any; // ⭐ TS ve Vercel hatası için garanti çözüm

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push("/admin/login");
      }
      // 👇 Role kontrolü güvenli hale getirildi
      else if (!allowedRoles.includes(currentUser?.role || "")) {
        router.push("/admin/anasayfa");
      }
    }
  }, [currentUser, loading, router, allowedRoles]);

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor...</div>;

  return <>{children}</>;
}
