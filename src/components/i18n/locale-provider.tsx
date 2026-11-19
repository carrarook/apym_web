"use client";

import { useCallback } from "react";
import { useLocale as useIntlLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createLocaleCookie, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useLocale() {
  const locale = useIntlLocale() as Locale;
  const messages = useTranslations();
  const router = useRouter();
  const setLocale = useCallback((nextLocale: Locale) => {
    document.cookie = createLocaleCookie(nextLocale, window.location.protocol === "https:");
    router.refresh();
  }, [router]);

  return {
    locale,
    setLocale,
    translate: (key: string) => messages(key),
  };
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const messages = useTranslations("common");

  return (
    <div>
      <label className="sr-only" htmlFor="gymkhana-language">{messages("language")}</label>
      <select
        id="gymkhana-language"
        className="rounded-md border border-border bg-background px-2 py-1 text-sm shadow-sm"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={messages("language")}
      >
        {SUPPORTED_LOCALES.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
