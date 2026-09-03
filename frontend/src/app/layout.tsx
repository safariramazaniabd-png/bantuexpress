import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ServiceWorkerRegistration } from "@/components/providers/service-worker-registration";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BantuExpress — Adresses, Livraison & Services en RDC",
  description:
    "Trouvez des adresses, géolocalisez des points de repère, commandez des livraisons et accédez aux services d'urgence en République Démocratique du Congo.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BantuExpress" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(geistSans.variable, geistMono.variable, "h-full antialiased")}>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <QueryProvider>
          <AuthProvider>
            <ServiceWorkerRegistration />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
