"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Search, RefreshCw, AlertCircle, Users, TrendingDown } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { MemberCardSkeleton, MemberTableSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { triggerMemberUpdate } from "@/lib/sidebar-events";

import { formatDate, formatCurrency, getDaysUntil } from "@/lib/utils";

// Use Next.js API routes (which use NextAuth)
const API_URL = '/api';

// Fetcher - bypass cache so new admissions from Payments show immediately
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch');
  }
  
  return data;
};

interface Member {
  id: string;
  name: string;
  phone: string;
  status: string;
  joinDate: string;
  Membership: Array<{
    id: string;
    endDate: string;
    amount: string;
    Plan: {
      name: string;
    };
  }>;
}

export default function MembersPage() {
  const tStatic = useStaticUiTranslations("static");
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [sortBy, setSortBy] = useState("joinDate_desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Reset to page 1 when search, filter, or sort changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, expiryFilter, sortBy]);

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (statusFilter) params.append("status", statusFilter);
  if (expiryFilter) params.append("expiryFilter", expiryFilter);
  if (sortBy) params.append("sortBy", sortBy);
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  
  // Use backend API
  const membersUrl = `${API_URL}/members?${params}`;

  const { data: readinessData } = useSWR<{
    highChurn: { memberId: string; memberName: string; churnRisk: number; riskLevel: string }[];
    calibration: { sampleSize: number; recoveryRate: number };
  }>("/api/analytics/member-readiness?limit=8", fetcher, {
    revalidateOnFocus: false,
  });

  const { data, isLoading, error, mutate: fetchMembers } = useSWR(membersUrl, fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnMount: true, // Always refetch when page mounts (e.g. after new admission on Payments)
    dedupingInterval: 2000, // Shorter dedupe so new members show sooner
    keepPreviousData: true, // Keep showing old data while fetching new
  });

  useEffect(() => {
    if (data) {
      if (data.success) {
        // Backend API format: { success: true, data: [...], pagination: {...} }
        setMembers(data.data || []);
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            totalPages: data.pagination.pages,
          });
        }
      } else {
        // Old format fallback
        setMembers(data.members || data);
        if (data.pagination) setPagination(data.pagination);
      }
    }
  }, [data]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      ACTIVE: "default" as const,
      EXPIRED: "destructive" as const,
    };
    return variants[status as keyof typeof variants] || "default";
  };

  const getExpiryStatus = (endDate: string) => {
    const days = getDaysUntil(endDate);
    if (days < 0) return { text: "Expired", color: "text-red-600 dark:text-red-400" };
    if (days === 0) return { text: "Today", color: "text-amber-600 dark:text-amber-400" };
    if (days <= 7) return { text: `${days}d left`, color: "text-amber-600 dark:text-amber-400" };
    return { text: formatDate(endDate), color: "text-muted-foreground" };
  };

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardPageHeader
          title={tStatic("1cb449c11266")}
          description={tStatic("e968dd3246b1")}
        />
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2"><LocalizedText id="210fd91922fd" leading={""} trailing={""} /></h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-6">
            {error?.message || tStatic("4a11713ad2f0")}
          </p>
          <Button
            onClick={() => fetchMembers()}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
          >
            <RefreshCw className="h-5 w-5" />
            <LocalizedText id="9f5cd8a2e880" leading={""} trailing={"\n          "} /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("1cb449c11266")}
        description={tStatic("a5089838d064")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => fetchMembers()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline"><LocalizedText id="56e3badc4e6c" leading={""} trailing={""} /></span>
            </Button>
            <Button asChild>
              <Link href="/dashboard/members/new">
                <Plus className="h-4 w-4" />
                <LocalizedText id="fbe4f901cb1d" leading={""} trailing={"\n              "} /></Link>
            </Button>
          </>
        }
      />

      {readinessData && readinessData.highChurn.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {readinessData.highChurn.length} <LocalizedText id="6467baa3b187" leading={""} trailing={"\n                  "} />{readinessData.highChurn.length === 1 ? "" : "s"} <LocalizedText id="d6af9e1ecb88" leading={""} trailing={"\n                "} /></p>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {readinessData.highChurn.slice(0, 5).map((m) => (
                    <li key={m.memberId}>
                      <Link
                        href={`/dashboard/members/${m.memberId}`}
                        className="text-foreground hover:underline font-medium"
                      >
                        {m.memberName}
                      </Link>
                      {" — "}
                      <LocalizedText id="1aa51c759bdf" leading={""} trailing={" "} />{m.churnRisk}/100 ({m.riskLevel.replace("_", " ")})
                    </li>
                  ))}
                </ul>
                <Button variant="link" className="h-auto p-0 mt-2 text-xs" asChild>
                  <Link href="/dashboard/renewals"><LocalizedText id="4d6f640c1a74" leading={""} trailing={""} /></Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={tStatic("b45c697c3429")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <SelectNative
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background flex-1 min-w-[120px]"
              >
                <option value=""><LocalizedText id="6b308de777df" leading={""} trailing={""} /></option>
                <option value="ACTIVE"><LocalizedText id="a733b809d2f1" leading={""} trailing={""} /></option>
                <option value="EXPIRED"><LocalizedText id="a689a999a5e6" leading={""} trailing={""} /></option>
              </SelectNative>
              
              <SelectNative
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                className="h-10 px-3 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background flex-1 min-w-[140px]"
                title={tStatic("0258d50ca635")}
              >
                <option value=""><LocalizedText id="129ec496da1d" leading={""} trailing={""} /></option>
                <optgroup label={tStatic("379c52e0c9d3")}>
                  <option value="expired_7"><LocalizedText id="a7b88923c8e2" leading={""} trailing={""} /></option>
                  <option value="expired_30"><LocalizedText id="7f26133bbc64" leading={""} trailing={""} /></option>
                </optgroup>
                <optgroup label={tStatic("fbae5e82b2f0")}>
                  <option value="expires_7"><LocalizedText id="010b84f24c86" leading={""} trailing={""} /></option>
                  <option value="expires_30"><LocalizedText id="41f81071d9c2" leading={""} trailing={""} /></option>
                </optgroup>
              </SelectNative>
              
              <SelectNative
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background flex-1 min-w-[130px]"
              >
                <option value="joinDate_desc"><LocalizedText id="f5ec7772ca9b" leading={""} trailing={""} /></option>
                <option value="joinDate_asc"><LocalizedText id="6a99c65c33fe" leading={""} trailing={""} /></option>
                <option value="name_asc"><LocalizedText id="5d3eb2787034" leading={""} trailing={""} /></option>
                <option value="name_desc"><LocalizedText id="080ec6fcc0b2" leading={""} trailing={""} /></option>
              </SelectNative>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table / Cards */}
      <Card className="p-0">
        {isLoading ? (
          <>
            {/* Desktop Skeleton */}
            <div className="hidden sm:block">
              <MemberTableSkeleton />
            </div>
            {/* Mobile Skeleton */}
            <div className="block sm:hidden p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <MemberCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-medium">
            <LocalizedText id="c1a6a43662df" leading={""} trailing={"\n          "} /></div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden divide-y divide-border">
              {members.map((member) => {
                const currentMembership = member.Membership?.[0];
                const expiryStatus = currentMembership
                  ? getExpiryStatus(currentMembership.endDate)
                  : null;
                return (
                  <Link
                    key={member.id}
                    href={`/dashboard/members/${member.id}`}
                    className="block p-4 hover:bg-muted/50 transition-colors active:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {member.name}
                          </span>
                          <Badge variant="secondary" className="font-mono shrink-0">
                            {member.id}
                          </Badge>
                          <Badge variant={getStatusVariant(member.status)} className="shrink-0">
                            {member.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {member.phone}
                          {currentMembership && (
                            <span className="ml-2">
                              · {currentMembership.Plan.name} · {expiryStatus?.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-primary font-semibold text-sm shrink-0"><LocalizedText id="cf3dbdab782e" leading={""} trailing={""} /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="7a88b2371d9a" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="b37456c4530b" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="440a9f2ca18e" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="ba8f571e0f93" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="bae7d5be7082" leading={""} trailing={"\n                    "} /></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                      <LocalizedText id="c3cd636a585b" leading={""} trailing={"\n                    "} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => {
                    const currentMembership = member.Membership?.[0];
                    const expiryStatus = currentMembership
                      ? getExpiryStatus(currentMembership.endDate)
                      : null;

                    return (
                      <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium">
                              {member.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <LocalizedText id="43a1c6266f88" leading={""} trailing={" "} />{formatDate(member.joinDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="font-mono">
                            {member.id}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {member.phone}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {currentMembership ? (
                            <div>
                              <div className="text-sm">
                                {currentMembership.Plan.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(currentMembership.amount)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              <LocalizedText id="42a74cf4d58b" leading={""} trailing={"\n                            "} /></span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {expiryStatus && (
                            <span className={`text-sm font-medium ${expiryStatus.color}`}>
                              {expiryStatus.text}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(member.status)}>
                            {member.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/dashboard/members/${member.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            <LocalizedText id="69bd4ef9fbd0" leading={""} trailing={"\n                          "} /></Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && pagination.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
