"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data, mutate, isLoading } = useSWR("/api/admin/tasks", fetcher);
  const [syncing, setSyncing] = useState(false);

  const tasks = data?.data ?? [];

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      await mutate();
    } finally {
      setSyncing(false);
    }
  }, [mutate]);

  const resolve = async (taskId: string, action: "resolve" | "dismiss") => {
    await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, taskId }),
    });
    await mutate();
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("090ec5f560fc")}
        description="Admin inbox — late payments, data issues, and items needing resolution."
        actions={
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2"><LocalizedText id="905f63092ff2" leading={""} trailing={""} /></span>
          </Button>
        }
      />
      {isLoading ? (
        <p className="text-muted-foreground text-sm"><LocalizedText id="33ce417454bf" leading={""} trailing={""} /></p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t: { id: string; title: string; description: string; priority: string; status: string }) => (
            <Card key={t.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                </div>
                <Badge variant="outline">{t.priority}</Badge>
              </CardHeader>
              {t.status === "PENDING" && (
                <CardContent className="flex gap-2 pt-0">
                  <Button size="sm" onClick={() => resolve(t.id, "resolve")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> <LocalizedText id="ac7f958cc028" leading={""} trailing={"\n                  "} /></Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(t.id, "dismiss")}>
                    <XCircle className="h-4 w-4 mr-1" /> <LocalizedText id="70afe9eff3f2" leading={""} trailing={"\n                  "} /></Button>
                </CardContent>
              )}
            </Card>
          ))}
          {tasks.length === 0 && <p className="text-muted-foreground text-sm"><LocalizedText id="ca10b5fece21" leading={""} trailing={""} /></p>}
        </div>
      )}
    </div>
  );
}
