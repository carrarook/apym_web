import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Toaster } from "@/components/ui/toaster";
import { createLogger } from "@/lib/logger";
import { APP_NAME } from "@/lib/site-config";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n";

const logger = createLogger("app");

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title", { app: APP_NAME }),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
    icons: { apple: "/icon-192x192.png" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  // Initialize error monitoring on server side only
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const { ErrorMonitor } = await import("@/lib/error-monitor");
      const monitor = ErrorMonitor.getInstance();
      if (!monitor.isRunning) {
        await monitor.start();
      }
    } catch (error) {
      logger.error("Failed to start error monitor:", error as Error);
    }
  }

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingBar />
        <Providers locale={locale} messages={messages}>
          <div className="fixed right-3 top-3 z-[100]">
            <LanguageSwitcher />
          </div>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
