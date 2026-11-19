import { LocalizedText } from "@/components/i18n/localized-text";
import Link from "next/link";
import { APP_NAME, MARKETING_SITE_URL, MARKETING_SITE_LABEL } from "@/lib/site-config";
import type { LegalSection } from "@/lib/legal/content";
import { getLocale } from "next-intl/server";

type LegalPageLayoutProps = {
  title: string;
  description: string;
  sections: LegalSection[];
};

export async function LegalPageLayout({ title, description, sections }: LegalPageLayoutProps) {
  const locale = await getLocale();
  const updatedDate = new Date("2026-05-19T12:00:00Z").toLocaleDateString(locale, {
    day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <a
            href={MARKETING_SITE_URL}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            ← {MARKETING_SITE_LABEL}
          </a>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              <LocalizedText id="cf01481f626d" leading={""} trailing={"\n            "} /></Link>
            <Link href="/terms" className="hover:text-foreground">
              <LocalizedText id="a55a275aa676" leading={""} trailing={"\n            "} /></Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <p className="mt-1 text-xs text-muted-foreground"><LocalizedText id="f52767eee809" leading={""} trailing={" "} />{updatedDate}</p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.paragraphs.map((p, i) => (
                  <p key={`${section.id}-p-${i}`}>{p}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-1">
                    {section.bullets.map((b, i) => (
                      <li key={`${section.id}-b-${i}`}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 text-xs text-muted-foreground">
          {APP_NAME} <LocalizedText id="37f1f400c3ab" leading={""} trailing={"\n        "} /></div>
      </footer>
    </div>
  );
}
