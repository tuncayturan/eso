"use client";

import VeliHeader from "@/components/VeliHeader";
import { useAuth } from "@/context/AuthContext";
import NotificationBootstrap from "@/components/NotificationBootstrap";

export default function VeliLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100">
      <VeliHeader />
      {user && <NotificationBootstrap userId={user.uid} />}
      <main className="relative z-0 pb-10 pt-4">
        {children}
      </main>
    </div>
  );
}
