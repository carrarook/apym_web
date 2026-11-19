"use client";


import { useTranslations as useStaticUiTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

type Tab = "overview" | "payments" | "memberships" | "insights" | "comms";

export function MemberDetailTabs({
  overview,
  payments,
  memberships,
  insights,
  comms,
}: {
  overview: ReactNode;
  payments: ReactNode;
  memberships: ReactNode;
  insights: ReactNode;
  comms: ReactNode;
}) {
  const tStatic = useStaticUiTranslations("static");
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: tStatic("0efc2e6be4c2") },
    { id: "payments", label: tStatic("44357ae55a21") },
    { id: "memberships", label: tStatic("e351fc50739c") },
    { id: "insights", label: tStatic("b4510362a5c5") },
    { id: "comms", label: tStatic("9eadde168192") },
  ];

  const content =
    tab === "overview"
      ? overview
      : tab === "payments"
        ? payments
        : tab === "memberships"
          ? memberships
          : tab === "insights"
            ? insights
            : comms;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content}
    </div>
  );
}
