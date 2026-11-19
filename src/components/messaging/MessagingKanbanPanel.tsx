"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MessagingKanbanPanel() {
  const tStatic = useStaticUiTranslations("static");
  const { data, isLoading } = useSWR("/api/messaging/kanban?include=renewals,expiry,admissions", fetcher);
  const boards = data?.data ?? {};

  if (isLoading) return <p className="text-sm text-muted-foreground"><LocalizedText id="16fcabb8b322" leading={""} trailing={""} /></p>;

  const columns = [
    { key: "renewals", title: tStatic("758841c62c58") },
    { key: "expiry", title: "Expired / overdue" },
    { key: "admissions", title: tStatic("ff84c0824346") },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map(({ key, title }) => {
        const items = (boards[key] as Array<{ id: string; name: string; phone?: string | null }>) ?? [];
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/members/${m.id}`}
                  className="block text-sm rounded-md border border-border p-2 hover:bg-muted/50"
                >
                  {m.name}
                  {m.phone && <span className="text-xs text-muted-foreground block">{m.phone}</span>}
                </Link>
              ))}
              {items.length === 0 && <p className="text-xs text-muted-foreground"><LocalizedText id="3159fe421b32" leading={""} trailing={""} /></p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
