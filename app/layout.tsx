import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Inter } from "next/font/google";
import ClientInit from "@/components/ClientInit";
import RoleGuard from "@/components/RoleGuard";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.className} suppressHydrationWarning>
      <head>
        <title>Erdoğan Şahinoğlu Ortaokulu</title>

        <link rel="manifest" href="/manifest.json" />

        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__VAPID_KEY__ = "${process.env.NEXT_PUBLIC_VAPID_KEY || ""}";
            `,
          }}
        />
      </head>

      <body className="bg-gray-50 dark:bg-neutral-900" suppressHydrationWarning>
        <ClientInit />

        <AuthProvider>
          <ThemeProvider>
            <Suspense>
              <RoleGuard>{children}</RoleGuard>
            </Suspense>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
