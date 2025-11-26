"use client";

import RoleGuard from "@/components/RoleGuard";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <RoleGuard>{children}</RoleGuard>;
}
