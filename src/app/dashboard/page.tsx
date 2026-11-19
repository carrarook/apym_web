import { getTranslations as getStaticUiTranslations } from "next-intl/server";
import { LocalizedText } from "@/components/i18n/localized-text";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import { MemberStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { GYM_COOKIE_NAME } from "@/lib/gym-constants";
import { resolveGymIdForUser } from "@/lib/gym-scope";
import { Users, TrendingUp, Calendar, AlertCircle, UserX, DollarSign, RefreshCw } from "lucide-react";
import { CollectionDashboard } from "@/components/dashboard/collection-dashboard";
import { CashflowWidgets } from "@/components/dashboard/cashflow-widgets";
import { LeadsFollowUpPanel } from "@/components/leads/LeadsFollowUpPanel";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RefreshableRupee } from "@/components/dashboard/refreshable-rupee";
import { StatCard } from "@/components/dashboard/stat-card";
import { RefreshButton } from "@/components/ui/refresh-button";
import { revalidateDashboard } from "@/app/actions";
import { excludeTestUsers } from "@/lib/test-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countActiveMembers, countExpiredMembers } from "@/lib/queries/member-status";

async function getDashboardStatsUncached(gymId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const memberScope = { gymId, ...excludeTestUsers };

  // Total members (all statuses, excluding test users)
  const totalMembers = await prisma.member.count({
    where: memberScope,
  });

  // Active members - those with VALID memberships (endDate >= today)
  // BUSINESS RULE: Status is derived from membership validity, not status field
  const activeMembers = await countActiveMembers(prisma, memberScope);

  // Today's collections
  const todayPayments = await prisma.payment.aggregate({
    where: {
      gymId,
      receivedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Expiring this week (excluding test users)
  const expiringThisWeek = await prisma.membership.count({
    where: {
      gymId,
      endDate: {
        gte: today,
        lt: sevenDaysFromNow,
      },
      Member: {
        status: MemberStatus.ACTIVE,
        ...memberScope,
      },
    },
  });

  // Today's renewals (excluding test users)
  const todayRenewals = await prisma.membership.findMany({
    where: {
      gymId,
      endDate: {
        gte: today,
        lt: tomorrow,
      },
      Member: {
        status: MemberStatus.ACTIVE,
        ...memberScope,
      },
    },
    include: {
      Member: true,
      Plan: true,
    },
    orderBy: {
      Member: {
        name: 'asc',
      },
    },
  });

  // Recent payments
  const recentPayments = await prisma.payment.findMany({
    where: { gymId },
    take: 5,
    orderBy: {
      receivedAt: 'desc',
    },
    include: {
      Member: true,
      User: true,
    },
  });

  // Payment statistics
  const paymentStats = await prisma.payment.aggregate({
    where: { gymId },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    _avg: {
      amount: true,
    },
  });

  // Get status breakdown
  const statusBreakdown = await prisma.payment.groupBy({
    where: { gymId },
    by: ["status"],
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  // Get method breakdown
  const methodBreakdown = await prisma.payment.groupBy({
    where: { gymId },
    by: ["method"],
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  // Get total collection by year (only COMPLETED payments)
  const allCompletedPayments = await prisma.payment.findMany({
    where: {
      gymId,
      status: PaymentStatus.COMPLETED,
    },
    select: {
      amount: true,
      receivedAt: true,
    },
  });

  // Group by year
  const collectionByYear: Record<string, { total: number; count: number }> = {};
  allCompletedPayments.forEach((payment) => {
    const year = new Date(payment.receivedAt).getFullYear().toString();
    if (!collectionByYear[year]) {
      collectionByYear[year] = { total: 0, count: 0 };
    }
    collectionByYear[year].total += Number(payment.amount);
    collectionByYear[year].count += 1;
  });

  // Get total collection from 2023 to today (only COMPLETED payments)
  const startOf2023 = new Date("2023-01-01T00:00:00.000Z");
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const totalFrom2023 = await prisma.payment.aggregate({
    where: {
      gymId,
      status: PaymentStatus.COMPLETED,
      receivedAt: {
        gte: startOf2023,
        lte: todayEnd,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    totalMembers,
    activeMembers,
    todayCollection: todayPayments._sum.amount || 0,
    expiringThisWeek,
    todayRenewals,
    recentPayments,
    paymentStats: {
      total: paymentStats._sum.amount || 0,
      count: paymentStats._count.id || 0,
      average: paymentStats._avg.amount || 0,
      statusBreakdown,
      methodBreakdown,
      collectionByYear,
      totalFrom2023: {
        total: totalFrom2023._sum.amount || 0,
        count: totalFrom2023._count.id || 0,
      },
    },
  };
}

export default async function DashboardPage() {
  const tStatic = await getStaticUiTranslations("static");
  const session = await auth();
  const cookieStore = await cookies();
  const gymId = session
    ? await resolveGymIdForUser(
        session.user.id,
        cookieStore.get(GYM_COOKIE_NAME)?.value ?? null
      )
    : null;

  if (!gymId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <LocalizedText id="0268269772f4" leading={""} trailing={"\n        "} /></p>
      </div>
    );
  }

  const getDashboardStats = unstable_cache(
    () => getDashboardStatsUncached(gymId),
    ["dashboard-stats", gymId],
    { revalidate: 60, tags: ["dashboard", `dashboard-gym-${gymId}`] }
  );

  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Light: defined “canvas” so metrics don’t float on blank white; dark: flat (tokens handle depth) */}
      <div className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-md ring-1 ring-border md:p-6 dark:rounded-none dark:border-0 dark:bg-transparent dark:p-0 dark:shadow-none dark:ring-0">
      <DashboardPageHeader
        title={tStatic("d87f47b47e4d")}
        description={tStatic("70ed70744505")}
        actions={<RefreshButton onRefresh={revalidateDashboard} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild className="shadow-sm">
          <Link href="/dashboard/payments">
            <DollarSign className="h-4 w-4" />
            <LocalizedText id="03fefcde8ed7" leading={""} trailing={"\n          "} /></Link>
        </Button>
        <Button variant="outline" asChild className="bg-background shadow-sm">
          <Link href="/dashboard/members/new">
            <Users className="h-4 w-4" />
            <LocalizedText id="2182c5f2d2c0" leading={""} trailing={"\n          "} /></Link>
        </Button>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title={tStatic("597c15324d4f")}
          value={stats.totalMembers.toString()}
          icon={Users}
          variant="default"
        />
        <StatCard
          title={tStatic("3d546563d590")}
          value={stats.activeMembers.toString()}
          icon={Users}
          variant="success"
        />
        <StatCard
          title={tStatic("a9a9e5ba3e46")}
          value={Number(stats.todayCollection) === 0 ? "None yet today" : formatCurrency(Number(stats.todayCollection))}
          icon={TrendingUp}
          variant={Number(stats.todayCollection) > 0 ? "success" : "default"}
        />
        <StatCard
          title={tStatic("50b61e0c8341")}
          value={stats.expiringThisWeek.toString()}
          icon={Calendar}
          variant={stats.expiringThisWeek > 10 ? "warning" : "default"}
        />
      </div>
      </div>

      <CashflowWidgets compact />

      {/* Payment Statistics */}
      <div className="space-y-6">
        {/* Total Collection */}
        {stats.paymentStats?.totalFrom2023 && (
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium opacity-90"><LocalizedText id="b1c6c05b949d" leading={""} trailing={""} /></p>
                  <p className="text-4xl font-bold tracking-tight">
                    {formatCurrency(Number(stats.paymentStats.totalFrom2023.total))}
                  </p>
                  <p className="text-sm opacity-90">
                    {stats.paymentStats.totalFrom2023.count.toLocaleString('en-IN')} <LocalizedText id="40c477020282" leading={""} trailing={"\n                  "} /></p>
                </div>
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <RefreshableRupee />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground"><LocalizedText id="cfb0f8978d7c" leading={""} trailing={""} /></p>
                  <p className="text-2xl font-bold">{formatCurrency(Number(stats.paymentStats.total))}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground"><LocalizedText id="53b493dfe710" leading={""} trailing={""} /></p>
                  <p className="text-2xl font-bold">{stats.paymentStats.count.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground"><LocalizedText id="9d02fb79637a" leading={""} trailing={""} /></p>
                  <p className="text-2xl font-bold">{formatCurrency(Number(stats.paymentStats.average))}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground"><LocalizedText id="1798b3ba42ee" leading={""} trailing={""} /></p>
                  <p className="text-2xl font-bold">{(stats.paymentStats.statusBreakdown.find((s) => s.status === "COMPLETED")?._count.id || 0).toString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Collection by Year */}
        {stats.paymentStats?.collectionByYear && Object.keys(stats.paymentStats.collectionByYear).length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold"><LocalizedText id="33a10bcadd52" leading={""} trailing={""} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(stats.paymentStats.collectionByYear)
                  .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
                  .map(([year, data]) => (
                    <div
                      key={year}
                      className="rounded-xl border-2 bg-gradient-to-br from-card to-muted/20 p-4 hover:shadow-md hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-primary">{year}</span>
                        <Badge variant="secondary" className="font-semibold">{data.count}</Badge>
                      </div>
                      <p className="text-2xl font-bold tracking-tight">
                        {formatCurrency(data.total)}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status & Method Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold"><LocalizedText id="4a26dca78564" leading={""} trailing={""} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.paymentStats.statusBreakdown.map((item) => {
                  const getStatusVariant = (status: PaymentStatus): "default" | "secondary" | "destructive" | "outline" => {
                    const variants = {
                      COMPLETED: "default" as const,
                      PENDING: "secondary" as const,
                      FAILED: "destructive" as const,
                      REFUNDED: "outline" as const,
                    };
                    return variants[status] || "default";
                  };
                  return (
                    <div key={item.status} className="flex items-center justify-between p-4 rounded-xl border-2 bg-gradient-to-r from-card to-muted/10 hover:shadow-md hover:border-primary/30 transition-all">
                      <Badge variant={getStatusVariant(item.status)} className="text-xs font-semibold px-3 py-1">
                        {item.status}
                      </Badge>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground"><LocalizedText id="66e12969c225" leading={""} trailing={""} /></div>
                          <div className="text-sm font-bold">{item._count.id}</div>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <div className="text-xs text-muted-foreground"><LocalizedText id="43dc8532f7e5" leading={""} trailing={""} /></div>
                          <div className="text-sm font-bold">{formatCurrency(Number(item._sum.amount || 0))}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold"><LocalizedText id="af0f02997a21" leading={""} trailing={""} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.paymentStats.methodBreakdown.map((item) => (
                  <div key={item.method} className="flex items-center justify-between p-4 rounded-xl border-2 bg-gradient-to-r from-card to-muted/10 hover:shadow-md hover:border-primary/30 transition-all">
                    <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                      {item.method}
                    </Badge>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground"><LocalizedText id="66e12969c225" leading={""} trailing={""} /></div>
                        <div className="text-sm font-bold">{item._count.id}</div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <div className="text-xs text-muted-foreground"><LocalizedText id="43dc8532f7e5" leading={""} trailing={""} /></div>
                        <div className="text-sm font-bold">{formatCurrency(Number(item._sum.amount || 0))}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <LeadsFollowUpPanel compact />
      {/* Collection Dashboard */}
      <CollectionDashboard />

      {/* Today's Renewals */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold"><LocalizedText id="c60c4ee0c83f" leading={""} trailing={""} /></CardTitle>
            <Badge variant="secondary" className="text-sm font-semibold">{stats.todayRenewals.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {stats.todayRenewals.length > 0 ? (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                      <LocalizedText id="77064d526523" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <LocalizedText id="ae2f98a099fe" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <LocalizedText id="ba8f571e0f93" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <LocalizedText id="97c89a4d6630" leading={""} trailing={"\n                    "} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {stats.todayRenewals.map((membership) => (
                    <tr key={membership.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold">
                          {membership.Member.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-muted-foreground">
                          {membership.Member.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          {membership.Plan.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          {formatDate(membership.endDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/members/${membership.memberId}`}
                          className="text-primary hover:underline font-semibold"
                        >
                          <LocalizedText id="69bd4ef9fbd0" leading={""} trailing={"\n                        "} /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                <LocalizedText id="2a5730aa9700" leading={""} trailing={"\n              "} /></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle><LocalizedText id="3abf211c938a" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {stats.recentPayments.length > 0 ? (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="43dc8532f7e5" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="88306943fea7" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="eb9a4bc1c0c1" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">
                      <LocalizedText id="f84f73c618d9" leading={""} trailing={"\n                    "} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold">
                          {payment.Member.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold">
                          {formatCurrency(Number(payment.amount))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="secondary">
                          {payment.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(payment.receivedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell">
                        {payment.User.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                <LocalizedText id="a556690f2b1b" leading={""} trailing={"\n              "} /></div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
