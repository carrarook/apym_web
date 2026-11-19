"use client";

import { useLocale as useIntlLocale, useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { STATIC_UI_KEYS } from "@/lib/i18n/static-keys";

const logger = createLogger("dashboard-bills");

interface Member {
  id: string;
  name: string;
  phone: string;
  externalId: string | null;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

const PROGRAM_TYPES = [
  { value: "MAINTENANCE", label: "Maintenance", description: "General fitness and health maintenance" },
  { value: "BODYBUILDING", label: "Bodybuilding", description: "Muscle building and strength training" },
  { value: "WEIGHT_LOSS", label: "Weight Loss", description: "Fat loss and cardio-focused program" },
];

const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

export default function GenerateBillPage() {
  const tStatic = useStaticUiTranslations("static");
  const locale = useIntlLocale();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    programType: "MAINTENANCE",
    paymentMethod: "UPI",
    amount: "",
    month: MONTHS[new Date().getMonth()],
    validFrom: new Date().toISOString().split("T")[0],
    validTo: "",
    nextPaymentDate: "",
    hideAmount: false,
    notes: "",
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    // Auto-calculate validTo based on validFrom (30 days)
    if (formData.validFrom) {
      const from = new Date(formData.validFrom);
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      
      const nextPayment = new Date(to);
      nextPayment.setDate(nextPayment.getDate() + 1);
      
      setFormData(prev => ({
        ...prev,
        validTo: to.toISOString().split("T")[0],
        nextPaymentDate: nextPayment.toISOString().split("T")[0],
      }));
    }
  }, [formData.validFrom]);

  const searchMembers = async () => {
    try {
      setSearching(true);
      const response = await fetch(`/api/members?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || data);
      }
    } catch (error) {
      logger.error("Error searching members:", error as Error);
    } finally {
      setSearching(false);
    }
  };

  const validateForm = () => {
    const missing: string[] = [];
    
    if (!selectedMember) missing.push("Member");
    if (!formData.programType) missing.push("Program Type");
    if (!formData.paymentMethod) missing.push("Payment Method");
    if (!formData.hideAmount && !formData.amount) missing.push("Amount");
    if (!formData.month) missing.push("Month");
    if (!formData.validFrom) missing.push("Valid From Date");
    if (!formData.validTo) missing.push("Valid To Date");
    
    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: selectedMember?.id,
          programType: formData.programType,
          paymentMethod: formData.paymentMethod,
          amount: formData.hideAmount ? null : parseFloat(formData.amount),
          month: formData.month,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          nextPaymentDate: formData.nextPaymentDate || null,
          hideAmount: formData.hideAmount,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/bills/${data.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to generate bill");
      }
    } catch (error) {
      logger.error("Error generating bill:", error as Error);
      alert("Failed to generate bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/bills"
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            <LocalizedText id="c654781aecf5" leading={""} trailing={"\n          "} /></h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            <LocalizedText id="8a20825f551f" leading={""} trailing={"\n          "} /></p>
        </div>
      </div>

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900"><LocalizedText id="2cabe4715fb4" leading={""} trailing={""} /></p>
            <p className="text-sm text-red-700 mt-1">
              <LocalizedText id="46cdb08dd2a6" leading={""} trailing={" "} />{missingFields.map((field) => tStatic(STATIC_UI_KEYS[field])).join(", ")}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Selection */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4"><LocalizedText id="1cdce95ccdbc" leading={""} trailing={""} /></h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="4c4b65f65460" leading={""} trailing={"\n              "} /></label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tStatic("6d902248f0d9")}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                disabled={!!selectedMember}
              />
              {searching && (
                <p className="text-sm text-muted-foreground mt-2"><LocalizedText id="ba2b5a5fc869" leading={""} trailing={""} /></p>
              )}
              {!selectedMember && members.length > 0 && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {members.map((member) => (
                    <Button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setSearchTerm("");
                        setMembers([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="font-semibold text-foreground">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.phone}</div>
                      {member.externalId && (
                        <div className="text-xs text-muted-foreground font-mono">{member.externalId}</div>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                    {selectedMember.externalId && (
                      <p className="text-xs text-muted-foreground font-mono">{selectedMember.externalId}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <LocalizedText id="64fbd995d3b6" leading={""} trailing={"\n                  "} /></Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Program & Payment Details */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4"><LocalizedText id="61059398077c" leading={""} trailing={""} /></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="8a5add65be78" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.programType}
                onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {PROGRAM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {tStatic(STATIC_UI_KEYS[type.label])}
                  </option>
                ))}
              </SelectNative>
              <p className="text-xs text-muted-foreground mt-1">
                {tStatic(STATIC_UI_KEYS[PROGRAM_TYPES.find((t) => t.value === formData.programType)?.description ?? ""])}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="e9b0f1740a19" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {tStatic(STATIC_UI_KEYS[method.label])}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="43dc8532f7e5" leading={""} trailing={" "} />{!formData.hideAmount && "*"}
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={formData.hideAmount}
                placeholder={tStatic("01f20462f88e")}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="3288785758ec" leading={""} trailing={"\n              "} /></label>
              <SelectNative
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {new Date(2026, MONTHS.indexOf(month), 1).toLocaleDateString(locale, { month: "long" }).toLocaleUpperCase(locale)}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <CheckboxInput
                  checked={formData.hideAmount}
                  onChange={(e) => setFormData({ ...formData, hideAmount: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-foreground">
                  <LocalizedText id="b0c7aa314470" leading={""} trailing={"\n                "} /></span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                <LocalizedText id="4d44817ff269" leading={""} trailing={"\n              "} /></p>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4"><LocalizedText id="922f77237b7e" leading={""} trailing={""} /></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="47ef36b5cf17" leading={""} trailing={"\n              "} /></label>
              <Input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="efe457c2a0b9" leading={""} trailing={"\n              "} /></label>
              <Input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                <LocalizedText id="1305c34091c8" leading={""} trailing={"\n              "} /></label>
              <Input
                type="date"
                value={formData.nextPaymentDate}
                onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4"><LocalizedText id="a6886107051f" leading={""} trailing={""} /></h2>
          
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder={tStatic("e337f8d6419d")}
            className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/bills"
            className="px-6 py-3 border border-border text-foreground rounded-xl hover:bg-muted transition-all duration-200 font-semibold"
          >
            <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n          "} /></Link>
          <Button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <LocalizedText id="81362292e8ba" leading={""} trailing={"\n              "} /></>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <LocalizedText id="f8b7c84db79e" leading={""} trailing={"\n              "} /></>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
