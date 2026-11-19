import { getTranslations as getStaticUiTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { termsSections } from "@/lib/legal/content";
import { localizeLegalSections } from "@/lib/legal/translations";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getStaticUiTranslations("static");
  return { title: t("ef64f2a53a1d"), description: t("d7630e9b3089") };
}

export default async function TermsPage() {
  const tStatic = await getStaticUiTranslations("static");
  const locale = await getLocale();
  return (
    <LegalPageLayout
      title={tStatic("0c8a9a95e21a")}
      description={tStatic("50adc81755b6")}
      sections={localizeLegalSections(termsSections, locale)}
    />
  );
}
