"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Loader2, BarChart3, Send } from "lucide-react";

type Segment = "expiring_this_week" | "overdue" | "lapsed_30d" | "all_active";

type Probe = {
  audienceCount: number;
  sample: Array<{ id: string; name: string; phone: string | null }>;
  analytics: {
    withPhone: number;
    activeMembers: number;
    expiringIn7Days: number;
    overdueCount: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CampaignsPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data: listData, mutate } = useSWR("/api/campaigns", fetcher);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<Segment>("expiring_this_week");
  const [probe, setProbe] = useState<Probe | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const runProbe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment }),
      });
      const json = await res.json();
      if (json.success) setProbe(json.data);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!name.trim() || !message.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, segment }),
      });
      setName("");
      setMessage("");
      setProbe(null);
      await mutate();
    } finally {
      setCreating(false);
    }
  };

  const queueSend = async (id: string) => {
    await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    await mutate();
  };

  const campaigns = listData?.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <DashboardPageHeader
        title={tStatic("01a23a288f60")}
        description={tStatic("f76ace84e0cd")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg"><LocalizedText id="59812bbcc746" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name"><LocalizedText id="709a23220f2c" leading={""} trailing={""} /></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tStatic("6492a9a5ccb4")} />
          </div>
          <div className="space-y-2">
            <Label><LocalizedText id="f5e913b8e79b" leading={""} trailing={""} /></Label>
            <SelectNative
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="mt-1"
            >
              <option value="expiring_this_week"><LocalizedText id="6958cc83af84" leading={""} trailing={""} /></option>
              <option value="overdue"><LocalizedText id="26d6d0a82366" leading={""} trailing={""} /></option>
              <option value="lapsed_30d"><LocalizedText id="619ea4a6c15a" leading={""} trailing={""} /></option>
              <option value="all_active"><LocalizedText id="cae5a028fd93" leading={""} trailing={""} /></option>
            </SelectNative>
          </div>
          <Button type="button" variant="secondary" onClick={runProbe} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            <span className="ml-2"><LocalizedText id="6f25150b5c8f" leading={""} trailing={""} /></span>
          </Button>
          {probe && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-2">
              <p><strong>{probe.audienceCount}</strong> <LocalizedText id="7030f808dbd6" leading={""} trailing={" "} /><strong>{probe.analytics.withPhone}</strong> <LocalizedText id="1b65de898f5b" leading={""} trailing={""} /></p>
              <p className="text-muted-foreground">
                <LocalizedText id="60148d9fb706" leading={""} trailing={" "} />{probe.analytics.activeMembers} <LocalizedText id="4c71073f929b" leading={""} trailing={" "} />{probe.analytics.expiringIn7Days} <LocalizedText id="a96197d9ec9e" leading={""} trailing={" "} />{probe.analytics.overdueCount} <LocalizedText id="ba2fff4051e9" leading={""} trailing={"\n              "} /></p>
              {probe.sample.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {probe.sample.map((m) => (
                    <li key={m.id}>{m.name} — {m.phone ?? tStatic("8ae9fce60f3c")}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="message"><LocalizedText id="68f4145fee7d" leading={""} trailing={""} /></Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={tStatic("289d9f8f4017")} />
          </div>
          <Button onClick={createCampaign} disabled={creating || !probe}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2"><LocalizedText id="08d405d09126" leading={""} trailing={""} /></span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg"><LocalizedText id="b11851a2826d" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.map((c: { id: string; name: string; status: string; recipientCount: number }) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-border rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.recipientCount} <LocalizedText id="3ffee4a65cea" leading={""} trailing={" "} />{c.status}</p>
              </div>
              {c.status === "DRAFT" && (
                <Button size="sm" variant="outline" onClick={() => queueSend(c.id)}><LocalizedText id="7423928843dd" leading={""} trailing={""} /></Button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground"><LocalizedText id="a21c7117cc69" leading={""} trailing={""} /></p>}
        </CardContent>
      </Card>
    </div>
  );
}
