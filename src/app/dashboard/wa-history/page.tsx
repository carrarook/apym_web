"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { formatDate } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WaHistoryPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data, isLoading } = useSWR("/api/admin/wa-log?limit=200", fetcher);
  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("909e62b8898a")}
        description={tStatic("c40d8ae8c49c")}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground"><LocalizedText id="33ce417454bf" leading={""} trailing={""} /></p>
      ) : (
        <div className="space-y-2">
          {logs.map((log: {
            id: string;
            type: string;
            status: string;
            memberName: string;
            sentAt: string;
            Member?: { name: string };
          }) => (
            <Card key={log.id}>
              <CardContent className="py-3 flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="font-medium text-sm">{log.memberName ?? log.Member?.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(log.sentAt)} · {log.type}</p>
                </div>
                <Badge variant={log.status === "SENT" ? "default" : "secondary"}>{log.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground"><LocalizedText id="d48b47b890c2" leading={""} trailing={""} /></p>}
        </div>
      )}
    </div>
  );
}
