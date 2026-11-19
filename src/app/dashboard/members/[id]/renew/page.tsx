"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: string;
}

interface MemberSummary {
  id: string;
  name: string;
  phone: string;
  Membership: Array<{
    id: string;
    endDate: string;
    Plan: { id: string; name: string; price: string };
  }>;
}

export default function MemberRenewPage() {
  const tStatic = useStaticUiTranslations("static");
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    planId: "",
    amount: "",
    paymentMethod: "UPI" as PaymentMethod,
    paymentDate: new Date().toISOString().split("T")[0],
    reference: "",
    packageDuration: "1 Month Renewal",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${memberId}`).then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
    ])
      .then(([memberRes, plansData]) => {
        const data = memberRes.data ?? memberRes;
        setMember(data);
        setPlans(plansData);
        const current = data.Membership?.[0];
        if (current) {
          setForm((f) => ({
            ...f,
            planId: current.Plan.id,
            amount: current.Plan.price,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setForm({
      ...form,
      planId,
      amount: plan ? plan.price : form.amount,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.planId || !form.amount) {
      toast.error(tStatic("33ae70bc501d"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          planId: form.planId,
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          paymentDate: form.paymentDate,
          reference: form.reference || null,
          packageDuration: form.packageDuration,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(tStatic("ed4dfada4187"));
        router.push(`/dashboard/members/${memberId}`);
      } else {
        toast.error(data.error || data.message || tStatic("4d64ea46eb9f"));
      }
    } catch {
      toast.error(tStatic("4d64ea46eb9f"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return <p className="text-muted-foreground"><LocalizedText id="950a9a80ddbc" leading={""} trailing={""} /></p>;
  }

  const currentMembership = member.Membership?.[0];

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/dashboard/members/${memberId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <LocalizedText id="5c6f6415aeb8" leading={""} trailing={"\n      "} /></Link>

      <DashboardPageHeader
        title={`Renew — ${member.name}`}
        description={member.phone}
      />

      {currentMembership && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium"><LocalizedText id="8c0491c21c1c" leading={""} trailing={" "} />{currentMembership.Plan.name}</p>
          <p className="text-muted-foreground">
            <LocalizedText id="a99be3da0c9d" leading={""} trailing={" "} />{formatDate(currentMembership.endDate)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="bf511b25e352" leading={""} trailing={""} /></label>
          <SelectNative
            required
            value={form.planId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value=""><LocalizedText id="4e6b8148c65a" leading={""} trailing={""} /></option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)}
              </option>
            ))}
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="76aa32f20786" leading={""} trailing={""} /></label>
          <Input
            type="number"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="39d6f7487756" leading={""} trailing={""} /></label>
          <Input
            type="date"
            required
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="10782991b3b7" leading={""} trailing={""} /></label>
          <SelectNative
            required
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="d8489a634dcd" leading={""} trailing={""} /></label>
          <SelectNative
            value={form.packageDuration}
            onChange={(e) => setForm({ ...form, packageDuration: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="1 Month Renewal"><LocalizedText id="d2ba7e625ee1" leading={""} trailing={""} /></option>
            <option value="3 Months"><LocalizedText id="8ce49e113d27" leading={""} trailing={""} /></option>
            <option value="6 Months"><LocalizedText id="422c023cc898" leading={""} trailing={""} /></option>
            <option value="12 Months"><LocalizedText id="2de83657ffcd" leading={""} trailing={""} /></option>
          </SelectNative>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="db1c784524e1" leading={""} trailing={""} /></label>
          <Input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder={tStatic("a26f5d7fd698")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1"><LocalizedText id="70440046a3dc" leading={""} trailing={""} /></label>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <LocalizedText id="1756e430c918" leading={""} trailing={"\n        "} /></Button>
      </form>
    </div>
  );
}
