"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import useSWR from "swr";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SelectNative,
} from "@/components/ui/select-native";
import { Loader2, Plus, CalendarCheck, UserCheck } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  notes: string | null;
  followUpAt: string | null;
  convertedMemberId: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-700",
  CONTACTED: "bg-amber-500/10 text-amber-700",
  TRIAL_SCHEDULED: "bg-purple-500/10 text-purple-700",
  TRIAL_DONE: "bg-indigo-500/10 text-indigo-700",
  CONVERTED: "bg-green-500/10 text-green-700",
  LOST: "bg-muted text-muted-foreground",
};

export default function LeadsPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data, isLoading, mutate } = useSWR<{ leads: LeadRow[] }>(
    "/api/leads",
    fetcher,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("WEBSITE");
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const createLead = async () => {
    if (!name.trim() || phone.length < 10) return;
    setSaving(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source }),
      });
      setName("");
      setPhone("");
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const patchLead = async (
    id: string,
    body: Record<string, unknown>,
  ) => {
    setActingId(id);
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await mutate();
    } finally {
      setActingId(null);
    }
  };

  const bookTrial = async (id: string) => {
    setActingId(id);
    try {
      await fetch(`/api/leads/${id}/book-trial`, { method: "POST" });
      await mutate();
    } finally {
      setActingId(null);
    }
  };

  const leads = data?.leads ?? [];
  const open = leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status));

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("ba64d13eefe5")}
        description={tStatic("15a296c0f1b0")}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base"><LocalizedText id="d32f67b8b1fe" leading={""} trailing={""} /></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={tStatic("709a23220f2c")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder={tStatic("77064d526523")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full sm:w-40"
          />
          <SelectNative
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full sm:w-36"
          >
            <option value="WEBSITE"><LocalizedText id="2e8a57cc5c47" leading={""} trailing={""} /></option>
            <option value="WHATSAPP"><LocalizedText id="b336fc558722" leading={""} trailing={""} /></option>
            <option value="WALK_IN"><LocalizedText id="801d866beb88" leading={""} trailing={""} /></option>
            <option value="REFERRAL"><LocalizedText id="1c6984ff9c3a" leading={""} trailing={""} /></option>
            <option value="INSTAGRAM"><LocalizedText id="5721bbef40b2" leading={""} trailing={""} /></option>
            <option value="PHONE_CALL"><LocalizedText id="77064d526523" leading={""} trailing={""} /></option>
            <option value="OTHER"><LocalizedText id="6e6a6f2086bb" leading={""} trailing={""} /></option>
          </SelectNative>
          <Button onClick={createLead} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </CardContent>
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          <LocalizedText id="eb00d93ea718" leading={""} trailing={" "} /><code className="text-[11px]"><LocalizedText id="cdeafe70bb3c" leading={""} trailing={""} /></code> <LocalizedText id="8fcd25a39d20" leading={""} trailing={""} />{" "}
          <code className="text-[11px]"><LocalizedText id="706e9621c37c" leading={""} trailing={""} /></code><LocalizedText id="311fa5b07384" leading={""} trailing={"\n        "} /></p>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">
            <LocalizedText id="738345ebbcb0" leading={""} trailing={""} />{open.length} <LocalizedText id="dbfd6c69e49e" leading={""} trailing={"\n          "} /></CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="33ce417454bf" leading={""} trailing={"\n            "} /></p>
          )}
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{lead.name}</span>
                    <Badge className={STATUS_COLORS[lead.status] ?? ""}>
                      {lead.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{lead.source}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                  {lead.followUpAt && (
                    <p className="text-xs text-amber-600">
                      <LocalizedText id="6d789251b616" leading={""} trailing={" "} />{new Date(lead.followUpAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {lead.status === "NEW" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === lead.id}
                      onClick={() => patchLead(lead.id, { status: "CONTACTED" })}
                    >
                      <LocalizedText id="b5e4809ecb5c" leading={""} trailing={"\n                    "} /></Button>
                  )}
                  {!["TRIAL_SCHEDULED", "CONVERTED"].includes(lead.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === lead.id}
                      onClick={() => bookTrial(lead.id)}
                    >
                      {actingId === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CalendarCheck className="h-3 w-3 mr-1" />
                          <LocalizedText id="0614cb83efe5" leading={""} trailing={"\n                        "} /></>
                      )}
                    </Button>
                  )}
                  {!["CONVERTED", "LOST"].includes(lead.status) && !lead.convertedMemberId && (
                    <Link
                      href={`/dashboard/members/new?leadId=${lead.id}&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone)}`}
                    >
                      <Button size="sm" variant="default">
                        <UserCheck className="h-3 w-3 mr-1" />
                        <LocalizedText id="4e7e784a487d" leading={""} trailing={"\n                      "} /></Button>
                    </Link>
                  )}
                  {lead.convertedMemberId && (
                    <Link href={`/dashboard/members/${lead.convertedMemberId}`}>
                      <Button size="sm" variant="ghost">
                        <UserCheck className="h-3 w-3 mr-1" />
                        <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                      "} /></Button>
                    </Link>
                  )}
                  {!["CONVERTED", "LOST"].includes(lead.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actingId === lead.id}
                      onClick={() =>
                        patchLead(lead.id, {
                          status: "LOST",
                          lostReason: "Not interested",
                        })
                      }
                    >
                      <LocalizedText id="75a7bf994e9a" leading={""} trailing={"\n                    "} /></Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!isLoading && leads.length === 0 && (
            <p className="text-sm text-muted-foreground"><LocalizedText id="bc9adbdc2bb4" leading={""} trailing={""} /></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
