"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import Link from "next/link";
import { Bot, Target, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RenewalsChasePanel } from "@/components/renewals/RenewalsChasePanel";
import { ApprovalsQueuePanel } from "@/components/approvals/ApprovalsQueuePanel";
import { LeadsFollowUpPanel } from "@/components/leads/LeadsFollowUpPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentProfileId } from "@/domains/agents/profiles";
import { marketingPath } from "@/lib/site-config";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AgentWorkspacePage() {
  const tStatic = useStaticUiTranslations("static");
  const { data: profilesData } = useSWR("/api/agents/profiles", fetcher);
  const { data: factsData } = useSWR("/api/intelligence/gym-facts", fetcher);

  const profiles = profilesData?.data?.profiles ?? profilesData?.profiles ?? [];
  const facts = factsData?.data?.facts ?? factsData?.facts ?? [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("5a67d8ce27b2")}
        description={tStatic("a82f52a80655")}
      />

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <LocalizedText id="b72f59f29474" leading={""} trailing={"\n          "} /></CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {profiles.map((p: {
            id: AgentProfileId;
            name: string;
            description: string;
            goalHint: string;
            tools: string[];
          }) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-2">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <p className="text-xs text-muted-foreground">{p.goalHint}</p>
              <div className="flex flex-wrap gap-1">
                {p.tools.slice(0, 4).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={marketingPath("/developers")}><LocalizedText id="a729aa6b098a" leading={""} trailing={""} /></a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <LocalizedText id="fbf621a07e96" leading={""} trailing={"\n            "} /></CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 max-h-48 overflow-y-auto">
            {facts.length === 0 ? (
              <p className="text-muted-foreground">
                <LocalizedText id="63ad1a40e104" leading={""} trailing={" "} /><code><LocalizedText id="36dbd7434e0f" leading={""} trailing={""} /></code>.
              </p>
            ) : (
              facts.map((f: { factKey: string; factType: string; value: unknown }) => (
                <div key={f.factKey} className="border-b pb-1">
                  <span className="font-mono">{f.factKey}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {f.factType}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              <LocalizedText id="4b4e155ec7ba" leading={""} trailing={"\n            "} /></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/dashboard/renewals" className="text-primary hover:underline">
              <LocalizedText id="8be1f38b6238" leading={""} trailing={"\n            "} /></Link>
            <Link href="/dashboard/leads" className="text-primary hover:underline">
              <LocalizedText id="e6d51351ba31" leading={""} trailing={"\n            "} /></Link>
            <Link href="/dashboard/supplements" className="text-primary hover:underline">
              <LocalizedText id="33057b9a5153" leading={""} trailing={"\n            "} /></Link>
            <p className="text-xs text-muted-foreground pt-2">
              <LocalizedText id="b7697f856884" leading={""} trailing={" "} /><strong><LocalizedText id="1b2892bf5820" leading={""} trailing={""} /></strong> <LocalizedText id="5f135086ae1d" leading={""} trailing={"\n            "} /></p>
          </CardContent>
        </Card>
      </div>

      <ApprovalsQueuePanel />
      <RenewalsChasePanel />
      <LeadsFollowUpPanel compact />
    </div>
  );
}
