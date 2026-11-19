"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TrainerLeaderboard() {
  const { data, isLoading } = useSWR("/api/trainers/leaderboard?days=90", fetcher);
  const trainers = data?.trainers ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg"><LocalizedText id="f0cb19a86c93" leading={""} trailing={""} /></CardTitle>
        <p className="text-xs text-muted-foreground"><LocalizedText id="7eaff9a5d326" leading={""} trailing={""} /></p>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!isLoading && trainers.length === 0 && (
          <p className="text-sm text-muted-foreground"><LocalizedText id="f152334d2fae" leading={""} trailing={""} /></p>
        )}
        <ul className="space-y-2">
          {trainers.slice(0, 6).map((t: {
            trainerId: string;
            trainerName: string;
            activeClients: number;
            classSessions: number;
            revenueInr: number;
            avgRevenuePerClient: number;
          }, i: number) => (
            <li
              key={t.trainerId}
              className="flex items-center justify-between gap-2 text-sm border rounded-md p-2"
            >
              <div>
                <span className="text-muted-foreground mr-2">#{i + 1}</span>
                <span className="font-medium">{t.trainerName}</span>
                <p className="text-xs text-muted-foreground">
                  {t.activeClients} <LocalizedText id="6d394752c9d9" leading={""} trailing={" "} />{t.classSessions} <LocalizedText id="1adaa84dc07a" leading={""} trailing={"\n                "} /></p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(t.revenueInr)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <LocalizedText id="97e77871b5fc" leading={""} trailing={" "} />{formatCurrency(t.avgRevenuePerClient)}<LocalizedText id="15a5f701524b" leading={""} trailing={"\n                "} /></p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
