"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Ticket, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { FreeTrialVisitDto } from "@/lib/free-trial-visit-api";
import { toast } from "sonner";

type WalkInKind = "FREE_TRIAL" | "DAY_PASS";

type PhoneSummary = {
  phone: string;
  freeTrialUsed: number;
  freeTrialRemaining: number;
  freeTrialMaxLifetime: number;
};

function todayYmdLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function unwrapPayload<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as { success?: boolean; data?: T };
  if (root.success === true && root.data != null) return root.data;
  return raw as T;
}

function unwrapError(raw: unknown, fallback: string): string {
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { error?: string; message?: string };
    if (o.error) return o.error;
    if (o.message) return o.message;
  }
  return fallback;
}

export function WalkInVisitsPanel({
  visitDate,
  visits: visitsProp,
  loadingVisits = false,
  onRecordsChanged,
}: {
  visitDate: string;
  visits: FreeTrialVisitDto[];
  loadingVisits?: boolean;
  onRecordsChanged?: () => void;
}) {
  const tStatic = useStaticUiTranslations("static");
  const visits = visitsProp;
  const loadingList = loadingVisits;
  const [kind, setKind] = useState<WalkInKind>("FREE_TRIAL");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<PhoneSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPhoneSummary = useCallback(async (phoneInput: string) => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await fetch(
        `/api/free-trial-visits?phone=${encodeURIComponent(phoneInput)}`
      );
      const data = await res.json().catch(() => ({}));
      const payload = unwrapPayload<{ summary?: PhoneSummary }>(data);
      setSummary(payload?.summary ?? null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (kind !== "FREE_TRIAL") {
      setSummary(null);
      return;
    }
    const t = setTimeout(() => void fetchPhoneSummary(phone), 400);
    return () => clearTimeout(t);
  }, [phone, kind, fetchPhoneSummary]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error(tStatic("e7b59d052cf0"));
      return;
    }
    if (kind === "DAY_PASS") {
      const n = parseFloat(amount);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error(tStatic("c18ffe1e5218"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        kind,
        name: name.trim(),
        phone: phone.trim(),
        visitDate,
        notes: notes.trim() || null,
      };
      if (kind === "DAY_PASS") {
        body.amount = parseFloat(amount);
      }

      const res = await fetch("/api/free-trial-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(unwrapError(data, tStatic("23778b5f7eb2")));
      }

      toast.success(
        kind === "FREE_TRIAL" ? tStatic("7c11cf25f923") : tStatic("3170cea1b9ea")
      );
      setName("");
      setPhone("");
      setAmount("");
      setNotes("");
      setSummary(null);
      onRecordsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tStatic("23778b5f7eb2"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this walk-in entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/free-trial-visits/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(unwrapError(data, tStatic("07931ff7dc8f")));
      }
      toast.success(tStatic("2079fbc30dab"));
      onRecordsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tStatic("07931ff7dc8f"));
    } finally {
      setDeletingId(null);
    }
  }

  const todayYmd = todayYmdLocal();
  const isPastOrToday = visitDate <= todayYmd;

  return (
    <Card className="border-amber-200/60 dark:border-amber-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <LocalizedText id="d58bd441a348" leading={""} trailing={"\n        "} /></CardTitle>
        <CardDescription>
          <LocalizedText id="81edb40d7ba8" leading={""} trailing={"\n        "} /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={kind === "FREE_TRIAL" ? "default" : "outline"}
            onClick={() => setKind("FREE_TRIAL")}
          >
            <LocalizedText id="22357ca6e782" leading={""} trailing={"\n          "} /></Button>
          <Button
            type="button"
            size="sm"
            variant={kind === "DAY_PASS" ? "default" : "outline"}
            onClick={() => setKind("DAY_PASS")}
          >
            <Ticket className="h-3.5 w-3.5 mr-1" />
            <LocalizedText id="fb5397eb7637" leading={""} trailing={"\n          "} /></Button>
        </div>

        {isPastOrToday ? (
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="walkin-name"><LocalizedText id="ca27b75468f7" leading={""} trailing={""} /></Label>
              <Input
                id="walkin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tStatic("b497f209fe91")}
                className="uppercase"
                required
              />
            </div>
            <div>
              <Label htmlFor="walkin-phone"><LocalizedText id="187a5221838a" leading={""} trailing={""} /></Label>
              <Input
                id="walkin-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={tStatic("4622277a192a")}
                inputMode="tel"
                required
              />
              {kind === "FREE_TRIAL" && phone.replace(/\D/g, "").length >= 10 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {summaryLoading ? (
                    tStatic("885fd56d3e6c")
                  ) : summary ? (
                    <>
                      <LocalizedText id="5d832dd79ead" leading={""} trailing={" "} />{summary.freeTrialUsed} / {summary.freeTrialMaxLifetime}
                      {summary.freeTrialRemaining === 0 ? (
                        <span className="text-destructive font-medium"> <LocalizedText id="c7ebdab708ed" leading={""} trailing={""} /></span>
                      ) : (
                        <span> — {summary.freeTrialRemaining} <LocalizedText id="398658a601d9" leading={""} trailing={""} /></span>
                      )}
                    </>
                  ) : null}
                </p>
              )}
            </div>
            {kind === "DAY_PASS" ? (
              <div>
                <Label htmlFor="walkin-amount"><LocalizedText id="563e1cc2e7fc" leading={""} trailing={""} /></Label>
                <Input
                  id="walkin-amount"
                  type="number"
                  min={1}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 200"
                  required
                />
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="walkin-notes"><LocalizedText id="4d56ca9be0c8" leading={""} trailing={""} /></Label>
              <Textarea
                id="walkin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={tStatic("36e8251b9664")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <LocalizedText id="56a2285c5b11" leading={""} trailing={"\n                  "} /></>
                ) : kind === "FREE_TRIAL" ? (
                  tStatic("3f04145fc521")
                ) : (
                  tStatic("81d254651a58")
                )}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <LocalizedText id="fa487a427185" leading={""} trailing={"\n          "} /></p>
        )}

        <div className="border-t border-border pt-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <LocalizedText id="4bcc6da7623b" leading={""} trailing={" "} />{visitDate}
          </div>
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <LocalizedText id="33ce417454bf" leading={""} trailing={"\n            "} /></div>
          ) : visits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              <LocalizedText id="b62c3375d8b5" leading={""} trailing={"\n            "} /></p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {visits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium uppercase truncate">
                        {v.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          v.kind === "FREE_TRIAL"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                        )}
                      >
                        {v.kind === "FREE_TRIAL" ? tStatic("22357ca6e782") : tStatic("fb5397eb7637")}
                      </Badge>
                      {v.kind === "DAY_PASS" && v.amount != null && (
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(v.amount)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">{v.phone}</div>
                    {v.notes ? (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate" title={v.notes}>
                        {v.notes}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === v.id}
                    onClick={() => void handleDelete(v.id)}
                    title={tStatic("18ffc873a160")}
                  >
                    {deletingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
