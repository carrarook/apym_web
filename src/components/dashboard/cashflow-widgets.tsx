"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch cashflow");
    return r.json();
  });

interface CashflowSummary {
  period: { startDate: string; endDate: string };
  collected: number;
  expenses: number;
  salaries: number;
  net: number;
  outstanding: number;
}

export function CashflowWidgets({ compact = false }: { compact?: boolean }) {
  const tStatic = useStaticUiTranslations("static");
  const { data, isLoading, error } = useSWR<CashflowSummary>(
    "/api/analytics/cashflow",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5"}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) return null;

  const items = compact
    ? [
        { label: tStatic("621eacdd8c15"), value: data.net, icon: Wallet, color: data.net >= 0 ? "text-emerald-600" : "text-red-600" },
        { label: tStatic("f8ee57ec8645"), value: data.outstanding, icon: AlertCircle, color: "text-orange-600" },
      ]
    : [
        { label: tStatic("5b0f7590d06f"), value: data.collected, icon: TrendingUp, color: "text-emerald-600" },
        { label: tStatic("8d437dbf95ab"), value: data.expenses, icon: TrendingDown, color: "text-red-600" },
        { label: tStatic("64f04cc76185"), value: data.salaries, icon: TrendingDown, color: "text-rose-600" },
        { label: tStatic("9bb81c2eccbe"), value: data.net, icon: Wallet, color: data.net >= 0 ? "text-emerald-600" : "text-red-600" },
        { label: tStatic("f8ee57ec8645"), value: data.outstanding, icon: AlertCircle, color: "text-orange-600" },
      ];

  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5"}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
                <Icon className={`h-8 w-8 opacity-60 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CashflowSection() {
  const { data, isLoading, error } = useSWR<CashflowSummary>(
    "/api/analytics/cashflow",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground text-sm"><LocalizedText id="7f5d06ff573c" leading={""} trailing={""} /></CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6 text-sm text-red-600"><LocalizedText id="8701842ec92a" leading={""} trailing={""} /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold"><LocalizedText id="a252716d9256" leading={""} trailing={""} /></h3>
          <p className="text-xs text-muted-foreground">
            {data.period.startDate} — {data.period.endDate}
          </p>
        </div>
        <CashflowWidgets />
      </CardContent>
    </Card>
  );
}
