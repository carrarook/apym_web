"use client";

import { LocalizedText } from "@/components/i18n/localized-text";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MemberDetailData } from "./member-detail-types";

export function MemberPaymentHistory({
  memberId,
  payments,
}: {
  memberId: string;
  payments: MemberDetailData["Payment"];
}) {
  return (
    <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground"><LocalizedText id="cfeba0312293" leading={""} trailing={""} /></h2>
        <Link
          href="/dashboard/payments"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <CreditCard className="h-4 w-4" />
          <LocalizedText id="b5118402d0e2" leading={""} trailing={"\n        "} /></Link>
      </div>
      <div className="overflow-x-auto">
        {!payments?.length ? (
          <p className="p-12 text-center text-muted-foreground"><LocalizedText id="fbd5a11c2553" leading={""} trailing={""} /></p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"><LocalizedText id="eb9a4bc1c0c1" leading={""} trailing={""} /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"><LocalizedText id="43dc8532f7e5" leading={""} trailing={""} /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"><LocalizedText id="88306943fea7" leading={""} trailing={""} /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"><LocalizedText id="db1c784524e1" leading={""} trailing={""} /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase"><LocalizedText id="f84f73c618d9" leading={""} trailing={""} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm">{formatDate(payment.receivedAt)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 text-sm">{payment.method}</td>
                  <td className="px-6 py-4 text-sm">{payment.reference || "—"}</td>
                  <td className="px-6 py-4 text-sm">{payment.User.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
