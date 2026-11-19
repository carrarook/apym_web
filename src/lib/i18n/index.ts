export type Locale = "pt-BR" | "en";

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
];

export function parseLocale(value: string | null | undefined): Locale {
  return value === "en" || value === "pt-BR" ? value : DEFAULT_LOCALE;
}

export function createLocaleCookie(locale: Locale, secure: boolean) {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
