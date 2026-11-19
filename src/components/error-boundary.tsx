"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

const logger = createLogger("app");

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    // TODO: Send to error tracking service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border border-destructive/20 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-destructive/10 rounded-full p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                <LocalizedText id="8d886c0ba6f2" leading={""} trailing={"\n              "} /></h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error ? <LocalizedText id="0e7155936917" /> : null}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <LocalizedText id="cef2fe093b68" leading={""} trailing={"\n            "} /></Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
