'use client';

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { ListOrdered, IndianRupee, CircleCheck, CircleDollarSign, Loader2 } from "lucide-react";
import { TrainerLeaderboard } from "@/components/trainers/TrainerLeaderboard";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-trainers");

interface Commission {
  id: string;
  amount: number;
  commissionRate: number;
  baseAmount: number;
  month: number;
  year: number;
  isPaid: boolean;
  paidDate: string | null;
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  member: {
    id: string;
    name: string;
    phone: string;
  };
}

interface CommissionSummary {
  totalCommissions: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export default function TrainersPage() {
  const tStatic = useStaticUiTranslations("static");
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [payingCommissionId, setPayingCommissionId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  useEffect(() => {
    fetchCommissions();
  }, [selectedMonth, selectedYear, filterPaid]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth.toString());
      if (selectedYear) params.append('year', selectedYear.toString());
      if (filterPaid !== 'all') params.append('isPaid', filterPaid);

      const response = await fetch(`/api/trainers/commissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch commissions');
      
      const data = await response.json();
      setCommissions(data.commissions);
      setSummary(data.summary);
    } catch (error) {
      logger.error('Error fetching commissions:', error as Error);
      alert('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (commissionId: string) => {
    enqueueAction(`mark-commission-paid:${commissionId}`, async () => {
      setPayingCommissionId(commissionId);
      try {
        const response = await fetch('/api/trainers/commissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionId, isPaid: true }),
        });

        if (!response.ok) throw new Error(tStatic("acbdefeac130"));

        await fetchCommissions();
      } catch (error) {
        logger.error('Error marking commission as paid:', error as Error);
        alert('Failed to mark commission as paid');
      } finally {
        setPayingCommissionId((current) => (current === commissionId ? null : current));
      }
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={tStatic("f98a76358a6c")}
        description={tStatic("7b6317a54673")}
      />

      <TrainerLeaderboard />

      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={tStatic("d798682bf464")}
            value={String(summary.totalCommissions)}
            icon={ListOrdered}
          />
          <StatCard
            title={tStatic("c1ed4a16a573")}
            value={`₹${summary.totalAmount.toFixed(2)}`}
            icon={IndianRupee}
          />
          <StatCard
            title={tStatic("e59cf18ca3c7")}
            value={`₹${summary.paidAmount.toFixed(2)}`}
            icon={CircleCheck}
            variant="success"
          />
          <StatCard
            title={tStatic("8df166bacee9")}
            value={`₹${summary.unpaidAmount.toFixed(2)}`}
            icon={CircleDollarSign}
            variant="warning"
          />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2"><LocalizedText id="082bc378cd60" leading={""} trailing={""} /></label>
            <SelectNative
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value=""><LocalizedText id="be46153ca650" leading={""} trailing={""} /></option>
              {monthNames.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2"><LocalizedText id="879e32326c52" leading={""} trailing={""} /></label>
            <SelectNative
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value=""><LocalizedText id="6d76b811f72c" leading={""} trailing={""} /></option>
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2"><LocalizedText id="584e977886e7" leading={""} trailing={""} /></label>
            <SelectNative
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all"><LocalizedText id="6a72085653e4" leading={""} trailing={""} /></option>
              <option value="true"><LocalizedText id="dc9d4584a554" leading={""} trailing={""} /></option>
              <option value="false"><LocalizedText id="50cc12f69e8f" leading={""} trailing={""} /></option>
            </SelectNative>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchCommissions} className="w-full">
              <LocalizedText id="926161d3e620" leading={""} trailing={"\n            "} /></Button>
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="63deca910cbd" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="6853c98a6f43" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="170a28a9db6d" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="5161dd09b67e" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="3a9c736b3175" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="4bfc46bc9213" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="bae7d5be7082" leading={""} trailing={""} /></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="c3cd636a585b" leading={""} trailing={""} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                  <LocalizedText id="b04ba49f8486" leading={""} trailing={"\n                "} /></td>
              </tr>
            ) : commissions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                  <LocalizedText id="08fd3530fc3d" leading={""} trailing={"\n                "} /></td>
              </tr>
            ) : (
              commissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-muted">
                  <td className="px-6 py-4">
                    <div className="font-medium">{commission.trainer.name}</div>
                    <div className="text-sm text-muted-foreground">{commission.trainer.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{commission.member.name}</div>
                    <div className="text-sm text-muted-foreground">{commission.member.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    {monthNames[commission.month - 1]} {commission.year}
                  </td>
                  <td className="px-6 py-4">₹{commission.baseAmount.toFixed(2)}</td>
                  <td className="px-6 py-4">{commission.commissionRate}%</td>
                  <td className="px-6 py-4 font-bold">₹{commission.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {commission.isPaid ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <LocalizedText id="dc9d4584a554" leading={""} trailing={"\n                      "} /></span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        <LocalizedText id="50cc12f69e8f" leading={""} trailing={"\n                      "} /></span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!commission.isPaid && (
                      <Button
                        onClick={() => markAsPaid(commission.id)}
                        disabled={isQueued(`mark-commission-paid:${commission.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {payingCommissionId === commission.id || isQueued(`mark-commission-paid:${commission.id}`) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <LocalizedText id="272bc02ec508" leading={""} trailing={"\n                          "} /></span>
                        ) : (
                          tStatic("40aead30adb4")
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
