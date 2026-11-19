"use client";

import { useTranslations } from "next-intl";

export function LocalizedText({
  id,
  leading = "",
  trailing = "",
}: {
  id: string;
  leading?: string;
  trailing?: string;
}) {
  const t = useTranslations("static");
  return `${leading}${t(id)}${trailing}`;
}
