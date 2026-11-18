import { resolveApymPanelProfile } from "@/lib/apym/profiles";

function profileFor(input: {
  accountMemberRole: "OWNER" | "ADMIN" | "STAFF" | null;
  gymStaffRole: "MANAGER" | "TRAINER" | "RECEPTION" | null;
  userActive: boolean;
  isTrainer?: boolean;
}) {
  return resolveApymPanelProfile(
    input as unknown as Parameters<typeof resolveApymPanelProfile>[0],
  );
}

describe("resolveApymPanelProfile", () => {
  it.each(["OWNER", "ADMIN"] as const)("maps active %s membership to account manager", (accountMemberRole) => {
    expect(profileFor({ accountMemberRole, gymStaffRole: null, userActive: true })).toBe("manager");
  });

  it("maps an assigned STAFF manager only in that gym", () => {
    expect(profileFor({
      accountMemberRole: "STAFF",
      gymStaffRole: "MANAGER",
      userActive: true,
      isTrainer: false,
    })).toBe("manager");
  });

  it("uses the gym assignment instead of the legacy isTrainer flag", () => {
    expect(profileFor({
      accountMemberRole: "STAFF",
      gymStaffRole: "TRAINER",
      userActive: true,
      isTrainer: false,
    })).toBe("trainer");
    expect(profileFor({
      accountMemberRole: "STAFF",
      gymStaffRole: "RECEPTION",
      userActive: true,
      isTrainer: true,
    })).toBe("reception");
  });

  it("denies STAFF with no active gym assignment even when isTrainer is true", () => {
    expect(profileFor({
      accountMemberRole: "STAFF",
      gymStaffRole: null,
      userActive: true,
      isTrainer: true,
    })).toBeNull();
  });

  it("denies inactive users and users without account membership", () => {
    expect(profileFor({
      accountMemberRole: "STAFF",
      gymStaffRole: "TRAINER",
      userActive: false,
    })).toBeNull();
    expect(profileFor({
      accountMemberRole: null,
      gymStaffRole: "TRAINER",
      userActive: true,
    })).toBeNull();
  });
});
