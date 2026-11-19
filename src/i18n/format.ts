import type { Locale } from "@/lib/i18n";

export function formatDate(value: Date | string | number, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = "INR") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
