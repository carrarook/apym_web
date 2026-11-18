import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";
import { GET, POST } from "@/app/api/gyms/[gymId]/staff/route";
import { PATCH, DELETE } from "@/app/api/gyms/[gymId]/staff/[assignmentId]/route";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/security/gym-authorization", () => ({ resolveGymAuthorization: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    accountMembership: { findMany: jest.fn(), findUnique: jest.fn() },
    gymStaffAssignment: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockAuth = auth as jest.Mock;
const mockResolve = resolveGymAuthorization as jest.Mock;
const db = prisma as unknown as {
  accountMembership: { findMany: jest.Mock; findUnique: jest.Mock };
  gymStaffAssignment: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  $transaction: jest.Mock;
};
const params = { params: Promise.resolve({ gymId: "gym-a" }) };

describe("gym staff assignment APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "manager-1", role: "STAFF" } });
    mockResolve.mockResolvedValue({
      userId: "manager-1", accountId: "account-1", gymId: "gym-a",
      accountMemberRole: "ADMIN", gymStaffRole: null, userActive: true,
    });
    db.accountMembership.findUnique.mockResolvedValue({ isActive: true, role: "STAFF", User: { isActive: true } });
    db.gymStaffAssignment.findFirst.mockResolvedValue(null);
    db.gymStaffAssignment.create.mockResolvedValue({ id: "as-1", userId: "staff-1", role: "TRAINER", isActive: true });
    db.$transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
      gymStaffAssignment: {
        update: db.gymStaffAssignment.update,
        create: db.gymStaffAssignment.create,
      },
    }));
  });

  it("denies STAFF even if the session carries a legacy ADMIN role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "staff-1", role: "ADMIN" } });
    mockResolve.mockResolvedValue({
      userId: "staff-1", accountId: "account-1", gymId: "gym-a",
      accountMemberRole: "STAFF", gymStaffRole: "MANAGER", userActive: true,
    });
    const response = (await GET(new NextRequest("http://localhost/api/gyms/gym-a/staff"), params))!;
    expect(response.status).toBe(403);
    expect(db.accountMembership.findMany).not.toHaveBeenCalled();
  });

  it("denies a gym outside the caller's resolved account", async () => {
    mockResolve.mockResolvedValue(null);
    const response = (await POST(new NextRequest("http://localhost/api/gyms/gym-b/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "staff-1", role: "TRAINER" }),
    }), { params: Promise.resolve({ gymId: "gym-b" }) }))!;
    expect(response.status).toBe(403);
    expect(db.gymStaffAssignment.create).not.toHaveBeenCalled();
  });

  it("requires the target to have active account membership", async () => {
    db.accountMembership.findUnique.mockResolvedValue({ isActive: false, User: { isActive: true } });
    const response = (await POST(new NextRequest("http://localhost/api/gyms/gym-a/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "staff-1", role: "TRAINER" }),
    }), params))!;
    expect(response.status).toBe(400);
    expect(db.gymStaffAssignment.create).not.toHaveBeenCalled();
  });

  it("is idempotent when the same active role is submitted again", async () => {
    const active = { id: "as-1", userId: "staff-1", role: "TRAINER", isActive: true };
    db.gymStaffAssignment.findFirst.mockResolvedValue(active);
    const response = (await POST(new NextRequest("http://localhost/api/gyms/gym-a/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "staff-1", role: "TRAINER" }),
    }), params))!;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ unchanged: true, assignment: active });
    expect(db.gymStaffAssignment.create).not.toHaveBeenCalled();
    expect(db.gymStaffAssignment.update).not.toHaveBeenCalled();
  });

  it("keeps the prior role record when replacing it with another active role", async () => {
    const previous = { id: "as-old", userId: "staff-1", role: "TRAINER", isActive: true };
    db.gymStaffAssignment.findFirst.mockResolvedValue(previous);
    db.gymStaffAssignment.create.mockResolvedValue({ id: "as-new", userId: "staff-1", role: "RECEPTION", isActive: true });
    const response = (await POST(new NextRequest("http://localhost/api/gyms/gym-a/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "staff-1", role: "RECEPTION", changeReason: "Role change" }),
    }), params))!;
    expect(response.status).toBe(201);
    expect(db.gymStaffAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: "staff-1", gymId: "gym-a", accountId: "account-1", isActive: true },
    });
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.gymStaffAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "as-old" },
      data: expect.objectContaining({ isActive: false, deactivatedById: "manager-1" }),
    }));
    expect(db.gymStaffAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "RECEPTION", changeReason: "Role change" }),
    }));
  });

  it("returns a conflict when the database active-role uniqueness guard rejects a concurrent create", async () => {
    db.gymStaffAssignment.create.mockRejectedValue({ code: "P2002" });
    const response = (await POST(new NextRequest("http://localhost/api/gyms/gym-a/staff", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "staff-1", role: "TRAINER" }),
    }), params))!;
    expect(response.status).toBe(409);
  });

  it("changes the active role in place and records the manager update", async () => {
    const current = { id: "as-1", userId: "staff-1", role: "TRAINER", isActive: true, assignedById: "creator" };
    db.gymStaffAssignment.findFirst.mockResolvedValue(current);
    db.gymStaffAssignment.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...current, ...data }));
    const response = (await PATCH(new NextRequest("http://localhost/api/gyms/gym-a/staff/as-1", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "RECEPTION", changeReason: "Coverage change" }),
    }), { params: Promise.resolve({ gymId: "gym-a", assignmentId: "as-1" }) }))!;
    expect(response.status).toBe(201);
    expect(db.gymStaffAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "as-1" },
      data: expect.objectContaining({ isActive: false, deactivatedById: "manager-1", updatedById: "manager-1" }),
    }));
    expect(db.gymStaffAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "staff-1", role: "RECEPTION", changeReason: "Coverage change" }),
    }));
  });

  it("revokes an active assignment with actor and timestamp audit fields", async () => {
    db.gymStaffAssignment.findFirst.mockResolvedValue({ id: "as-1", userId: "staff-1", isActive: true });
    db.gymStaffAssignment.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
    const response = (await DELETE(new NextRequest("http://localhost/api/gyms/gym-a/staff/as-1", {
      method: "DELETE",
    }), { params: Promise.resolve({ gymId: "gym-a", assignmentId: "as-1" }) }))!;
    expect(response.status).toBe(200);
    expect(db.gymStaffAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "as-1" },
      data: expect.objectContaining({ isActive: false, deactivatedById: "manager-1", updatedById: "manager-1" }),
    }));
  });
});
