"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Zap, CheckCircle, X, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { QuickEntryResultState } from "@/lib/quick-entry-types";

export function DashboardQuickEntryButton({
  open,
  onOpenChange,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={cn(
        "inline-flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-all text-sm font-medium",
        className
      )}
    >
      <Zap className="h-3.5 w-3.5 shrink-0" />
      <LocalizedText id="a0d8a9c918c0" leading={""} trailing={"\n    "} /></Button>
  );
}

type DashboardQuickEntryPanelProps = {
  open: boolean;
  onSuccess?: () => void | Promise<void>;
  onUnauthorized?: () => void;
};

type SubmitQuickEntryOptions = {
  text: string;
  /** Main submit clears previous result unless confirming a duplicate */
  clearResultFirst?: boolean;
  useMemberId?: string;
  confirmDuplicate?: boolean;
  verifyPhone?: string;
  pendingMemberId?: string | null;
};

export function DashboardQuickEntryPanel({
  open,
  onSuccess,
  onUnauthorized,
}: DashboardQuickEntryPanelProps) {
  const tStatic = useStaticUiTranslations("static");
  const [quickEntryText, setQuickEntryText] = useState("");
  const [quickEntryLoading, setQuickEntryLoading] = useState(false);
  const [quickEntryResult, setQuickEntryResult] = useState<QuickEntryResultState | null>(null);
  const [quickEntryVerifyPhone, setQuickEntryVerifyPhone] = useState("");
  const [quickEntryPendingMemberId, setQuickEntryPendingMemberId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [lastBulkResponse, setLastBulkResponse] = useState<QuickEntryResultState | null>(null);
  const clearAfterSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postQuickEntry = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/payments/quick-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const result = (await res.json().catch(() => ({}))) as QuickEntryResultState;
    return { res, result };
  }, []);

  const scheduleClearIfDone = useCallback((next: QuickEntryResultState) => {
    const bulkHasFailures = next.bulk === true && (next.failed ?? 0) > 0;
    if (clearAfterSuccessTimeoutRef.current) {
      clearTimeout(clearAfterSuccessTimeoutRef.current);
      clearAfterSuccessTimeoutRef.current = null;
    }
    if (!bulkHasFailures && next.success) {
      clearAfterSuccessTimeoutRef.current = setTimeout(() => {
        clearAfterSuccessTimeoutRef.current = null;
        setQuickEntryText("");
        setQuickEntryResult(null);
        setLastBulkResponse(null);
      }, 15_000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clearAfterSuccessTimeoutRef.current) {
        clearTimeout(clearAfterSuccessTimeoutRef.current);
      }
    };
  }, []);

  const submitQuickEntryPayload = useCallback(
    async (opts: SubmitQuickEntryOptions) => {
      const {
        text,
        clearResultFirst = false,
        useMemberId,
        confirmDuplicate,
        verifyPhone,
        pendingMemberId,
      } = opts;
      if (!text.trim()) return;

      setQuickEntryLoading(true);
      if (clearResultFirst) {
        setQuickEntryResult(null);
      }
      try {
        const { res, result } = await postQuickEntry({
          text,
          ...(useMemberId && { useMemberId }),
          ...(confirmDuplicate && { confirmDuplicate: true }),
          ...(verifyPhone?.trim() && { verifyPhone: verifyPhone.trim() }),
          ...(pendingMemberId && { pendingMemberId }),
        });

        if (res.status === 401) {
          onUnauthorized?.();
          return;
        }

        if (res.ok && result.success) {
          setQuickEntryResult(result);
          setQuickEntryVerifyPhone("");
          setQuickEntryPendingMemberId(null);
          if (result.bulk) {
            setLastBulkResponse((result.failed ?? 0) > 0 ? result : null);
          } else {
            setLastBulkResponse(null);
          }
          await onSuccess?.();
          scheduleClearIfDone(result);
          return;
        }

        if (result.needsPhoneVerification && result.pendingMemberId) {
          setQuickEntryPendingMemberId(result.pendingMemberId);
        }

        let next: QuickEntryResultState = result;
        if (res.status === 404) {
          next = { error: "Quick entry not available. Please refresh or try again." };
        } else if (res.status >= 500) {
          next = {
            error: "Server error. Please try again later.",
            details: result?.details || result?.error,
          };
        }
        setQuickEntryResult(next);
      } catch (err: unknown) {
        setQuickEntryResult({ error: "Failed to add payment", details: String(err) });
      } finally {
        setQuickEntryLoading(false);
      }
    },
    [onSuccess, onUnauthorized, postQuickEntry, scheduleClearIfDone]
  );

  const handleQuickEntry = useCallback(
    async (useMemberId?: string, confirmDuplicate?: boolean) => {
      await submitQuickEntryPayload({
        text: quickEntryText,
        clearResultFirst: !confirmDuplicate,
        useMemberId,
        confirmDuplicate,
        verifyPhone: quickEntryVerifyPhone,
        pendingMemberId: quickEntryPendingMemberId,
      });
    },
    [quickEntryText, quickEntryVerifyPhone, quickEntryPendingMemberId, submitQuickEntryPayload]
  );

  const postSingleLine = useCallback(
    async (
      entry: string,
      extra: {
        confirmDuplicate?: boolean;
        useMemberId?: string;
        verifyPhone?: string;
        pendingMemberId?: string;
      } = {}
    ) => {
      await submitQuickEntryPayload({
        text: entry,
        clearResultFirst: false,
        confirmDuplicate: extra.confirmDuplicate,
        useMemberId: extra.useMemberId,
        verifyPhone: extra.verifyPhone,
        pendingMemberId: extra.pendingMemberId ?? null,
      });
    },
    [submitQuickEntryPayload]
  );

  const dismissQuickEntryFull = useCallback(() => {
    setQuickEntryResult(null);
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    setQuickEntryText("");
    setLastBulkResponse(null);
  }, []);

  const handleCancelVerifyOverlay = useCallback(() => {
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    if (lastBulkResponse?.bulk) {
      setQuickEntryResult(lastBulkResponse);
    } else {
      setQuickEntryResult(null);
    }
  }, [lastBulkResponse]);

  const handleFixBulkLine = useCallback((entry: string) => {
    setQuickEntryText(entry);
    setIsBulkMode(false);
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    setQuickEntryResult(null);
  }, []);

  const resultPanelClass = (r: QuickEntryResultState) =>
    r.success
      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
      : r.duplicate
        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800";

  const renderQuickEntryResultBody = (): ReactNode => {
    const r = quickEntryResult;
    if (!r) return null;

    if (r.bulk) {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-900 dark:text-green-100">
                <LocalizedText id="b3603d62f831" leading={""} trailing={" "} />{r.processed ?? 0} <LocalizedText id="8204fbd54fb5" leading={""} trailing={"\n                "} />{(r.failed ?? 0) > 0 ? `, ${r.failed} failed` : ""}
              </p>
              {r.message && (
                <p className="text-xs text-green-800 dark:text-green-200 mt-0.5">{r.message}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={dismissQuickEntryFull}
              className="shrink-0 p-1 rounded hover:bg-green-200/50 dark:hover:bg-green-800/30 text-green-800 dark:text-green-200"
              aria-label={tStatic("70afe9eff3f2")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {r.results && r.results.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-green-800 dark:text-green-200"><LocalizedText id="cf9c7f48cb3c" leading={""} trailing={""} /></p>
              {r.results.map((row, idx) => (
                <div key={idx} className="text-xs text-green-700 dark:text-green-300 pl-6">
                  ✓ {row.member} — {row.methods || `₹${row.amount} ${row.method}`} ({row.date})
                </div>
              ))}
            </div>
          )}

          {r.errors && r.errors.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200"><LocalizedText id="0d7fd7a31747" leading={""} trailing={""} /></p>
              <p className="text-xs text-muted-foreground">
                <LocalizedText id="3d14fdfc2b46" leading={""} trailing={" "} /><span className="font-medium text-foreground"><LocalizedText id="21a0b484084e" leading={""} trailing={""} /></span> <LocalizedText id="e1571d43a326" leading={""} trailing={""} />{" "}
                <span className="font-medium text-foreground"><LocalizedText id="952cb2f02081" leading={""} trailing={""} /></span> <LocalizedText id="f604d83b75c6" leading={""} trailing={"\n              "} /></p>
              {r.errors.map((errorRow, idx) => {
                const flagged =
                  errorRow.invalidDate ||
                  errorRow.invalidName ||
                  errorRow.needsPhoneInLine ||
                  errorRow.ambiguousMember;
                return (
                  <div
                    key={idx}
                    className={`text-xs text-red-800 dark:text-red-200 pl-2 py-2 rounded-md border space-y-1 ${
                      flagged
                        ? "bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-700"
                        : "border-transparent"
                    }`}
                  >
                    <span className="font-mono block break-all">✗ {errorRow.entry}</span>
                    <span className="block">{errorRow.error}</span>
                    {errorRow.memberPreview && (
                      <span className="block text-red-700 dark:text-red-300">
                        <LocalizedText id="c0a1c1f30adc" leading={""} trailing={" "} />{errorRow.memberPreview.name} ({errorRow.memberPreview.phoneMask})
                      </span>
                    )}
                    {errorRow.duplicate && errorRow.existingPayment && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-amber-700 dark:text-amber-400">
                          {errorRow.existingPayment.memberName ?? tStatic("6853c98a6f43")} <LocalizedText id="389f6a8fffa0" leading={""} trailing={""} />{" "}
                          {formatCurrency(errorRow.existingPayment.amount)} <LocalizedText id="db3d405b1067" leading={""} trailing={""} />{" "}
                          {formatDate(String(errorRow.existingPayment.receivedAt))}.
                        </span>
                        <Button
                          type="button"
                          onClick={() => void postSingleLine(errorRow.entry, { confirmDuplicate: true })}
                          disabled={quickEntryLoading}
                          className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <LocalizedText id="86066fb18750" leading={""} trailing={"\n                        "} /></Button>
                      </div>
                    )}
                    {(errorRow.needsPhoneInLine ||
                      errorRow.ambiguousMember ||
                      (errorRow.similarNames && errorRow.similarNames.length > 0)) && (
                      <Button
                        type="button"
                        onClick={() => handleFixBulkLine(errorRow.entry)}
                        disabled={quickEntryLoading}
                        className="text-xs px-2 py-1 rounded border border-red-400 text-red-900 dark:text-red-100 hover:bg-red-200/40 dark:hover:bg-red-900/40 disabled:opacity-50"
                      >
                        <LocalizedText id="eff678b4dead" leading={""} trailing={"\n                      "} /></Button>
                    )}
                    {errorRow.candidates && errorRow.candidates.length > 0 && (
                      <span className="block text-red-700 dark:text-red-300">
                        <LocalizedText id="50651c3dc7c2" leading={""} trailing={" "} />{errorRow.candidates.map((c) => c.name).join(", ")}
                      </span>
                    )}
                    {errorRow.similarNames && errorRow.similarNames.length > 0 && (
                      <span className="block text-red-600 dark:text-red-400">
                        <LocalizedText id="848eb3449e40" leading={""} trailing={" "} />{errorRow.similarNames.map((s) => s.name).join(", ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (r.duplicate) {
      return (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100"><LocalizedText id="e885e63fcf89" leading={""} trailing={""} /></p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
              {r.existingPayment?.memberName ?? tStatic("6853c98a6f43")} <LocalizedText id="389f6a8fffa0" leading={""} trailing={""} />{" "}
              {formatCurrency(r.existingPayment?.amount ?? 0)} <LocalizedText id="db3d405b1067" leading={""} trailing={""} />{" "}
              {formatDate(r.existingPayment?.receivedAt ?? new Date().toISOString())}.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{r.suggestion}</p>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={() => void handleQuickEntry(undefined, true)}
                disabled={quickEntryLoading}
                className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <LocalizedText id="86066fb18750" leading={""} trailing={"\n              "} /></Button>
              <Button
                type="button"
                onClick={dismissQuickEntryFull}
                className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <LocalizedText id="36fff63ccbcd" leading={""} trailing={"\n              "} /></Button>
            </div>
          </div>
        </div>
      );
    }

    if (r.needsPhoneVerification || r.ambiguousMember) {
      return (
        <div className="flex flex-col gap-3">
          {lastBulkResponse?.bulk === true && (lastBulkResponse.failed ?? 0) > 0 && (
            <div className="text-xs rounded-md border border-purple-300/80 dark:border-purple-700 bg-purple-100/50 dark:bg-purple-950/40 px-2 py-1.5 text-purple-900 dark:text-purple-100">
              <LocalizedText id="bbe92aacb813" leading={""} trailing={" "} /><span className="font-medium"><LocalizedText id="77dfd2135f4d" leading={""} trailing={""} /></span> <LocalizedText id="926efab99fa8" leading={""} trailing={"\n              "} />{lastBulkResponse.failed} <LocalizedText id="45777e2f27ca" leading={""} trailing={"\n            "} /></div>
          )}
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-900 dark:text-red-100"><LocalizedText id="5d403c4abfe2" leading={""} trailing={""} /></p>
              <p className="text-xs text-red-800 dark:text-red-200 mt-0.5">{r.error}</p>
              {r.suggestion && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{r.suggestion}</p>
              )}
              {r.phoneMask && (
                <p className="text-xs font-mono mt-1 text-red-800 dark:text-red-200">
                  <LocalizedText id="1f065134e49a" leading={""} trailing={" "} />{r.phoneMask}
                </p>
              )}
            </div>
          </div>
          {r.ambiguousMember && r.candidates && r.candidates.length > 0 && (
            <div className="space-y-2 pl-6">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200"><LocalizedText id="1dc031e8a2f6" leading={""} trailing={""} /></p>
              {r.candidates.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-red-800 dark:text-red-200">
                    {c.name} ({c.phone})
                  </span>
                  <Button
                    type="button"
                    onClick={() => {
                      setQuickEntryVerifyPhone("");
                      void handleQuickEntry(c.id);
                    }}
                    disabled={quickEntryLoading}
                    className="text-xs px-2 py-0.5 rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    <LocalizedText id="a56a0a5d4fa1" leading={""} trailing={"\n                  "} /></Button>
                </div>
              ))}
            </div>
          )}
          {r.needsPhoneVerification && (
            <div className="flex flex-col sm:flex-row gap-2 pl-6 items-stretch sm:items-end">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="quick-entry-phone-verify"
                  className="text-xs font-medium text-red-800 dark:text-red-200 block mb-1"
                >
                  <LocalizedText id="4792d80bfbb9" leading={""} trailing={"\n                "} /></label>
                <Input
                  id="quick-entry-phone-verify"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="e.g. 0895"
                  value={quickEntryVerifyPhone}
                  onChange={(e) => setQuickEntryVerifyPhone(e.target.value)}
                  className="h-9 text-sm border-red-300 dark:border-red-700"
                  disabled={quickEntryLoading}
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleQuickEntry()}
                disabled={quickEntryLoading || !quickEntryVerifyPhone.trim()}
                className="text-sm px-3 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 shrink-0"
              >
                <LocalizedText id="1663f6f7acc5" leading={""} trailing={"\n              "} /></Button>
            </div>
          )}
          <Button
            type="button"
            onClick={handleCancelVerifyOverlay}
            className="text-xs text-red-700 dark:text-red-300 underline self-start pl-6"
          >
            <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n          "} /></Button>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2">
        {r.success ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100"><LocalizedText id="612ce710d4f3" leading={""} trailing={""} /></p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                {r.message ||
                  `${r.payment?.Member?.name} — ${formatCurrency(Number(r.payment?.amount))} via ${r.payment?.method}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-100"><LocalizedText id="09fef5d8d9a3" leading={""} trailing={""} /></p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{r.error}</p>
              {(r.invalidDate || r.invalidName) && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  <LocalizedText id="231b0658ef8d" leading={""} trailing={"\n                "} /></p>
              )}
              {r.phoneMismatch && quickEntryPendingMemberId && (
                <div className="mt-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={tStatic("4eb506d06f6f")}
                    value={quickEntryVerifyPhone}
                    onChange={(e) => setQuickEntryVerifyPhone(e.target.value)}
                    className="h-9 text-sm max-w-xs border-red-300"
                    disabled={quickEntryLoading}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleQuickEntry()}
                    disabled={quickEntryLoading || !quickEntryVerifyPhone.trim()}
                    className="text-xs px-3 py-2 rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    <LocalizedText id="4fef99c247bc" leading={""} trailing={"\n                  "} /></Button>
                </div>
              )}
              {r.similarNames && r.similarNames.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200"><LocalizedText id="c6fa85803e92" leading={""} trailing={""} /></p>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-1">
                    <LocalizedText id="4aa0cba71634" leading={""} trailing={"\n                  "} /></p>
                  {r.similarNames.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-700 dark:text-red-300">
                        {s.name} ({s.phone})
                      </span>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuickEntryVerifyPhone("");
                          void handleQuickEntry(s.id);
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        <LocalizedText id="b80ded59dbc9" leading={""} trailing={"\n                      "} /></Button>
                      <Button
                        type="button"
                        onClick={() => setQuickEntryResult(null)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LocalizedText id="98f55db57c8e" leading={""} trailing={"\n                      "} /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 rounded-lg relative z-10">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600 shrink-0" />
            <span><LocalizedText id="a0d8a9c918c0" leading={""} trailing={""} /></span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsBulkMode(!isBulkMode)}
              className="text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              {isBulkMode ? tStatic("952cb2f02081") : tStatic("3ffa323695e4")}
            </Button>
            <Badge variant="outline" className="text-xs">
              <LocalizedText id="6a0436ea8683" leading={""} trailing={"\n            "} /></Badge>
          </div>
        </div>
        <CardDescription className="text-xs mt-2">
          {isBulkMode ? (
            <>
              <span className="font-semibold"><LocalizedText id="b3603d62f831" leading={""} trailing={""} /></span> <LocalizedText id="09fcf042dbb5" leading={""} trailing={""} />{" "}
              <code className="text-[10px] bg-muted px-1 rounded"><LocalizedText id="0ec551391d03" leading={""} trailing={""} /></code> <LocalizedText id="6e93ed6ee49c" leading={""} trailing={"\n              "} /><p className="text-xs text-muted-foreground mt-2">
                <LocalizedText id="8c861f61906a" leading={""} trailing={" "} /><span className="font-medium text-foreground"><LocalizedText id="21a0b484084e" leading={""} trailing={""} /></span>{" "}
                <LocalizedText id="9262eb9abe57" leading={""} trailing={" "} /><span className="font-medium text-foreground"><LocalizedText id="952cb2f02081" leading={""} trailing={""} /></span> <LocalizedText id="0b7da8240bae" leading={""} trailing={" "} /><span className="font-medium text-foreground"><LocalizedText id="77dfd2135f4d" leading={""} trailing={""} /></span> <LocalizedText id="765a288dd7f8" leading={""} trailing={"\n              "} /></p>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                {`Renewal Piyush Singh 700 UPI 14/03/2026,
Renewal Aman 700 Cash 16/03/2026,
New Admission Prem 699 UPI 17/03/2026 8583946189
all dates 16th March`}
              </pre>
            </>
          ) : (
            <>
              <span className="font-semibold"><LocalizedText id="d6400d550e24" leading={""} trailing={""} /></span> <LocalizedText id="1d0b55bc6fae" leading={""} trailing={"\n              "} /><ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                <li className="truncate"><LocalizedText id="4ec5e9a241a3" leading={""} trailing={""} /></li>
                <li className="truncate"><LocalizedText id="329bfa23e007" leading={""} trailing={""} /></li>
                <li className="truncate"><LocalizedText id="ae331144e4d8" leading={""} trailing={""} /></li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                <LocalizedText id="193922ccbbef" leading={""} trailing={"\n              "} /></p>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="flex flex-col gap-2">
          {isBulkMode ? (
            <Textarea
              value={quickEntryText}
              onChange={(e) => setQuickEntryText(e.target.value)}
              placeholder={`Renewal Name 700 UPI 16/03/2026,\nNew Admission Name 699 UPI 17/03/2026 8583946189\nall dates 16th March`}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-xs resize-none"
              rows={5}
              disabled={quickEntryLoading}
            />
          ) : (
            <Input
              type="text"
              value={quickEntryText}
              onChange={(e) => setQuickEntryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !quickEntryLoading && quickEntryText.trim()) {
                  e.preventDefault();
                  void handleQuickEntry();
                }
              }}
              placeholder="400 cash 299 online renewal Mukesh Kumar Shaw"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-xs sm:placeholder:text-sm"
              disabled={quickEntryLoading}
            />
          )}
          <Button
            type="button"
            onClick={() => void handleQuickEntry()}
            disabled={quickEntryLoading || !quickEntryText.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {quickEntryLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{isBulkMode ? tStatic("93d175570231") : tStatic("ffb2e628b0e9")}</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>{isBulkMode ? tStatic("21a0b484084e") : tStatic("61cc55aa0453")}</span>
              </>
            )}
          </Button>
        </div>

        {quickEntryResult && (
          <div className={`p-3 rounded-lg border text-sm ${resultPanelClass(quickEntryResult)}`}>
            {renderQuickEntryResultBody()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
