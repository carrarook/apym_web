"use client";

import { useLocale as useIntlLocale, useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
  RefreshCw,
  Filter,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AnalyticsErrorBoundary } from "@/components/analytics-error-boundary";
import { AnalyticsSkeleton } from "@/components/analytics-skeleton";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PaymentTimingInsights } from "@/components/analytics/PaymentTimingInsights";
import { CashflowSection } from "@/components/dashboard/cashflow-widgets";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

function getPresetLabel(value: string, tStatic: (id: string) => string, locale: string): string {
  const today = new Date();
  const currentMonth = today.toLocaleDateString(locale, { month: 'long' });
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1).toLocaleDateString(locale, { month: 'long' });
  const currentYear = today.getFullYear();
  
  switch (value) {
    case "thisMonth":
      return `${tStatic("0f6cc3a89ce9")} (${currentMonth})`;
    case "lastMonth":
      return `${tStatic("2538c66176d2")} (${lastMonth})`;
    case "last3Months":
      return tStatic("b8445e8524a0");
    case "last6Months":
      return tStatic("8aaa3df19e8b");
    case "thisYear":
      return `${tStatic("77528c94d9a3")} (${currentYear})`;
    case "lastYear":
      return `${tStatic("6ebbe606cccc")} (${currentYear - 1})`;
    case "custom":
      return tStatic("f130609dfc13");
    default:
      return value;
  }
}

const PRESET_RANGES = [
  { label: "thisMonth", value: "thisMonth" },
  { label: "lastMonth", value: "lastMonth" },
  { label: "last3Months", value: "last3Months" },
  { label: "last6Months", value: "last6Months" },
  { label: "thisYear", value: "thisYear" },
  { label: "lastYear", value: "lastYear" },
  { label: "custom", value: "custom" },
];

const AVAILABLE_METRICS = [
  { id: "payments", label: "Payments", icon: DollarSign, color: "emerald" },
  { id: "members", label: "Members", icon: Users, color: "blue" },
  { id: "renewals", label: "Renewals", icon: RefreshCw, color: "purple" },
  { id: "attendance", label: "Attendance", icon: Activity, color: "cyan" },
  { id: "overdue", label: "Overdue", icon: Calendar, color: "orange" },
  { id: "revenue", label: "Revenue", icon: CreditCard, color: "green" },
  { id: "churn", label: "Churn Analysis", icon: TrendingUp, color: "red" },
  { id: "delays", label: "Payment Delays", icon: Calendar, color: "amber" },
];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (preset) {
    case "thisMonth":
      // Use local date strings to avoid timezone issues
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
      };
    case "lastMonth":
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastMonthNum = month === 0 ? 12 : month;
      const lastMonthLastDay = new Date(lastMonthYear, lastMonthNum, 0);
      return {
        startDate: `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-01`,
        endDate: `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-${String(lastMonthLastDay.getDate()).padStart(2, '0')}`,
      };
    case "last3Months":
      const threeMonthsAgo = new Date(year, month - 3, 1);
      const lastDayThisMonth = new Date(year, month + 1, 0);
      return {
        startDate: `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayThisMonth.getDate()).padStart(2, '0')}`,
      };
    case "last6Months":
      const sixMonthsAgo = new Date(year, month - 6, 1);
      const lastDaySixMonths = new Date(year, month + 1, 0);
      return {
        startDate: `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDaySixMonths.getDate()).padStart(2, '0')}`,
      };
    case "thisYear":
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    case "lastYear":
      return {
        startDate: `${year - 1}-01-01`,
        endDate: `${year - 1}-12-31`,
      };
    default:
      const defaultLastDay = new Date(year, month + 1, 0);
      return {
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(defaultLastDay.getDate()).padStart(2, '0')}`,
      };
  }
}

export default function AnalyticsPage() {
  const tStatic = useStaticUiTranslations("static");
  const locale = useIntlLocale();
  const [preset, setPreset] = useState("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "payments",
    "members",
    "renewals",
    "attendance",
  ]);

  const { startDate, endDate } = preset === "custom" && customStart && customEnd
    ? { startDate: customStart, endDate: customEnd }
    : getDateRange(preset);

  const metricsParam = selectedMetrics.join(",");
  const { data, isLoading, error, mutate } = useSWR(
    `/api/analytics/summary?startDate=${startDate}&endDate=${endDate}&metrics=${metricsParam}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      errorRetryCount: 2,
    }
  );

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((m) => m !== metricId)
        : [...prev, metricId]
    );
  };

  return (
    <AnalyticsErrorBoundary>
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("26e32842c65d")}
        description={tStatic("112a5a1c9174")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            <LocalizedText id="56e3badc4e6c" leading={""} trailing={"\n          "} /></Button>
        }
      />

      <PaymentTimingInsights />

      <CashflowSection />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <LocalizedText id="754164850f38" leading={""} trailing={"\n          "} /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block"><LocalizedText id="6bb4b674b323" leading={""} trailing={""} /></label>
            <div className="flex flex-wrap gap-2">
              {PRESET_RANGES.map((range) => {
                const isSelected = preset === range.value;
                const colorClass = isSelected
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/30"
                  : "border-border/50 hover:bg-muted/50";
                return (
                  <Button
                    key={range.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setPreset(range.value)}
                    className={colorClass}
                  >
                    {getPresetLabel(range.value, tStatic, locale)}
                  </Button>
                );
              })}
            </div>
          </div>

          {preset === "custom" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block"><LocalizedText id="9d7ab1a55796" leading={""} trailing={""} /></label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block"><LocalizedText id="84b147812589" leading={""} trailing={""} /></label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block"><LocalizedText id="ddf6a1f0ce8c" leading={""} trailing={""} /></label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_METRICS.map((metric) => {
                const Icon = metric.icon;
                const isSelected = selectedMetrics.includes(metric.id);
                const colorClass = isSelected 
                  ? `bg-${metric.color}-500/20 border-${metric.color}-500/50 text-${metric.color}-700 dark:text-${metric.color}-300 hover:bg-${metric.color}-500/30`
                  : "border-border/50 hover:bg-muted/50";
                return (
                  <Button
                    key={metric.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMetric(metric.id)}
                    className={colorClass}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {tStatic(metric.label === "Payments" ? "44357ae55a21" : metric.label === "Members" ? "1cb449c11266" : metric.label === "Renewals" ? "1c2680586b08" : metric.label === "Attendance" ? "b689313fc18c" : metric.label === "Overdue" ? "07217c77199f" : metric.label === "Revenue" ? "35cf82f9d2a9" : metric.label === "Churn Analysis" ? "9f3d443d5fb7" : "9d81ac056766")}
                  </Button>
                );
              })}
            </div>
          </div>

          {data?.period && (
            <div className="text-xs text-muted-foreground">
              <LocalizedText id="255a40bc365c" leading={""} trailing={""} />{" "}
              <span className="font-medium text-foreground">
                {new Date(data.period.startDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {" "}<LocalizedText id="4374aaee247f" leading={""} trailing={""} />{" "}
              <span className="font-medium text-foreground">
                {new Date(data.period.endDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {" "}({data.period.days} <LocalizedText id="8d77a9d1d747" leading={""} trailing={"\n            "} /></div>
          )}
        </CardContent>
      </Card>

      {isLoading && <AnalyticsSkeleton />}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2"><LocalizedText id="1302237c5526" leading={""} trailing={""} /></p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">{error?.message || tStatic("e5fd9aa24c94")}</p>
            <Button onClick={() => mutate()} size="sm" className="mt-3">
              <RefreshCw className="h-3 w-3 mr-2" />
              <LocalizedText id="9f5cd8a2e880" leading={""} trailing={"\n            "} /></Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {selectedMetrics.includes(tStatic("40c477020282")) && data.payments && (
              <Card className="p-4 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium"><LocalizedText id="44357ae55a21" leading={""} trailing={""} /></p>
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(data.payments.total)}</p>
                    <p className="text-xs text-muted-foreground"><LocalizedText id="1a21e6565299" leading={""} trailing={""} /></p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                    <div>
                      <p className="text-sm font-medium">{data.payments.count}</p>
                      <p className="text-xs text-muted-foreground"><LocalizedText id="1e3281a962e6" leading={""} trailing={""} /></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(data.payments.average)}</p>
                      <p className="text-xs text-muted-foreground"><LocalizedText id="cdc93143c600" leading={""} trailing={""} /></p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedMetrics.includes(tStatic("f13eb5859f13")) && data.newMembers && (
              <Card className="p-4 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium"><LocalizedText id="32742f552d05" leading={""} trailing={""} /></p>
                    <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">{data.newMembers.count}</p>
                    <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="90cd2283e512" leading={""} trailing={""} /></p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </Card>
            )}

            {selectedMetrics.includes(tStatic("c39efd22ac50")) && data.renewals && (
              <Card className="p-4 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium"><LocalizedText id="1c2680586b08" leading={""} trailing={""} /></p>
                    <p className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">{data.renewals.count}</p>
                    <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="9accf558aba4" leading={""} trailing={""} /></p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </Card>
            )}

            {selectedMetrics.includes("attendance") && data.attendance && data.uniqueAttendees && (
              <Card className="p-4 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-cyan-500/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium"><LocalizedText id="b689313fc18c" leading={""} trailing={""} /></p>
                  <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{data.attendance.count}</p>
                    <p className="text-xs text-muted-foreground"><LocalizedText id="3279df4ee707" leading={""} trailing={""} /></p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
                    <div>
                      <p className="text-sm font-medium">{data.uniqueAttendees.count}</p>
                      <p className="text-xs text-muted-foreground"><LocalizedText id="a51d53c26305" leading={""} trailing={""} /></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {data.uniqueAttendees.count > 0 
                          ? (data.attendance.count / data.uniqueAttendees.count).toFixed(1)
                          : '0'}
                      </p>
                      <p className="text-xs text-muted-foreground"><LocalizedText id="5bf610b5aee2" leading={""} trailing={""} /></p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedMetrics.includes(tStatic("ba2fff4051e9")) && data.overdueMembers && (
              <Card className="p-4 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-700 dark:text-orange-300 font-medium"><LocalizedText id="b7befeb908af" leading={""} trailing={""} /></p>
                    <p className="text-2xl font-bold mt-1 text-orange-700 dark:text-orange-300">{data.overdueMembers.count}</p>
                    <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="2dc99504b714" leading={""} trailing={""} /></p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </Card>
            )}

            {selectedMetrics.includes("revenue") && data.revenue && (
              <Card className="p-4 border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium"><LocalizedText id="35cf82f9d2a9" leading={""} trailing={""} /></p>
                    <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-300">{formatCurrency(data.revenue.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="50618b086a9a" leading={""} trailing={""} /></p>
                  </div>
                  <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </Card>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {selectedMetrics.includes("churn") && data.churnAnalysis && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <LocalizedText id="9f3d443d5fb7" leading={""} trailing={"\n                  "} /></CardTitle>
                  <CardDescription className="text-xs"><LocalizedText id="ac9f3d7ef73c" leading={""} trailing={""} /></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-muted-foreground mb-1"><LocalizedText id="fff808bb6cac" leading={""} trailing={""} /></p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.churnAnalysis.churnedMembers}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p className="text-xs text-muted-foreground mb-1"><LocalizedText id="80e404412cf2" leading={""} trailing={""} /></p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.churnAnalysis.churnRate}%</p>
                      </div>
                    </div>
                    {data.churnAnalysis.membersList && data.churnAnalysis.membersList.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto">
                        <p className="text-xs font-semibold text-muted-foreground mb-2"><LocalizedText id="26c991227986" leading={""} trailing={""} /></p>
                        <div className="space-y-2">
                          {data.churnAnalysis.membersList.map((member: any) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                              <span className="font-medium">{member.name}</span>
                              <span className="text-muted-foreground">
                                {member.daysSinceLastPayment ? `${member.daysSinceLastPayment}d ago` : tStatic("63104bfbbc1d")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedMetrics.includes("delays") && data.delayPatterns && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <LocalizedText id="25f19fd9e984" leading={""} trailing={"\n                  "} /></CardTitle>
                  <CardDescription className="text-xs">
                    <LocalizedText id="e17b426bba08" leading={""} trailing={"\n                  "} /></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-muted-foreground mb-1"><LocalizedText id="24c480e1a6e0" leading={""} trailing={""} /></p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.delayPatterns.averageDelay} <LocalizedText id="5548ae4f34cb" leading={""} trailing={""} /></p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          <LocalizedText id="3f66052a107e" leading={""} trailing={" "} />{data.delayPatterns.totalPaymentsAnalyzed || 0} <LocalizedText id="c39efd22ac50" leading={""} trailing={"\n                        "} /></p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-muted-foreground mb-1"><LocalizedText id="727d60fd8d91" leading={""} trailing={""} /></p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {data.delayPatterns.totalPaymentsAnalyzed > 0 
                            ? Math.round((data.delayPatterns.delayDistribution.onTime / data.delayPatterns.totalPaymentsAnalyzed) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2"><LocalizedText id="ba5d4afe6273" leading={""} trailing={""} /></p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <span className="text-muted-foreground"><LocalizedText id="5a65a8600bc2" leading={""} trailing={""} /></span>
                          <span className="ml-2 font-semibold">{data.delayPatterns.delayDistribution.onTime}</span>
                        </div>
                        <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                          <span className="text-muted-foreground"><LocalizedText id="2bbf749d77f8" leading={""} trailing={""} /></span>
                          <span className="ml-2 font-semibold">{data.delayPatterns.delayDistribution.late1to3}</span>
                        </div>
                        <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                          <span className="text-muted-foreground"><LocalizedText id="9ed145c27d72" leading={""} trailing={""} /></span>
                          <span className="ml-2 font-semibold">{data.delayPatterns.delayDistribution.late4to7}</span>
                        </div>
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <span className="text-muted-foreground"><LocalizedText id="fdb6de53c649" leading={""} trailing={""} /></span>
                          <span className="ml-2 font-semibold">{data.delayPatterns.delayDistribution.late8plus}</span>
                        </div>
                      </div>
                    </div>

                    {data.delayPatterns.topPlans && data.delayPatterns.topPlans.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2"><LocalizedText id="23559cdc52bd" leading={""} trailing={""} /></p>
                        <div className="space-y-2">
                          {data.delayPatterns.topPlans.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                              <span className="font-medium">{item.plan}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{item.count} <LocalizedText id="f13eb5859f13" leading={""} trailing={""} /></span>
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.delayPatterns.mostCommonPaymentDates && data.delayPatterns.mostCommonPaymentDates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2"><LocalizedText id="545ea0262212" leading={""} trailing={""} /></p>
                        <div className="flex flex-wrap gap-2">
                          {data.delayPatterns.mostCommonPaymentDates.map((item: any) => (
                            <div key={item.date} className="px-3 py-1 rounded-full bg-primary/10 text-xs">
                              <span className="font-semibold">{item.date}<LocalizedText id="fa6af6e97d01" leading={""} trailing={""} /></span>
                              <span className="text-muted-foreground ml-1">({item.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.delayPatterns.mostCommonDaysOfWeek && data.delayPatterns.mostCommonDaysOfWeek.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2"><LocalizedText id="62f81dac99e2" leading={""} trailing={""} /></p>
                        <div className="flex flex-wrap gap-2">
                          {data.delayPatterns.mostCommonDaysOfWeek.map((item: any) => (
                            <div key={item.day} className="px-3 py-1 rounded-full bg-amber-500/10 text-xs">
                              <span className="font-semibold">{item.day}</span>
                              <span className="text-muted-foreground ml-1">({item.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {!selectedMetrics.includes(tStatic("40c477020282")) &&
            !selectedMetrics.includes(tStatic("f13eb5859f13")) &&
            !selectedMetrics.includes(tStatic("c39efd22ac50")) &&
            !selectedMetrics.includes("attendance") &&
            !selectedMetrics.includes(tStatic("ba2fff4051e9")) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-600">
                    <LocalizedText id="7b6fdc01ffbd" leading={""} trailing={"\n                  "} /></p>
                </CardContent>
              </Card>
            )}
        </>
      )}
      </div>
    </AnalyticsErrorBoundary>
  );
}
