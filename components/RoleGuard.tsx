"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface RoleGuardProps {
  children: React.ReactNode;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const logoutFlag = searchParams.get("logout");

  useEffect(() => {
    if (loading) return;

    if (logoutFlag) return;

    const isPublicVeli =
      pathname.startsWith("/veli/duyurular") ||
      pathname.startsWith("/veli/duyuru");

    const isPrivateVeli =
      pathname.startsWith("/veli/mesajlar") ||
      pathname.startsWith("/veli/profil");

    const isAdmin = pathname.startsWith("/admin");

    if (!user) {
      if (isPrivateVeli || isAdmin) {
        router.replace("/login");
        return;
      }

      if (isPublicVeli) return;

      if (pathname === "/") {
        router.replace("/veli/duyurular");
        return;
      }

      return;
    }

    const role = user.role;

    if (role === "veli") {
      if (!pathname.startsWith("/veli")) {
        router.replace("/veli/duyurular");
      }
      return;
    }

    if (role === "ogretmen" || role === "idareci") {
      if (!pathname.startsWith("/admin")) {
        router.replace("/admin/anasayfa");
      }
      return;
    }

    router.replace("/login");
  }, [user, loading, pathname, logoutFlag]);

  return <>{children}</>;
}
