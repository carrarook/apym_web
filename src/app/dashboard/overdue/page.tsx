"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardQuickEntryButton,
  DashboardQuickEntryPanel,
} from "@/components/dashboard/dashboard-quick-entry";
import useSWR, { mutate as globalMutate } from "swr";
import { triggerPaymentUpdate } from "@/lib/sidebar-events";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
};

interface OverdueMember {
  memberId: string;
  name: string;
  phone: string;
  lastPaymentDate: string | null;
  membershipEndDate: string;
  daysSinceExpiry: number;
  amount: number;
  planName: string;
}

interface OverdueData {
  overdueMembers: OverdueMember[];
  totalOverdue: number;
}

export default function OverduePage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<OverdueData>("/api/overdue/list", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  const handleRefresh = async () => {
    await mutate();
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground"><LocalizedText id="b69bd0635cda" leading={""} trailing={""} /></h1>
          <p className="text-sm text-muted-foreground mt-1">
            <LocalizedText id="b97053d8815b" leading={""} trailing={"\n          "} /></p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground"><LocalizedText id="b17dad713590" leading={""} trailing={""} /></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate urgency counts
  const urgencyCounts = data.overdueMembers.reduce(
    (acc, member) => {
      const urgency = getUrgencyLevel(member.daysSinceExpiry);
      acc[urgency.color]++;
      return acc;
    },
    { yellow: 0, orange: 0, red: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground"><LocalizedText id="b69bd0635cda" leading={""} trailing={""} /></h1>
            <div className="flex items-center gap-2">
              {urgencyCounts.red > 0 && (
                <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 font-semibold">
                  {urgencyCounts.red}
                </Badge>
              )}
              {urgencyCounts.orange > 0 && (
                <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 font-semibold">
                  {urgencyCounts.orange}
                </Badge>
              )}
              {urgencyCounts.yellow > 0 && (
                <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-semibold">
                  {urgencyCounts.yellow}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data.totalOverdue} <LocalizedText id="6467baa3b187" leading={""} trailing={""} />{data.totalOverdue !== 1 ? "s" : ""} <LocalizedText id="27d80a6a84d3" leading={""} trailing={"\n          "} /></p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardQuickEntryButton
            open={showQuickEntry}
            onOpenChange={setShowQuickEntry}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <LocalizedText id="56e3badc4e6c" leading={""} trailing={"\n          "} /></Button>
        </div>
      </div>

      <DashboardQuickEntryPanel
        open={showQuickEntry}
        onUnauthorized={() => router.replace("/login?callbackUrl=/dashboard/overdue")}
        onSuccess={async () => {
          await mutate();
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/members"));
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/payments"));
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/renewals"));
          triggerPaymentUpdate(); // Update sidebar counts
        }}
      />

      {/* No overdue members */}
      {data.overdueMembers.length === 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground"><LocalizedText id="2e777ac0fd22" leading={""} trailing={""} /></h3>
                <p className="text-sm text-muted-foreground mt-1"><LocalizedText id="f326e5fac307" leading={""} trailing={""} /></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Members List */}
      {data.overdueMembers.length > 0 && (
        <Card className="p-0">
          {/* Mobile: Card layout */}
          <div className="md:hidden divide-y divide-border">
            {data.overdueMembers.map((member) => (
              <OverdueMemberCard key={member.memberId} member={member} />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="b37456c4530b" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="ae2f98a099fe" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="a1b308ec704a" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="3f5eea2477f8" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="43dc8532f7e5" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    <LocalizedText id="c3cd636a585b" leading={""} trailing={"\n                  "} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.overdueMembers.map((member) => (
                  <OverdueMemberRow key={member.memberId} member={member} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// Mobile Card Component
function OverdueMemberCard({ member }: { member: OverdueMember }) {
  const urgency = getUrgencyLevel(member.daysSinceExpiry);
  const borderColor = {
    yellow: "border-l-yellow-500",
    orange: "border-l-orange-500",
    red: "border-l-red-500",
  }[urgency.color];

  const badgeClass = {
    yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    orange: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
  }[urgency.color];

  return (
    <Link
      href={`/dashboard/members/${member.memberId}`}
      className={`block p-4 border-l-4 ${borderColor} hover:bg-muted/50 transition-colors active:bg-muted`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium truncate">{member.name}</span>
            <Badge className={badgeClass}>
              {member.daysSinceExpiry}<LocalizedText id="ead5ff11db31" leading={""} trailing={"\n            "} /></Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {member.phone} · {member.planName} · ₹{member.amount.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <LocalizedText id="7513f9647738" leading={""} trailing={" "} />{formatDate(member.membershipEndDate)}
          </div>
        </div>
        <span className="text-primary font-semibold text-sm shrink-0"><LocalizedText id="cf3dbdab782e" leading={""} trailing={""} /></span>
      </div>
    </Link>
  );
}

// Desktop Table Row Component
function OverdueMemberRow({ member }: { member: OverdueMember }) {
  const urgency = getUrgencyLevel(member.daysSinceExpiry);
  const rowBg = {
    yellow: "bg-yellow-500/5 hover:bg-yellow-500/10",
    orange: "bg-orange-500/5 hover:bg-orange-500/10",
    red: "bg-red-500/5 hover:bg-red-500/10",
  }[urgency.color];

  const badgeClass = {
    yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    orange: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
  }[urgency.color];

  return (
    <tr className={`${rowBg} transition-colors`}>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm font-medium">{member.name}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm">{member.phone}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm">{member.planName}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm text-muted-foreground">
          {formatDate(member.membershipEndDate)}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <Badge className={badgeClass}>
          {member.daysSinceExpiry}d
        </Badge>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold">
          ₹{member.amount.toLocaleString('en-IN')}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right">
        <Link href={`/dashboard/members/${member.memberId}`}>
          <Button variant="ghost" size="sm">
            <LocalizedText id="69bd4ef9fbd0" leading={""} trailing={"\n          "} /></Button>
        </Link>
      </td>
    </tr>
  );
}

// Helper function for urgency level
function getUrgencyLevel(days: number) {
  if (days <= 7) return { level: "low", color: "yellow" as const };
  if (days <= 14) return { level: "medium", color: "orange" as const };
  return { level: "high", color: "red" as const };
}
