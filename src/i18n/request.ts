import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { parseLocale, LOCALE_COOKIE } from "@/lib/i18n";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const [messages, staticMessages] = await Promise.all([
    import(`./messages/${locale}.json`),
    import(`./messages/static-${locale}.json`),
  ]);

  return { locale, messages: { ...messages.default, static: staticMessages.default } };
});
