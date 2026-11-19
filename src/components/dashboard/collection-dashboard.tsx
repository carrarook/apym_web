"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxInput } from "@/components/ui/checkbox-input";

async function fetcher(url: string) {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Request failed (${r.status})`
    );
  }
  if (
    !data ||
    typeof data !== "object" ||
    !data.comparisons ||
    typeof data.comparisons.monthOverMonth !== "object"
  ) {
    throw new Error("Collection data is incomplete. Try again.");
  }
  return data as CollectionStats;
}

interface CollectionStats {
  currentMonth: {
    total: number;
    count: number;
    upToToday: {
      total: number;
      count: number;
    };
  };
  lastMonth: {
    total: number;
    count: number;
    upToSameDay: {
      total: number;
      count: number;
    };
  };
  lastYearSameMonth: {
    total: number;
    count: number;
  };
  today: {
    total: number;
    count: number;
  };
  lastMonthSameDay: {
    total: number;
    count: number;
  };
  comparisons: {
    monthOverMonth: {
      current: number;
      last: number;
      difference: number;
      percentageChange: number;
    };
    yearOverYear: {
      current: number;
      last: number;
      difference: number;
      percentageChange: number;
    };
    dayComparison: {
      today: number;
      lastMonthSameDay: number;
      difference: number;
      percentageChange: number;
    };
  };
  dayByDay: Array<{
    day: number;
    currentMonth: {
      amount: number;
      count: number;
    };
    lastMonth: {
      amount: number;
      count: number;
    };
    difference: number;
    percentageChange: number;
  }>;
}

export function CollectionDashboard() {
  const tStatic = useStaticUiTranslations("static");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data: stats, isLoading: loading, error, mutate: fetchStats } = useSWR<CollectionStats>(
    "/api/dashboard/collections",
    fetcher,
    { revalidateOnMount: true }
  );

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchStats(), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchStats]);

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-destructive/20 rounded-full p-4">
            <RefreshCw className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2"><LocalizedText id="f0ff579fbc22" leading={""} trailing={""} /></h3>
        <p className="text-sm text-muted-foreground mb-6">
          {error?.message || tStatic("a97b2f055501")}
        </p>
        <Button
          type="button"
          onClick={() => fetchStats()}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
        >
          <RefreshCw className="h-5 w-5" />
          <LocalizedText id="9f5cd8a2e880" leading={""} trailing={"\n        "} /></Button>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground shadow-sm">
        <LocalizedText id="159e1157d68e" leading={""} trailing={"\n      "} /></div>
    );
  }

  if (
    !stats.comparisons?.monthOverMonth ||
    !stats.comparisons?.yearOverYear ||
    !stats.comparisons?.dayComparison ||
    !Array.isArray(stats.dayByDay) ||
    !stats.currentMonth?.upToToday
  ) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          <LocalizedText id="7ef14454dbd9" leading={""} trailing={"\n        "} /></h3>
        <p className="text-sm text-muted-foreground mb-6">
          <LocalizedText id="932cac7be51f" leading={""} trailing={"\n        "} /></p>
        <Button
          type="button"
          onClick={() => fetchStats()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-5 w-5" />
          <LocalizedText id="9f5cd8a2e880" leading={""} trailing={"\n        "} /></Button>
      </div>
    );
  }

  const today = new Date();
  const currentMonthName = today.toLocaleString("default", { month: "long", year: "numeric" });
  const lastMonthName = new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const lastYearMonthName = new Date(today.getFullYear() - 1, today.getMonth(), 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground"><LocalizedText id="c66f66c936c3" leading={""} trailing={""} /></h2>
          <p className="text-sm text-muted-foreground mt-1"><LocalizedText id="1e28c195761b" leading={""} trailing={""} /></p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckboxInput
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <LocalizedText id="03883c6b08fd" leading={""} trailing={"\n          "} /></label>
          <Button
            type="button"
            onClick={() => fetchStats()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <LocalizedText id="56e3badc4e6c" leading={""} trailing={"\n          "} /></Button>
        </div>
      </div>

      {/* Main Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month over Month */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground"><LocalizedText id="f4e1ac8af899" leading={""} trailing={""} /></h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{currentMonthName} <LocalizedText id="027862e14068" leading={""} trailing={""} /></span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.monthOverMonth.current)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{lastMonthName} <LocalizedText id="87e351db3961" leading={""} trailing={""} /></span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.monthOverMonth.last)}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground"><LocalizedText id="b16f1f66543d" leading={""} trailing={""} /></span>
                <div className="flex items-center gap-1">
                  {stats.comparisons.monthOverMonth.difference >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      stats.comparisons.monthOverMonth.difference >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(stats.comparisons.monthOverMonth.difference))}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.comparisons.monthOverMonth.percentageChange >= 0 ? "+" : ""}
                {stats.comparisons.monthOverMonth.percentageChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Year over Year */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground"><LocalizedText id="81409fcbb097" leading={""} trailing={""} /></h3>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{currentMonthName} <LocalizedText id="027862e14068" leading={""} trailing={""} /></span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.yearOverYear.current)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{lastYearMonthName}</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.yearOverYear.last)}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground"><LocalizedText id="b16f1f66543d" leading={""} trailing={""} /></span>
                <div className="flex items-center gap-1">
                  {stats.comparisons.yearOverYear.difference >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      stats.comparisons.yearOverYear.difference >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(stats.comparisons.yearOverYear.difference))}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.comparisons.yearOverYear.percentageChange >= 0 ? "+" : ""}
                {stats.comparisons.yearOverYear.percentageChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Today vs Last Month Same Day */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground"><LocalizedText id="be74e8f65dfa" leading={""} trailing={""} /></h3>
            <span className="text-2xl font-bold text-green-500">₹</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground"><LocalizedText id="24345a14377f" leading={""} trailing={""} /></span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.dayComparison.today)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground"><LocalizedText id="aea8a85f350e" leading={""} trailing={""} /></span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.comparisons.dayComparison.lastMonthSameDay)}
              </span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground"><LocalizedText id="b16f1f66543d" leading={""} trailing={""} /></span>
                <div className="flex items-center gap-1">
                  {stats.comparisons.dayComparison.difference >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      stats.comparisons.dayComparison.difference >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(stats.comparisons.dayComparison.difference))}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.comparisons.dayComparison.percentageChange >= 0 ? "+" : ""}
                {stats.comparisons.dayComparison.percentageChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Current Month Total */}
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground"><LocalizedText id="3d16cbd075f0" leading={""} trailing={""} /></h3>
            <span className="text-2xl font-bold text-blue-500">₹</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.currentMonth.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1"><LocalizedText id="60eb936d5033" leading={""} trailing={""} /></div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(stats.currentMonth.upToToday.total)}
              </div>
              <div className="text-xs text-muted-foreground"><LocalizedText id="6ab64e640087" leading={""} trailing={""} />{stats.currentMonth.upToToday.count} <LocalizedText id="137c4645f14b" leading={""} trailing={""} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Day by Day Comparison */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground"><LocalizedText id="88feb780effa" leading={""} trailing={""} /></h3>
          <p className="text-sm text-muted-foreground mt-1">
            <LocalizedText id="4579ba4e1b42" leading={""} trailing={" "} />{currentMonthName} <LocalizedText id="691a77cd21a3" leading={""} trailing={" "} />{lastMonthName} <LocalizedText id="9082788dca1e" leading={""} trailing={" "} />{today.getDate()})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="987b9ced08d4" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {currentMonthName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {lastMonthName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="b16f1f66543d" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="6324174088f5" leading={""} trailing={"\n                "} /></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {stats.dayByDay.map((dayData) => (
                <tr key={dayData.day} className="hover:bg-muted">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    <LocalizedText id="987b9ced08d4" leading={""} trailing={" "} />{dayData.day}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{formatCurrency(dayData.currentMonth.amount)}</div>
                    <div className="text-xs text-muted-foreground">{dayData.currentMonth.count} <LocalizedText id="40c477020282" leading={""} trailing={""} /></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{formatCurrency(dayData.lastMonth.amount)}</div>
                    <div className="text-xs text-muted-foreground">{dayData.lastMonth.count} <LocalizedText id="40c477020282" leading={""} trailing={""} /></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-semibold flex items-center gap-1 ${
                        dayData.difference >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {dayData.difference >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatCurrency(Math.abs(dayData.difference))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        dayData.percentageChange >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {dayData.percentageChange >= 0 ? "+" : ""}
                      {dayData.percentageChange.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
