"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FutureStackCleanupPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data, mutate, isLoading } = useSWR("/api/payments/future-membership-stack-cleanup", fetcher);
  const [applying, setApplying] = useState(false);
  const rows = data?.data?.rows ?? [];

  const applyAll = async () => {
    const ids = rows.filter((r: { canDelete: boolean }) => r.canDelete).map((r: { membershipId: string }) => r.membershipId);
    if (!ids.length) return;
    setApplying(true);
    try {
      await fetch("/api/payments/future-membership-stack-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipIds: ids }),
      });
      await mutate();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("17ba91f5fd32")}
        description={tStatic("ca3873780e73")}
        actions={
          <Button size="sm" onClick={applyAll} disabled={applying || rows.length === 0}>
            {applying && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <LocalizedText id="f1f9d62069ef" leading={""} trailing={"\n          "} /></Button>
        }
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground"><LocalizedText id="36c4a06fc249" leading={""} trailing={""} /></p>
      ) : (
        <div className="space-y-2">
          {rows.map((r: { membershipId: string; memberName: string; startDate: string; endDate: string; reason: string }) => (
            <Card key={r.membershipId}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{r.memberName}</CardTitle>
                <p className="text-xs text-muted-foreground">{r.startDate} → {r.endDate} — {r.reason}</p>
              </CardHeader>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground"><LocalizedText id="b289676e0d5c" leading={""} trailing={""} /></p>}
        </div>
      )}
    </div>
  );
}
