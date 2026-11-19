"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { triggerMemberUpdate } from "@/lib/sidebar-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";

const logger = createLogger("dashboard-members");

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: string;
  description: string | null;
}

export default function NewMemberPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><LocalizedText id="33ce417454bf" leading={""} trailing={""} /></div>}>
      <NewMemberForm />
    </Suspense>
  );
}

function NewMemberForm() {
  const tStatic = useStaticUiTranslations("static");
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "UPI",
    paymentReference: "",
    // Payment details
    packageDuration: "",
    isPersonalTrainer: false,
    friendsFamilyDiscount: false,
    monthlyRate: "",
    studentOrGymfloPlan: false,
    specialOccasion: "",
    // Admission fees (default values from March 10, 2026)
    admissionFee: "800",
    personalTrainingFee: "0",
  });

  useEffect(() => {
    fetchPlans();
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    if (name || phone) {
      setFormData((prev) => ({
        ...prev,
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
      }));
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      logger.error("Error fetching plans:", error as Error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        const created = result?.data ?? result;
        if (leadId) {
          await fetch(`/api/leads/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONVERTED", convertedMemberId: created.id }),
          }).catch(() => {});
        }
        triggerMemberUpdate();
        router.push(`/dashboard/members/${created.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create member");
      }
    } catch (error) {
      logger.error("Error creating member:", error as Error);
      alert("Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setFormData({ ...formData, planId });
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setFormData((prev) => ({ ...prev, planId, amount: plan.price }));
    }
  };

  const handlePersonalTrainerChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isPersonalTrainer: checked,
      personalTrainingFee: checked ? "2000" : "0",
    });
  };

  const calculateTotalAmount = () => {
    const planAmount = parseFloat(formData.amount) || 0;
    const admissionFee = parseFloat(formData.admissionFee) || 0;
    const ptFee = parseFloat(formData.personalTrainingFee) || 0;
    return planAmount + admissionFee + ptFee;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/members"
          className="p-2 hover:bg-muted100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground"><LocalizedText id="4883ed80ea67" leading={""} trailing={""} /></h1>
          <p className="text-sm text-muted-foreground mt-1">
            <LocalizedText id="99c37e570581" leading={""} trailing={"\n          "} /></p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            <LocalizedText id="ad12e4228ccc" leading={""} trailing={"\n          "} /></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="0756876bdffa" leading={""} trailing={"\n              "} /></label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="b94477dde32d" leading={""} trailing={"\n              "} /></label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="8a754c61c2ce" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value=""><LocalizedText id="e90701121015" leading={""} trailing={""} /></option>
                <option value="MALE"><LocalizedText id="3f3a489c72de" leading={""} trailing={""} /></option>
                <option value="FEMALE"><LocalizedText id="b7c17e97d3d6" leading={""} trailing={""} /></option>
                <option value="OTHER"><LocalizedText id="6e6a6f2086bb" leading={""} trailing={""} /></option>
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="133160594d08" leading={""} trailing={"\n              "} /></label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="0d16c6e19d1f" leading={""} trailing={"\n              "} /></label>
              <Input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="d70f93df5e8f" leading={""} trailing={"\n              "} /></label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder={tStatic("9f8ce19bf4d3")}
              />
            </div>
          </div>
        </div>

        {/* Membership Plan */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            <LocalizedText id="2488c6e101dc" leading={""} trailing={"\n          "} /></h2>
          <p className="text-sm text-muted-foreground mb-4">
            <LocalizedText id="8f2c7dfd0ac7" leading={""} trailing={"\n          "} /></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="b56bda81cd03" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value=""><LocalizedText id="4550f6847923" leading={""} trailing={""} /></option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.price} ({plan.durationDays} <LocalizedText id="8d77a9d1d747" leading={""} trailing={"\n                  "} /></option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="b1b2ce91c411" leading={""} trailing={"\n              "} /></label>
              <Input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="42b63a3589cd" leading={""} trailing={"\n              "} /></label>
              <Input
                type="number"
                required
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="64d436e7b7bb" leading={""} trailing={"\n              "} /></label>
              <Input
                type="number"
                required
                value={formData.admissionFee}
                onChange={(e) =>
                  setFormData({ ...formData, admissionFee: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="800"
              />
              <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="b6d634e05ab2" leading={""} trailing={""} /></p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="a75efcb836b7" leading={""} trailing={"\n              "} /></label>
              <Input
                type="number"
                value={formData.personalTrainingFee}
                onChange={(e) =>
                  setFormData({ ...formData, personalTrainingFee: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="0"
                disabled={!formData.isPersonalTrainer}
              />
              <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="e2f8e203793d" leading={""} trailing={""} /></p>
            </div>

            <div className="md:col-span-2">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground"><LocalizedText id="a10e91c4da14" leading={""} trailing={""} /></span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{calculateTotalAmount().toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span><LocalizedText id="9b330e2cf924" leading={""} trailing={""} /></span>
                    <span>₹{(parseFloat(formData.amount) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span><LocalizedText id="2c723f87f31d" leading={""} trailing={""} /></span>
                    <span>₹{(parseFloat(formData.admissionFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {formData.isPersonalTrainer && (
                    <div className="flex justify-between">
                      <span><LocalizedText id="66e036e1e173" leading={""} trailing={""} /></span>
                      <span>₹{(parseFloat(formData.personalTrainingFee) || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="e9b0f1740a19" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                required
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="UPI"><LocalizedText id="f295b2cdffa2" leading={""} trailing={""} /></option>
                <option value="CASH"><LocalizedText id="758ec54e430e" leading={""} trailing={""} /></option>
                <option value="CARD"><LocalizedText id="4d4ce73b1566" leading={""} trailing={""} /></option>
                <option value="BANK_TRANSFER"><LocalizedText id="17ef50d8f8df" leading={""} trailing={""} /></option>
                <option value="OTHER"><LocalizedText id="6e6a6f2086bb" leading={""} trailing={""} /></option>
              </SelectNative>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="4d5234500b42" leading={""} trailing={"\n              "} /></label>
              <Input
                type="text"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({ ...formData, paymentReference: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder={tStatic("ea0da13d77cd")}
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            <LocalizedText id="b8579d99f2d2" leading={""} trailing={"\n          "} /></h2>
          <p className="text-sm text-muted-foreground mb-4">
            <LocalizedText id="0eb92e604d11" leading={""} trailing={"\n          "} /></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <LocalizedText id="aab68aebf49b" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.packageDuration}
                onChange={(e) =>
                  setFormData({ ...formData, packageDuration: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value=""><LocalizedText id="f802e794dc1b" leading={""} trailing={""} /></option>
                <option value="monthly"><LocalizedText id="d31edb7b8a94" leading={""} trailing={""} /></option>
                <option value="3 months"><LocalizedText id="8ce49e113d27" leading={""} trailing={""} /></option>
                <option value="6 months"><LocalizedText id="422c023cc898" leading={""} trailing={""} /></option>
                <option value="yearly"><LocalizedText id="7622eb5aa42d" leading={""} trailing={""} /></option>
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <LocalizedText id="475f3e62b6b4" leading={""} trailing={"\n              "} /></label>
              <Input
                type="number"
                value={formData.monthlyRate}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyRate: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                placeholder="e.g., 699, 799"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <LocalizedText id="805e3a04bf6c" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.specialOccasion}
                onChange={(e) =>
                  setFormData({ ...formData, specialOccasion: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value=""><LocalizedText id="6eef6648406c" leading={""} trailing={""} /></option>
                <option value="Durga Puja"><LocalizedText id="af3e6ceaf24e" leading={""} trailing={""} /></option>
                <option value="Kartik Puja"><LocalizedText id="4e3f40c5e0cd" leading={""} trailing={""} /></option>
                <option value="Valentine's Day"><LocalizedText id="d7680478ec3b" leading={""} trailing={""} /></option>
                <option value="Women's Day"><LocalizedText id="6ff66f57d5d5" leading={""} trailing={""} /></option>
                <option value="Winter Offer"><LocalizedText id="c53d673d072e" leading={""} trailing={""} /></option>
              </SelectNative>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                <LocalizedText id="c313de6babf3" leading={""} trailing={"\n              "} /></label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.isPersonalTrainer}
                    onChange={(e) => handlePersonalTrainerChange(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium">
                    <LocalizedText id="cf53e359da9d" leading={""} trailing={"\n                  "} /></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.friendsFamilyDiscount}
                    onChange={(e) =>
                      setFormData({ ...formData, friendsFamilyDiscount: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium"><LocalizedText id="9e925d338065" leading={""} trailing={""} /></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput
                    checked={formData.studentOrGymfloPlan}
                    onChange={(e) =>
                      setFormData({ ...formData, studentOrGymfloPlan: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-input text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-foreground font-medium"><LocalizedText id="e9bacf5594f2" leading={""} trailing={""} /></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/members"
            className="px-6 py-2.5 border border-border rounded-xl hover:bg-muted transition-all duration-200 font-semibold"
          >
            <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n          "} /></Link>
          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold active:scale-[0.98]"
          >
            {loading ? tStatic("28ea7667d026") : tStatic("c0c84e103846")}
          </Button>
        </div>
      </form>
    </div>
  );
}
