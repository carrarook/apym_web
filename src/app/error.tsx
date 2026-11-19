"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const logger = createLogger("app");

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App error:", error as Error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-destructive/10 rounded-full p-6">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            <LocalizedText id="459812b45300" leading={""} trailing={"\n          "} /></CardTitle>
          <CardDescription>
            <LocalizedText id="275f3048929a" leading={""} trailing={"\n          "} /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-mono break-words">
                <LocalizedText id="0e7155936917" />
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="destructive"
              onClick={reset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <LocalizedText id="cef2fe093b68" leading={""} trailing={"\n            "} /></Button>
            
            <Button
              variant="outline"
              asChild
            >
              <Link href="/dashboard" className="gap-2">
                <Home className="h-4 w-4" />
                <LocalizedText id="f7b5bf8cef8e" leading={""} trailing={"\n              "} /></Link>
            </Button>
          </div>
          
          {error.digest && (
            <p className="text-xs text-muted-foreground text-center">
              <LocalizedText id="013173f56453" leading={""} trailing={" "} />{error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
