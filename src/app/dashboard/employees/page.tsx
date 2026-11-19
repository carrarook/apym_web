"use client";

import { useTranslations as useStaticUiTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-employees");
import {
  Plus,
  Edit,
  Trash2,
  UserPlus,
  X,
  Save,
  Loader2,
  Shield,
  UserCheck,
  Eye,
  Pencil,
} from "lucide-react";

interface User {
  id: string;
  contactNumber: string;
  name: string;
  role: "ADMIN" | "SUB_ADMIN";
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

type GymStaffRole = "MANAGER" | "TRAINER" | "RECEPTION";
interface GymOption { id: string; name: string; }
interface GymStaffRow {
  id: string;
  name: string;
  email: string | null;
  contactNumber: string;
  accountRole: string;
  assignment: { id: string; role: GymStaffRole; isActive?: boolean } | null;
}

import type { Permission } from "@/lib/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "canViewMembers", "canEditMembers", "canRegisterMembers", "canViewAttendance", "canManageAttendance",
  "canViewPayments", "canEditPayments", "canCreatePayments", "canViewAssignedMembers",
  "canViewAssignedWorkouts", "canPrescribeWorkouts", "canViewRenewals", "canEditRenewals",
  "canViewReminders", "canEditReminders", "canViewReports", "canViewWhatsAppReminders",
  "canSendWhatsAppReminders", "canSendBulkReminders",
];

const MANAGER_PERMISSIONS = new Set<Permission>([
  "canViewMembers", "canEditMembers", "canRegisterMembers", "canViewAttendance", "canManageAttendance",
  "canViewPayments", "canEditPayments", "canCreatePayments", "canViewRenewals", "canEditRenewals",
  "canViewReminders", "canEditReminders", "canViewReports", "canViewWhatsAppReminders",
  "canSendWhatsAppReminders", "canSendBulkReminders",
]);
const TRAINER_PERMISSIONS = new Set<Permission>([
  "canViewAssignedMembers", "canViewAssignedWorkouts", "canPrescribeWorkouts",
]);
const RECEPTION_PERMISSIONS = new Set<Permission>([
  "canViewMembers", "canRegisterMembers", "canViewAttendance", "canManageAttendance",
  "canViewPayments", "canCreatePayments",
]);

const PERMISSION_LABELS: Record<Permission, string> = {
  canViewMembers: "View members",
  canEditMembers: "Edit members",
  canRegisterMembers: "Register members",
  canViewAttendance: "View attendance",
  canManageAttendance: "Manage attendance",
  canViewPayments: "View payments",
  canEditPayments: "Edit payments",
  canCreatePayments: "Create payments",
  canViewAssignedMembers: "View assigned members",
  canViewAssignedWorkouts: "View assigned workout history",
  canPrescribeWorkouts: "Prescribe workouts",
  canViewRenewals: "View renewals",
  canEditRenewals: "Edit renewals",
  canViewReminders: "View reminders",
  canEditReminders: "Edit reminders",
  canViewReports: "View reports",
  canViewWhatsAppReminders: "View WhatsApp Business reminders",
  canSendWhatsAppReminders: "Send WhatsApp Business reminders",
  canSendBulkReminders: "Send bulk reminders",
};

export default function EmployeesPage() {
  const tStatic = useStaticUiTranslations("static");
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [gyms, setGyms] = useState<GymOption[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [gymStaff, setGymStaff] = useState<GymStaffRow[]>([]);
  const [staffRoleDrafts, setStaffRoleDrafts] = useState<Record<string, GymStaffRole>>({});
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    contactNumber: "",
    password: "",
    name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  const loadGyms = useCallback(async () => {
    try {
      const response = await fetch("/api/gyms");
      if (!response.ok) return;
      const data = await response.json();
      const options = Array.isArray(data.gyms) ? data.gyms : [];
      setGyms(options);
      if (options.length) setSelectedGymId((current) => current || options[0].id);
    } catch (error) {
      logger.error("Error loading academies:", error as Error);
    }
  }, []);

  const loadGymStaff = useCallback(async (gymId: string) => {
    setLoadingStaff(true);
    try {
      const response = await fetch(`/api/gyms/${encodeURIComponent(gymId)}/staff`);
      if (response.status === 401 || response.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (!response.ok) throw new Error("Could not load academy staff");
      const data = await response.json();
      setGymStaff(data.staff ?? []);
      setStaffRoleDrafts(Object.fromEntries(
        (data.staff ?? []).map((row: GymStaffRow) => [row.id, row.assignment?.role ?? "RECEPTION"]),
      ));
    } catch (error) {
      logger.error("Error loading academy staff:", error as Error);
      toast.error(tStatic("3036f1bde9a9"));
    } finally {
      setLoadingStaff(false);
    }
  }, [router, tStatic]);

  const saveGymRole = async (row: GymStaffRow) => {
    if (!selectedGymId) return;
    try {
      const response = await fetch(`/api/gyms/${encodeURIComponent(selectedGymId)}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, role: staffRoleDrafts[row.id] ?? "RECEPTION" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || tStatic("9c7ed679fbe7"));
      }
      toast.success(tStatic("89f24195a173"));
      await loadGymStaff(selectedGymId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tStatic("9c7ed679fbe7"));
    }
  };

  const revokeGymRole = async (row: GymStaffRow) => {
    if (!selectedGymId || !row.assignment) return;
    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(selectedGymId)}/staff/${encodeURIComponent(row.assignment.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(tStatic("fab970d68e9b"));
      toast.success(tStatic("6ea6c6608ea5"));
      await loadGymStaff(selectedGymId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tStatic("fab970d68e9b"));
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 401 || response.status === 403) {
        router.push("/dashboard");
      }
    } catch (error) {
      logger.error("Error fetching users:", error as Error);
      toast.error(tStatic("f7de8498b821"));
    } finally {
      setLoading(false);
    }
  }, [router, tStatic]);

  useEffect(() => {
    if (!session?.user?.id) return;
    void loadGyms();
    void fetchUsers();
  }, [session?.user?.id, loadGyms, fetchUsers]);

  useEffect(() => {
    if (selectedGymId) void loadGymStaff(selectedGymId);
  }, [selectedGymId, loadGymStaff]);

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        contactNumber: user.contactNumber,
        password: "",
        name: user.name,
      });
    } else {
      setEditingUser(null);
      setFormData({
        contactNumber: "",
        password: "",
        name: "",
      });
    }
    setGeneratedPassword(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      // If editing and password is empty, don't send it
      const submitData: Record<string, unknown> = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // If creating new user and password was generated, show it
        if (!editingUser && result.temporaryPassword) {
          setGeneratedPassword(result.temporaryPassword);
          setShowPasswordModal(true);
          toast.success(tStatic("ecafec8e6632"));
        } else {
          toast.success(tStatic("162aa98ae9e9"));
        }
        
        await fetchUsers();
        handleCloseForm();
      } else {
        const error = await response.json();
        toast.error(error.error || tStatic("a55fa7603f38"));
      }
    } catch (error) {
      logger.error("Error saving employee:", error as Error);
      toast.error(tStatic("a55fa7603f38"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    enqueueAction(`delete-user:${id}`, async () => {
      setDeletingUserId(id);
      try {
        const response = await fetch(`/api/users/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success(tStatic("cd2a00b81701"));
          await fetchUsers();
        } else {
          const error = await response.json();
          toast.error(error.error || tStatic("8d3859a24730"));
        }
      } catch (error) {
        logger.error("Error deleting employee:", error as Error);
        toast.error(tStatic("8d3859a24730"));
      } finally {
        setDeletingUserId((current) => (current === id ? null : current));
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground"><LocalizedText id="b04ba49f8486" leading={""} trailing={""} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl border border-border">
            <h2 className="text-xl font-bold mb-4"><LocalizedText id="40950b763cfa" leading={""} trailing={""} /></h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                <strong><LocalizedText id="18dd7e894b3d" leading={""} trailing={""} /></strong> <LocalizedText id="869c68cdc7d9" leading={""} trailing={"\n              "} /></p>
              <div className="bg-background border border-border rounded p-3 font-mono text-lg select-all">
                {generatedPassword}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              <LocalizedText id="f577882fad70" leading={""} trailing={"\n            "} /></p>
            <Button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setGeneratedPassword(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <LocalizedText id="d119c0375d42" leading={""} trailing={"\n            "} /></Button>
          </div>
        </div>
      )}

      <DashboardPageHeader
        title={tStatic("08f173397d30")}
        description={tStatic("8fafbed40fe3")}
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            <LocalizedText id="7c37e69272bf" leading={""} trailing={"\n          "} /></Button>
        }
      />

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold"><LocalizedText id="5cf4675416b6" leading={""} trailing={""} /></h2>
            <p className="text-sm text-muted-foreground"><LocalizedText id="e539b844b316" leading={""} trailing={""} /></p>
          </div>
          <SelectNative value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
            <option value=""><LocalizedText id="125688dc312d" leading={""} trailing={""} /></option>
            {gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
          </SelectNative>
        </div>
        {loadingStaff ? <p className="text-sm text-muted-foreground"><LocalizedText id="13bdc8a3b8a6" leading={""} trailing={""} /></p> : (
          <div className="space-y-2">
            {gymStaff.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.email ?? row.contactNumber}</div>
                </div>
                {row.accountRole === "OWNER" || row.accountRole === "ADMIN" ? (
                  <span className="text-sm text-muted-foreground"><LocalizedText id="35ff0464b9fa" leading={""} trailing={""} /></span>
                ) : (
                  <div className="flex items-center gap-2">
                    <SelectNative
                      value={staffRoleDrafts[row.id] ?? "RECEPTION"}
                      onChange={(event) => setStaffRoleDrafts((current) => ({ ...current, [row.id]: event.target.value as GymStaffRole }))}
                    >
                      <option value="MANAGER"><LocalizedText id="babe3050e2e8" leading={""} trailing={""} /></option>
                      <option value="TRAINER"><LocalizedText id="63deca910cbd" leading={""} trailing={""} /></option>
                      <option value="RECEPTION"><LocalizedText id="d928bfee825c" leading={""} trailing={""} /></option>
                    </SelectNative>
                    <Button type="button" onClick={() => void saveGymRole(row)} className="gap-1"><Save className="h-4 w-4" /><LocalizedText id="efc007a393f6" leading={""} trailing={""} /></Button>
                    {row.assignment && <Button type="button" onClick={() => void revokeGymRole(row)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                )}
              </div>
            ))}
            {!gymStaff.length && <p className="text-sm text-muted-foreground"><LocalizedText id="12be76fdbb9d" leading={""} trailing={""} /></p>}
          </div>
        )}
      </section>

      {/* Users List */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="709a23220f2c" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="c209acfc3058" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="c3f104d13657" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="bae7d5be7082" leading={""} trailing={"\n                "} /></th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <LocalizedText id="c3cd636a585b" leading={""} trailing={"\n                "} /></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {user.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {user.contactNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {user.role === "ADMIN" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      {user.role === "ADMIN" ? tStatic("4e7afebcfbae") : tStatic("079711ea16f3")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {user.isActive ? tStatic("a733b809d2f1") : tStatic("09af574c7f20")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => handleOpenForm(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== "ADMIN" && user.id !== session?.user?.id && (
                        <Button
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          disabled={isQueued(`delete-user:${user.id}`)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <LocalizedText id="6bdfa422c4d6" leading={""} trailing={"\n          "} /></h3>
          <p className="text-xs text-muted-foreground mt-1"><LocalizedText id="460bad635d78" leading={""} trailing={""} /></p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="1785713451d0" leading={""} trailing={""} /></th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="babe3050e2e8" leading={""} trailing={""} /></th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="63deca910cbd" leading={""} trailing={""} /></th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"><LocalizedText id="d928bfee825c" leading={""} trailing={""} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm} className="hover:bg-muted/50">
                  <td className="px-4 py-2.5 text-foreground">{PERMISSION_LABELS[perm]}</td>
                  <td className="px-4 py-2.5 text-center">
                    {MANAGER_PERMISSIONS.has(perm) ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {TRAINER_PERMISSIONS.has(perm) ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {RECEPTION_PERMISSIONS.has(perm) ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-foreground border border-border">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingUser ? tStatic("60bdcf8f3faa") : tStatic("3a5532671df9")}
              </h2>
              <Button
                type="button"
                onClick={handleCloseForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  <LocalizedText id="b0d5be39ae39" leading={""} trailing={"\n                "} /></h3>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <LocalizedText id="d145bb830936" leading={""} trailing={"\n                  "} /></label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <LocalizedText id="7752319cd670" leading={""} trailing={"\n                  "} /></label>
                  <Input
                    type="tel"
                    required
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, contactNumber: e.target.value })
                    }
                    placeholder={tStatic("8f0ce0325e4b")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <LocalizedText id="8be3c943b160" leading={""} trailing={" "} />{editingUser ? tStatic("44879bedcd11") : tStatic("5a9cfbb2dd75")}
                  </label>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={editingUser ? "Leave blank to keep current" : "Gympass@123!"}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

              </div>


              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <LocalizedText id="77dfd2135f4d" leading={""} trailing={"\n                "} /></Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? tStatic("ae7e887517b0") : editingUser ? tStatic("fb91e24fa52d") : tStatic("6e157c5da441")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
