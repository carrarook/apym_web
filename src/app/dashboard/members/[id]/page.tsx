"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Save, X, Plus, CreditCard, Calendar, AlertCircle, Pencil } from "lucide-react";
import { formatDate, formatCurrency, getDaysUntil, calculateMembershipValidity } from "@/lib/utils";
import { MemberStatus } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { MemberPaymentHistory } from "@/components/members/MemberPaymentHistory";
import { MemberMembershipHistory } from "@/components/members/MemberMembershipHistory";
import { MemberInsightsPanel } from "@/components/members/MemberInsightsPanel";
import { MemberEngagementTimeline } from "@/components/members/MemberEngagementTimeline";
import { MemberDetailTabs } from "@/components/members/MemberDetailTabs";
import { MemberPhotoCard } from "@/components/members/MemberPhotoCard";

const logger = createLogger("dashboard-members");

interface Member {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  emergencyContact: string | null;
  photo?: string | null;
  status: MemberStatus;
  joinDate: string;
  externalId: string | null;
  Membership: Array<{
    id: string;
    startDate: string;
    endDate: string;
    amount: string;
    lifecycleStatus?: string;
    previousMembershipId?: string | null;
    Plan: {
      id: string;
      name: string;
      durationDays: number;
      price: string;
    };
  }>;
  Payment: Array<{
    id: string;
    amount: string;
    method: string;
    status: string;
    reference: string | null;
    notes: string | null;
    receivedAt: string;
    User: {
      name: string;
    };
  }>;
}

export default function MemberDetailPage() {
  const tStatic = useStaticUiTranslations("static");
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fixingDate, setFixingDate] = useState<string | null>(null);
  const [dateToFix, setDateToFix] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    status: "ACTIVE" as MemberStatus,
  });

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/members/${memberId}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setMember(data);
        setFormData({
          name: data.name,
          phone: data.phone,
          gender: data.gender || "",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
          address: data.address || "",
          emergencyContact: data.emergencyContact || "",
          status: data.status,
        });
      } else {
        alert("Member not found");
        router.push("/dashboard/members");
      }
    } catch (error) {
      logger.error("Error fetching member:", error as Error);
      alert("Failed to load member details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchMember();
        setEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update member");
      }
    } catch (error) {
      logger.error("Error updating member:", error as Error);
      alert("Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const handleFixDate = async (dateType: string) => {
    if (!dateToFix) {
      alert("Please enter a date");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/members/fix-date`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          dateType,
          correctDate: dateToFix,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Date fixed successfully! ${data.message}`);
        await fetchMember();
        setFixingDate(null);
        setDateToFix("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to fix date");
      }
    } catch (error) {
      logger.error("Error fixing date:", error as Error);
      alert("Failed to fix date");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditField = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName);
    setFieldValue(currentValue || "");
  };

  const handleCancelEditField = () => {
    setEditingField(null);
    setFieldValue("");
  };

  const handleSaveField = async (fieldName: string) => {
    if (!fieldValue && fieldName !== "address" && fieldName !== "emergencyContact" && fieldName !== "dateOfBirth" && fieldName !== "gender") {
      alert("This field is required");
      return;
    }

    try {
      setSaving(true);
      const updateData: any = {};
      
      // Map field names to API field names
      const fieldMapping: Record<string, string> = {
        name: "name",
        phone: "phone",
        gender: "gender",
        dateOfBirth: "dateOfBirth",
        address: "address",
        emergencyContact: "emergencyContact",
        status: "status",
      };

      const apiFieldName = fieldMapping[fieldName] || fieldName;
      updateData[apiFieldName] = fieldValue || null;

      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchMember();
        setEditingField(null);
        setFieldValue("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update field");
      }
    } catch (error) {
      logger.error("Error updating field:", error as Error);
      alert("Failed to update field");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-green-100/80 text-green-700 border border-green-200/50",
      EXPIRED: "bg-red-100/80 text-red-700 border border-red-200/50",
    };
    return styles[status as keyof typeof styles] || styles.ACTIVE;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-medium"><LocalizedText id="b04ba49f8486" leading={""} trailing={""} /></div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  const currentMembership = member.Membership?.[0];
  const daysUntil = currentMembership ? getDaysUntil(currentMembership.endDate) : null;
  const latestPayment = member.Payment?.[0];
  const validityStatus = currentMembership 
    ? calculateMembershipValidity(
        latestPayment?.receivedAt || null,
        currentMembership.endDate
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/members"
            className="p-2 hover:bg-muted100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              {member.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              <LocalizedText id="2039fac590f2" leading={""} trailing={"\n            "} /></p>
          </div>
        </div>
        {!editing ? (
          <Button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 font-semibold active:scale-[0.98]"
          >
            <Edit2 className="h-4 w-4" />
            <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n          "} /></Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditing(false);
                fetchMember();
              }}
              className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl hover:bg-muted transition-all duration-200 font-semibold"
            >
              <X className="h-4 w-4" />
              <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n            "} /></Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              {saving ? tStatic("ae7e887517b0") : tStatic("efc007a393f6")}
            </Button>
          </div>
        )}
      </div>

      <MemberPhotoCard
        memberId={memberId}
        name={member.name}
        photo={member.photo}
        onPhotoChange={() => void fetchMember()}
      />

      {member && (
        <MemberDetailTabs
          overview={
            <p className="text-sm text-muted-foreground">
              <LocalizedText id="5b41ee73685a" leading={""} trailing={"\n            "} /></p>
          }
          payments={
            <MemberPaymentHistory memberId={memberId} payments={member.Payment} />
          }
          memberships={
            <MemberMembershipHistory memberships={member.Membership} />
          }
          insights={<MemberInsightsPanel memberId={memberId} />}
          comms={<MemberEngagementTimeline memberId={memberId} />}
        />
      )}

      {/* Member Information */}
      <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4"><LocalizedText id="1cee9a897db1" leading={""} trailing={""} /></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground">
                <LocalizedText id="64346b483c0a" leading={""} trailing={" "} />{editing && "*"}
              </label>
              {!editing && editingField !== "name" && (
                <Button
                  onClick={() => handleStartEditField("name", member.name)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            ) : editingField === "name" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  required
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                />
                <Button
                  onClick={() => handleSaveField("name")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">{member.name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground">
                <LocalizedText id="ab25d61bb124" leading={""} trailing={" "} />{editing && "*"}
              </label>
              {!editing && editingField !== "phone" && (
                <Button
                  onClick={() => handleStartEditField("phone", member.phone)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            ) : editingField === "phone" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  required
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                />
                <Button
                  onClick={() => handleSaveField("phone")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">{member.phone}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground"><LocalizedText id="8a754c61c2ce" leading={""} trailing={""} /></label>
              {!editing && editingField !== "gender" && (
                <Button
                  onClick={() => handleStartEditField("gender", member.gender || "")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <SelectNative
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value=""><LocalizedText id="e90701121015" leading={""} trailing={""} /></option>
                <option value="MALE"><LocalizedText id="3f3a489c72de" leading={""} trailing={""} /></option>
                <option value="FEMALE"><LocalizedText id="b7c17e97d3d6" leading={""} trailing={""} /></option>
                <option value="OTHER"><LocalizedText id="6e6a6f2086bb" leading={""} trailing={""} /></option>
              </SelectNative>
            ) : editingField === "gender" ? (
              <div className="flex items-center gap-2">
                <SelectNative
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                >
                  <option value=""><LocalizedText id="e90701121015" leading={""} trailing={""} /></option>
                  <option value="MALE"><LocalizedText id="3f3a489c72de" leading={""} trailing={""} /></option>
                  <option value="FEMALE"><LocalizedText id="b7c17e97d3d6" leading={""} trailing={""} /></option>
                  <option value="OTHER"><LocalizedText id="6e6a6f2086bb" leading={""} trailing={""} /></option>
                </SelectNative>
                <Button
                  onClick={() => handleSaveField("gender")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">
                {member.gender || <span className="text-muted-foreground italic"><LocalizedText id="93039e609d94" leading={""} trailing={""} /></span>}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground"><LocalizedText id="133160594d08" leading={""} trailing={""} /></label>
              {!editing && editingField !== "dateOfBirth" && (
                <Button
                  onClick={() => handleStartEditField("dateOfBirth", member.dateOfBirth ? member.dateOfBirth.split("T")[0] : "")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            ) : editingField === "dateOfBirth" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                />
                <Button
                  onClick={() => handleSaveField("dateOfBirth")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">
                {member.dateOfBirth ? formatDate(member.dateOfBirth) : <span className="text-muted-foreground italic"><LocalizedText id="93039e609d94" leading={""} trailing={""} /></span>}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground"><LocalizedText id="bae7d5be7082" leading={""} trailing={""} /></label>
              {!editing && editingField !== "status" && (
                <Button
                  onClick={() => handleStartEditField("status", member.status)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <SelectNative
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as MemberStatus })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              >
                <option value="ACTIVE"><LocalizedText id="a733b809d2f1" leading={""} trailing={""} /></option>
                <option value="EXPIRED"><LocalizedText id="a689a999a5e6" leading={""} trailing={""} /></option>
              </SelectNative>
            ) : editingField === "status" ? (
              <div className="flex items-center gap-2">
                <SelectNative
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                >
                  <option value="ACTIVE"><LocalizedText id="a733b809d2f1" leading={""} trailing={""} /></option>
                  <option value="EXPIRED"><LocalizedText id="a689a999a5e6" leading={""} trailing={""} /></option>
                </SelectNative>
                <Button
                  onClick={() => handleSaveField("status")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${getStatusBadge(
                  member.status
                )}`}
              >
                {member.status}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground">
                <LocalizedText id="0d16c6e19d1f" leading={""} trailing={"\n              "} /></label>
              {!editing && editingField !== "emergencyContact" && (
                <Button
                  onClick={() => handleStartEditField("emergencyContact", member.emergencyContact || "")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <Input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            ) : editingField === "emergencyContact" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="tel"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                />
                <Button
                  onClick={() => handleSaveField("emergencyContact")}
                  disabled={saving}
                  className="px-3 py-3 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelEditField}
                  className="px-3 py-3 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">
                {member.emergencyContact || <span className="text-muted-foreground italic"><LocalizedText id="93039e609d94" leading={""} trailing={""} /></span>}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground"><LocalizedText id="2e672f856b41" leading={""} trailing={""} /></label>
              {!editing && (
                <Button
                  onClick={() => {
                    setFixingDate("joinDate");
                    setDateToFix(member.joinDate.split("T")[0]);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <LocalizedText id="b3cc2b1233b2" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {fixingDate === "joinDate" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateToFix}
                  onChange={(e) => setDateToFix(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium text-sm"
                />
                <Button
                  onClick={() => handleFixDate("joinDate")}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                >
                  <LocalizedText id="efc007a393f6" leading={""} trailing={"\n                "} /></Button>
                <Button
                  onClick={() => {
                    setFixingDate(null);
                    setDateToFix("");
                  }}
                  className="px-3 py-2 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                >
                  <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n                "} /></Button>
              </div>
            ) : (
              <p className="text-foreground font-medium">{formatDate(member.joinDate)}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground"><LocalizedText id="d70f93df5e8f" leading={""} trailing={""} /></label>
              {!editing && editingField !== "address" && (
                <Button
                  onClick={() => handleStartEditField("address", member.address || "")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                  title={tStatic("e5e03f979065")}
                >
                  <Pencil className="h-4 w-4" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Button>
              )}
            </div>
            {editing ? (
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
              />
            ) : editingField === "address" ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-background font-medium"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleSaveField("address")}
                    disabled={saving}
                    className="px-3 py-2 bg-blue-600 text-primary-foreground rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    <Save className="h-4 w-4 inline mr-1" />
                    <LocalizedText id="efc007a393f6" leading={""} trailing={"\n                  "} /></Button>
                  <Button
                    onClick={handleCancelEditField}
                    className="px-3 py-2 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                  >
                    <X className="h-4 w-4 inline mr-1" />
                    <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n                  "} /></Button>
                </div>
              </div>
            ) : (
              <p className="text-foreground font-medium">
                {member.address || <span className="text-muted-foreground italic"><LocalizedText id="93039e609d94" leading={""} trailing={""} /></span>}
              </p>
            )}
          </div>

          {member.externalId && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2"><LocalizedText id="7a88b2371d9a" leading={""} trailing={""} /></label>
              <p className="text-foreground font-mono font-medium">{member.externalId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Current Membership */}
      {currentMembership && (
        <div className="bg-card rounded-2xl shadow-lg  p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground"><LocalizedText id="61fd97f6b3a7" leading={""} trailing={""} /></h2>
            <div className="flex gap-2">
              {(() => {
                // Check if expiry date seems incorrect (more than 1 year from latest payment)
                const latestPayment = member.Payment?.[0];
                if (latestPayment) {
                  const paymentDate = new Date(latestPayment.receivedAt);
                  const maxReasonableDate = new Date(paymentDate);
                  maxReasonableDate.setFullYear(maxReasonableDate.getFullYear() + 1);
                  const membershipEndDate = new Date(currentMembership.endDate);
                  
                  if (membershipEndDate > maxReasonableDate) {
                    return (
                      <Button
                        onClick={async () => {
                          if (confirm(`Expiry date ${formatDate(currentMembership.endDate)} seems incorrect. Recalculate based on payment date?`)) {
                            try {
                              const response = await fetch(`/api/members/fix-expiry`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ memberId }),
                              });
                              const data = await response.json();
                              if (response.ok) {
                                alert(`Fixed! New expiry: ${formatDate(data.newEndDate)}`);
                                fetchMember();
                              } else {
                                alert(data.error || "Failed to fix expiry date");
                              }
                            } catch (error) {
                              alert("Failed to fix expiry date");
                            }
                          }
                        }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-primary-foreground px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 font-semibold text-sm active:scale-[0.98]"
                      >
                        <Calendar className="h-4 w-4" />
                        <LocalizedText id="7ba68293fab1" leading={""} trailing={"\n                      "} /></Button>
                    );
                  }
                }
                return null;
              })()}
              <Link
                href={`/dashboard/members/${memberId}/renew`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-primary-foreground px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all duration-200 font-semibold text-sm active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <LocalizedText id="1e003c13707c" leading={""} trailing={"\n              "} /></Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground font-medium"><LocalizedText id="ae2f98a099fe" leading={""} trailing={""} /></p>
                <Link
                  href={`/dashboard/members/${memberId}/renew`}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  <LocalizedText id="5301648dcf6b" leading={""} trailing={"\n                "} /></Link>
              </div>
              <p className="text-lg font-semibold text-foreground">{currentMembership.Plan.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1"><LocalizedText id="a2dc17b529cb" leading={""} trailing={""} /></p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(currentMembership.amount)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground font-medium"><LocalizedText id="9d7ab1a55796" leading={""} trailing={""} /></p>
                <Button
                  onClick={() => {
                    setFixingDate("membershipStartDate");
                    setDateToFix(currentMembership.startDate.split("T")[0]);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <LocalizedText id="99a423164819" leading={""} trailing={"\n                "} /></Button>
              </div>
              {fixingDate === "membershipStartDate" ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="date"
                    value={dateToFix}
                    onChange={(e) => setDateToFix(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Button
                    onClick={() => handleFixDate("membershipStartDate")}
                    disabled={saving}
                    className="px-2 py-1.5 bg-blue-600 text-primary-foreground rounded-lg hover:bg-blue-700 text-xs disabled:opacity-50"
                  >
                    <LocalizedText id="efc007a393f6" leading={""} trailing={"\n                  "} /></Button>
                  <Button
                    onClick={() => {
                      setFixingDate(null);
                      setDateToFix("");
                    }}
                    className="px-2 py-1.5 border border-border rounded-lg hover:bg-muted text-xs"
                  >
                    <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n                  "} /></Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {formatDate(currentMembership.startDate)}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground font-medium"><LocalizedText id="8d007050838a" leading={""} trailing={""} /></p>
                <Button
                  onClick={() => {
                    setFixingDate("membershipEndDate");
                    setDateToFix(currentMembership.endDate.split("T")[0]);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <LocalizedText id="99a423164819" leading={""} trailing={"\n                "} /></Button>
              </div>
              {fixingDate === "membershipEndDate" ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="date"
                    value={dateToFix}
                    onChange={(e) => setDateToFix(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Button
                    onClick={() => handleFixDate("membershipEndDate")}
                    disabled={saving}
                    className="px-2 py-1.5 bg-blue-600 text-primary-foreground rounded-lg hover:bg-blue-700 text-xs disabled:opacity-50"
                  >
                    <LocalizedText id="efc007a393f6" leading={""} trailing={"\n                  "} /></Button>
                  <Button
                    onClick={() => {
                      setFixingDate(null);
                      setDateToFix("");
                    }}
                    className="px-2 py-1.5 border border-border rounded-lg hover:bg-muted text-xs"
                  >
                    <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n                  "} /></Button>
                </div>
              ) : (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    {formatDate(currentMembership.endDate)}
                  </p>
                  {daysUntil !== null && (
                    <p
                      className={`text-sm font-medium mt-1 ${
                        daysUntil < 0
                          ? "text-red-600"
                          : daysUntil <= 7
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {daysUntil < 0
                        ? `Expired ${Math.abs(daysUntil)} days ago`
                        : daysUntil === 0
                        ? tStatic("a2f6b366e0d3")
                        : `${daysUntil} days remaining`}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Membership Validity Status */}
          {validityStatus && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  validityStatus.isValid 
                    ? 'bg-green-100/80 text-green-700' 
                    : 'bg-red-100/80 text-red-700'
                }`}>
                  <AlertCircle className={`h-5 w-5 ${
                    validityStatus.isValid ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    <LocalizedText id="664e9374681e" leading={""} trailing={"\n                  "} /></p>
                  <p className={`text-sm font-medium ${
                    validityStatus.isValid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {validityStatus.isValid ? tStatic("8df186a8eca5") : tStatic("41a6f3ac4a20")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {validityStatus.reason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <MemberPaymentHistory memberId={memberId} payments={member.Payment} />
      <MemberMembershipHistory memberships={member.Membership} />
    </div>
  );
}
