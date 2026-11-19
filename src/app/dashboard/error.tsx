"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

const logger = createLogger("dashboard-error.tsx");

export default function DashboardError({
  error,
  reset,
}: {
  error: (Error & { digest?: string }) | unknown;
  reset: () => void;
}) {
  const tStatic = useStaticUiTranslations("static");
  const router = useRouter();

  useEffect(() => {
    logger.error("Dashboard error:", error as Error);
  }, [error]);

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-card rounded-2xl shadow-lg border border-red-200 p-8 sm:p-12">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-5">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-center">
          <LocalizedText id="e96f2942ee8e" leading={""} trailing={"\n        "} /></h2>
        
        <p className="text-muted-foreground text-center mb-2">
          <LocalizedText id="1714f25c9c2c" leading={""} trailing={"\n        "} /></p>
        
        <div className="mb-6 mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 dark:bg-destructive/15">
          <p className="break-words font-mono text-sm text-destructive">
            {tStatic("0e7155936917")}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
          >
            <RefreshCw className="h-5 w-5" />
            <LocalizedText id="6e41ee3f309a" leading={""} trailing={"\n          "} /></Button>
          
          <Button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 bg-muted text-foreground px-6 py-3 rounded-xl hover:bg-muted/80 transition-colors font-semibold"
          >
            <ArrowLeft className="h-5 w-5" />
            <LocalizedText id="f03e2d07687c" leading={""} trailing={"\n          "} /></Button>
        </div>
        
        {error instanceof Error &&
        "digest" in error &&
        typeof (error as Error & { digest?: string }).digest === "string" ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <LocalizedText id="013173f56453" leading={""} trailing={" "} />{(error as Error & { digest?: string }).digest}
          </p>
        ) : null}

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {error instanceof Error &&
            "digest" in error &&
            typeof (error as Error & { digest?: string }).digest === "string"
              ? tStatic("08d6b0520e44")
              : tStatic("f5aa02ead8e3")}
          </p>
        </div>
      </div>
    </div>
  );
}
