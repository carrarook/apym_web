import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveGymAuthorization } from "@/lib/security/gym-authorization";
import { createApiHandler } from "@/lib/api-handler";

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/security/gym-authorization", () => ({
  resolveGymAuthorization: jest.fn(),
}));
jest.mock("@/lib/middleware/rate-limit", () => ({
  withRateLimit: jest.fn(() => null),
}));

const mockedAuth = auth as jest.Mock;
const mockedAuthorization = resolveGymAuthorization as jest.Mock;

describe("createApiHandler authorization context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({ user: { id: "user-1", role: "ADMIN" } });
  });

  it("resolves and passes a per-gym context before checking the requested capability", async () => {
    mockedAuthorization.mockResolvedValue({
      userId: "user-1",
      accountId: "account-1",
      gymId: "gym-b",
      accountMemberRole: "STAFF",
      gymStaffRole: "RECEPTION",
      userActive: true,
    });
    const handler = createApiHandler(async (_request, context) => {
      const authorization = (context as unknown as {
        authorization?: { gymId: string; gymStaffRole: string | null };
      }).authorization;
      return NextResponse.json({
        gymId: authorization?.gymId,
        role: authorization?.gymStaffRole,
      });
    }, { permission: "canRegisterMembers" });

    const response = await handler(new NextRequest("http://localhost/api/test"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ gymId: "gym-b", role: "RECEPTION" });
    expect(mockedAuthorization).toHaveBeenCalledWith("user-1", null, expect.any(NextRequest));
  });

  it("denies a legacy ADMIN session when no active authorization context resolves", async () => {
    mockedAuthorization.mockResolvedValue(null);
    const handler = createApiHandler(async () => NextResponse.json({ ok: true }), {
      permission: "canEditMembers",
    });

    const response = await handler(new NextRequest("http://localhost/api/test"));

    expect(response.status).toBe(403);
    expect(mockedAuthorization).toHaveBeenCalled();
  });

  it("does not let an account manager enter a platform-only diagnostic route", async () => {
    mockedAuthorization.mockResolvedValue({
      userId: "user-1",
      accountId: "account-1",
      gymId: "gym-b",
      accountMemberRole: "ADMIN",
      gymStaffRole: null,
      userActive: true,
    });
    const handler = createApiHandler(async () => NextResponse.json({ secret: true }), {
      platformOnly: true,
    });

    const response = await handler(new NextRequest("http://localhost/api/health/errors"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });
});
