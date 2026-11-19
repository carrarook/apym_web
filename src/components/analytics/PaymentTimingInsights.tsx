"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type TimingData = {
  sampleSize: number;
  peakPaymentDayOfMonth: number | null;
  lowestPaymentDayOfMonth: number | null;
  suggestDiscountWindow: string | null;
  preferredMethod: string | null;
  personalizedPaymentOptions: string[];
};

export function PaymentTimingInsights() {
  const { data, isLoading, error } = useSWR<TimingData>(
    "/api/analytics/payment-timing",
    fetcher,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg"><LocalizedText id="1dc05529e455" leading={""} trailing={""} /></CardTitle>
        <p className="text-xs text-muted-foreground">
          <LocalizedText id="3e0565ab2adc" leading={""} trailing={"\n        "} /></p>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {isLoading && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="33ce417454bf" leading={""} trailing={"\n          "} /></p>
        )}
        {error && <p className="text-destructive text-xs"><LocalizedText id="f91866086137" leading={""} trailing={""} /></p>}
        {data && (
          <>
            <p className="text-muted-foreground">
              <LocalizedText id="77bfa67a49fe" leading={""} trailing={" "} />{data.sampleSize} <LocalizedText id="ba00d312bd8f" leading={""} trailing={"\n            "} /></p>
            {data.peakPaymentDayOfMonth != null && (
              <p>
                <LocalizedText id="76afce2354ae" leading={""} trailing={" "} /><strong>{data.peakPaymentDayOfMonth}</strong>
              </p>
            )}
            {data.suggestDiscountWindow && (
              <p className="text-xs bg-muted/50 p-2 rounded-md">{data.suggestDiscountWindow}</p>
            )}
            {data.preferredMethod && (
              <p>
                <LocalizedText id="34e8428cadf4" leading={""} trailing={" "} /><strong>{data.preferredMethod}</strong>
              </p>
            )}
            {data.personalizedPaymentOptions?.length > 0 && (
              <p className="text-xs">
                <LocalizedText id="c429acd1fc1d" leading={""} trailing={" "} />{data.personalizedPaymentOptions.join(", ")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
