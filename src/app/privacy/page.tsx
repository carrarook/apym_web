import { getTranslations as getStaticUiTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { privacySections } from "@/lib/legal/content";
import { localizeLegalSections } from "@/lib/legal/translations";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getStaticUiTranslations("static");
  return { title: `${t("9db108ba6b7f")} | Fitness360`, description: t("546aaf145b89") };
}

export default async function PrivacyPage() {
  const tStatic = await getStaticUiTranslations("static");
  const locale = await getLocale();
  return (
    <LegalPageLayout
      title={tStatic("9db108ba6b7f")}
      description={tStatic("546aaf145b89")}
      sections={localizeLegalSections(privacySections, locale)}
    />
  );
}
