"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createLogger } from "@/lib/logger";

const logger = createLogger("app");

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnalyticsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Analytics Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle><LocalizedText id="8061dc876199" leading={""} trailing={""} /></CardTitle>
              </div>
              <CardDescription>
                <LocalizedText id="d92c56ee7844" leading={""} trailing={"\n              "} /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-muted p-3 rounded text-sm font-mono text-muted-foreground">
                  <LocalizedText id="0e7155936917" />
                </div>
              )}
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <LocalizedText id="6e41ee3f309a" leading={""} trailing={"\n              "} /></Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
