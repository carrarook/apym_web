"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState } from "react";
import { FileText, Search, Filter, Eye, Download, MessageSquare, Send, Loader2, Bell } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import {
  WHATSAPP_BUSINESS_LABEL,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { useActionQueue } from "@/hooks/use-action-queue";
import {
  type BillListItem,
  useBillsList,
  usePaymentsNotSent,
  useRenewalReminderCandidates,
} from "@/hooks/use-bills-list";

interface Bill extends BillListItem {}

function billMember(bill: Bill) {
  return bill.member ?? bill.Member;
}

function billGeneratedBy(bill: Bill) {
  return bill.generatedBy ?? bill.User;
}

interface PaymentNotSent {
  id: string;
  amount: string;
  method: string;
  receivedAt: string;
  packageDuration: string | null;
  Member: { id: string; name: string; phone: string; externalId: string | null };
  User: { name: string };
}

interface RenewalCandidate {
  id: string;
  name: string;
  phone: string;
  nextRenewalDate: string | null;
}

export default function BillsPage() {
  const tStatic = useStaticUiTranslations("static");
  const [activeTab, setActiveTab] = useState("bills");
  const { bills, billsLoading: loading, mutateBills } = useBillsList();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("ALL");

  const { paymentsNotSent, paymentsLoading, mutatePaymentsNotSent } = usePaymentsNotSent(
    activeTab === "not-sent",
  );

  const [reminderLookback, setReminderLookback] = useState("30");
  const [reminderFromDate, setReminderFromDate] = useState("");
  const { dueIn7Days, dueIn3Days, remindersLoading, mutateReminderCandidates } =
    useRenewalReminderCandidates(activeTab === "reminders", reminderLookback, reminderFromDate);

  const [sendingBillId, setSendingBillId] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { enqueueAction, isQueued } = useActionQueue();

  const sendBill = async (paymentId: string) => {
    enqueueAction(`send-bill:${paymentId}`, async () => {
      setSendingBillId(paymentId);
      try {
        const res = await fetch(`/api/payments/${paymentId}/send-bill`, { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          await mutatePaymentsNotSent();
        } else {
          alert(data.error || data.message || "Failed to send bill");
        }
      } catch (e) {
        alert("Failed to send bill");
      } finally {
        setSendingBillId((current) => (current === paymentId ? null : current));
      }
    });
  };

  const sendBulkReminders = async (memberIds: string[]) => {
    if (memberIds.length === 0) return;
    if (!confirm(`Send renewal reminders to ${memberIds.length} member(s)?`)) return;
    enqueueAction("send-bulk-renewal-reminders", async () => {
      setSendingReminders(true);
      try {
        const res = await fetch("/api/renewals/send-bulk-reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Sent: ${data.sent}, Failed: ${data.failed}`);
          await mutateReminderCandidates();
        } else {
          alert(data.error || "Failed to send reminders");
        }
      } finally {
        setSendingReminders(false);
      }
    });
  };

  const filteredBills = bills.filter((bill) => {
    const m = billMember(bill);
    if (!m) return false;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.externalId && m.externalId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProgram = filterProgram === "ALL" || bill.programType === filterProgram;

    return matchesSearch && matchesProgram;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ISSUED: "bg-blue-100 text-blue-800 border-blue-200",
      PARTIALLY_PAID: "bg-amber-100 text-amber-800 border-amber-200",
      PAID: "bg-green-100 text-green-800 border-green-200",
      OVERDUE: "bg-red-100 text-red-800 border-red-200",
      CANCELLED: "bg-muted text-muted-foreground border-border",
    };
    return styles[status] || styles.ISSUED;
  };

  const getProgramBadge = (program: string) => {
    const styles = {
      MAINTENANCE: "bg-blue-100 text-blue-800 border-blue-200",
      BODYBUILDING: "bg-purple-100 text-purple-800 border-purple-200",
      WEIGHT_LOSS: "bg-green-100 text-green-800 border-green-200",
    };
    return styles[program as keyof typeof styles] || styles.MAINTENANCE;
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("2ea2406a47b0")}
        description={tStatic("502f6f4aa295")}
        actions={
          <>
            <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/bills/whatsapp">
                <MessageSquare className="h-4 w-4" />
                {WHATSAPP_BUSINESS_LABEL} <LocalizedText id="17f3467db103" leading={""} trailing={"\n              "} /></Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/bills/generate">
                <FileText className="h-4 w-4" />
                <LocalizedText id="ab55f0db928d" leading={""} trailing={"\n              "} /></Link>
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="bills"><LocalizedText id="815465782c33" leading={""} trailing={""} /></TabsTrigger>
          <TabsTrigger value="not-sent"><LocalizedText id="22e5442a3a86" leading={""} trailing={""} /></TabsTrigger>
          <TabsTrigger value="reminders"><LocalizedText id="fffce63b9fe6" leading={""} trailing={""} /></TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-2xl shadow-lg p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tStatic("6bd51bfb07b3")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 bg-background text-foreground font-medium"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <SelectNative
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 bg-background text-foreground font-medium appearance-none"
            >
              <option value="ALL"><LocalizedText id="4c90d2aaa896" leading={""} trailing={""} /></option>
              <option value="MAINTENANCE"><LocalizedText id="94de303bbef8" leading={""} trailing={""} /></option>
              <option value="BODYBUILDING"><LocalizedText id="f714c474680a" leading={""} trailing={""} /></option>
              <option value="WEIGHT_LOSS"><LocalizedText id="a63eb5b5e3f1" leading={""} trailing={""} /></option>
            </SelectNative>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1"><LocalizedText id="db42991e5feb" leading={""} trailing={""} /></p>
          <p className="text-2xl font-bold text-card-foreground">{bills.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1"><LocalizedText id="94de303bbef8" leading={""} trailing={""} /></p>
          <p className="text-2xl font-bold text-blue-600">
            {bills.filter((b) => b.programType === "MAINTENANCE").length}
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1"><LocalizedText id="f714c474680a" leading={""} trailing={""} /></p>
          <p className="text-2xl font-bold text-purple-600">
            {bills.filter((b) => b.programType === "BODYBUILDING").length}
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1"><LocalizedText id="a63eb5b5e3f1" leading={""} trailing={""} /></p>
          <p className="text-2xl font-bold text-green-600">
            {bills.filter((b) => b.programType === "WEIGHT_LOSS").length}
          </p>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-medium"><LocalizedText id="b166c74f2282" leading={""} trailing={""} /></div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-medium">
            {searchTerm || filterProgram !== "ALL" ? tStatic("fe576fd7fe7e") : tStatic("74bf26646df5")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="40c9c8b23254" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="6853c98a6f43" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="9d68007b0763" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="082bc378cd60" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="43dc8532f7e5" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="bae7d5be7082" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="dc9d4584a554" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="145caf292855" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="dbc5c52e0738" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="8eefdd52ad2d" leading={""} trailing={"\n                  "} /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    <LocalizedText id="c3cd636a585b" leading={""} trailing={"\n                  "} /></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredBills.map((bill) => {
                  const m = billMember(bill);
                  const gen = billGeneratedBy(bill);
                  return (
                  <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-semibold text-foreground">
                        {bill.billNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground">{m?.name}</div>
                      <div className="text-xs text-muted-foreground font-medium">{m?.phone}</div>
                      {m?.externalId && (
                        <div className="text-xs text-muted-foreground font-mono">{m.externalId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getProgramBadge(
                          bill.programType
                        )}`}
                      >
                        {bill.programType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground">{bill.month}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bill.hideAmount ? (
                        <span className="text-sm text-muted-foreground italic"><LocalizedText id="d4c2792a7245" leading={""} trailing={""} /></span>
                      ) : (
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(Number(bill.amount))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadge(bill.status)}`}>
                        {bill.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      {formatCurrency(Number(bill.paidAmount ?? 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                      {formatCurrency(Number(bill.dueAmount ?? 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(bill.validFrom)} - {formatDate(bill.validTo)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-muted-foreground">{formatDate(bill.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">{gen?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/bills/${bill.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors p-2 hover:bg-blue-50 rounded-lg"
                          title={tStatic("38e8e7f2479d")}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Button
                          type="button"
                          onClick={() => window.open(`/api/bills/${bill.id}/pdf`, "_blank")}
                          className="text-purple-600 hover:text-purple-700 font-semibold transition-colors p-2 hover:bg-purple-50 rounded-lg"
                          title={tStatic("98e5ef062b2a")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => window.open(`/dashboard/bills/${bill.id}/print`, "_blank")}
                          className="text-green-600 hover:text-green-700 font-semibold transition-colors p-2 hover:bg-green-50 rounded-lg"
                          title={tStatic("30706866e7d7")}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="not-sent" className="space-y-4">
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold"><LocalizedText id="5c49c0580d36" leading={""} trailing={""} /></h3>
              <p className="text-xs text-muted-foreground mt-0.5"><LocalizedText id="a4e426fb3bb2" leading={""} trailing={" "} />{WHATSAPP_BUSINESS_LABEL} <LocalizedText id="f30196667cc9" leading={""} trailing={""} /></p>
            </div>
            {paymentsLoading ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
            ) : paymentsNotSent.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground"><LocalizedText id="25b7a93aa227" leading={""} trailing={""} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase"><LocalizedText id="eb9a4bc1c0c1" leading={""} trailing={""} /></th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase"><LocalizedText id="6853c98a6f43" leading={""} trailing={""} /></th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase"><LocalizedText id="43dc8532f7e5" leading={""} trailing={""} /></th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase"><LocalizedText id="3deb74565196" leading={""} trailing={""} /></th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase"><LocalizedText id="97c89a4d6630" leading={""} trailing={""} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymentsNotSent.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">{formatDate(p.receivedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{p.Member.name}</div>
                          <div className="text-xs text-muted-foreground">{p.Member.phone}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(Number(p.amount))}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                            {p.packageDuration || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            onClick={() => sendBill(p.id)}
                            disabled={isQueued(`send-bill:${p.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {sendingBillId === p.id || isQueued(`send-bill:${p.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            <LocalizedText id="2f26202f0f01" leading={""} trailing={"\n                          "} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <div className="bg-card rounded-2xl shadow-lg p-4 border border-border">
            <h3 className="font-semibold mb-3"><LocalizedText id="d74bd8281cdf" leading={""} trailing={""} /></h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1"><LocalizedText id="423b1895a606" leading={""} trailing={""} /></label>
                <SelectNative
                  value={reminderLookback}
                  onChange={(e) => { setReminderLookback(e.target.value); setReminderFromDate(""); }}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="30"><LocalizedText id="7d4278a87590" leading={""} trailing={""} /></option>
                  <option value="45"><LocalizedText id="6e26ebb4f40e" leading={""} trailing={""} /></option>
                  <option value="60"><LocalizedText id="46be8e49c50b" leading={""} trailing={""} /></option>
                  <option value="90"><LocalizedText id="170621ac0842" leading={""} trailing={""} /></option>
                </SelectNative>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1"><LocalizedText id="07e707d42be6" leading={""} trailing={""} /></label>
                <Input
                  type="date"
                  value={reminderFromDate}
                  onChange={(e) => { setReminderFromDate(e.target.value); setReminderLookback("30"); }}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => mutateReminderCandidates()}
                disabled={remindersLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {remindersLoading ? tStatic("b04ba49f8486") : tStatic("56e3badc4e6c")}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 border-b flex items-center justify-between">
                <h4 className="font-semibold"><LocalizedText id="747b7307660e" leading={""} trailing={""} />{dueIn7Days.length})</h4>
                <Button
                  type="button"
                  onClick={() => sendBulkReminders(dueIn7Days.map((m) => m.id))}
                  disabled={dueIn7Days.length === 0 || sendingReminders || isQueued("send-bulk-renewal-reminders")}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  <LocalizedText id="8bc6132233d5" leading={""} trailing={"\n                "} /></Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {dueIn7Days.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground"><LocalizedText id="6eef6648406c" leading={""} trailing={""} /></div>
                ) : (
                  <ul className="divide-y divide-border">
                    {dueIn7Days.map((m) => (
                      <li key={m.id} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground block">{m.phone}</span>
                        </div>
                        <span className="text-xs">{m.nextRenewalDate ? formatDate(m.nextRenewalDate) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              <div className="px-4 py-3 bg-red-100 dark:bg-red-900/30 border-b flex items-center justify-between">
                <h4 className="font-semibold"><LocalizedText id="53c5ef34cb15" leading={""} trailing={""} />{dueIn3Days.length})</h4>
                <Button
                  type="button"
                  onClick={() => sendBulkReminders(dueIn3Days.map((m) => m.id))}
                  disabled={dueIn3Days.length === 0 || sendingReminders || isQueued("send-bulk-renewal-reminders")}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  <LocalizedText id="8bc6132233d5" leading={""} trailing={"\n                "} /></Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {dueIn3Days.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground"><LocalizedText id="6eef6648406c" leading={""} trailing={""} /></div>
                ) : (
                  <ul className="divide-y divide-border">
                    {dueIn3Days.map((m) => (
                      <li key={m.id} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground block">{m.phone}</span>
                        </div>
                        <span className="text-xs">{m.nextRenewalDate ? formatDate(m.nextRenewalDate) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {WHATSAPP_SETUP_HINT}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
