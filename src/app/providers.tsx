"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "@/contexts/theme-context";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/lib/i18n";

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 min - dedupe requests within 1 min
  keepPreviousData: true,
};

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Record<string, unknown>;
}) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>{children}</SessionProvider>
        </NextIntlClientProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
