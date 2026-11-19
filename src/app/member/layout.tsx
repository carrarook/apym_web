import { LocalizedText } from "@/components/i18n/localized-text";
import Link from "next/link";
import { getTranslations, getTranslations as getStaticUiTranslations } from "next-intl/server";

export async function generateMetadata() {
  const [t, meta] = await Promise.all([getStaticUiTranslations("static"), getTranslations("metadata")]);
  return { title: `${meta("memberPortal")} | Fitness360`, description: t("841f7cd20f0c") };
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Link href="/member" className="font-semibold">
                <LocalizedText id="8d537d53b2ed" leading={""} trailing={"\n              "} /></Link>
              <Link href="/member/supplements" className="text-sm text-muted-foreground hover:text-foreground">
                <LocalizedText id="7c63edf9a185" leading={""} trailing={"\n              "} /></Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      </div>
  );
}
