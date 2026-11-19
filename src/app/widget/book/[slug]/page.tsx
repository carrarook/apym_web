import { getTranslations as getStaticUiTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";

export default async function BookWidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const tStatic = await getStaticUiTranslations("static");
  const locale = await getLocale();
  const { slug } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const src = `${proto}://${host}/book/${slug}`;

  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>
        <iframe
          src={src}
          title={tStatic("9c36fd43f3b1")}
          style={{ width: "100%", minHeight: "720px", border: "none" }}
        />
      </body>
    </html>
  );
}
