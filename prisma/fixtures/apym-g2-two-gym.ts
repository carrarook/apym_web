/** Synthetic-only fixture identifiers for local/staging isolation checks. */
export const APYM_G2_TWO_GYM_FIXTURE = {
  account: {
    id: "2f5f0010-0000-4000-8000-000000000001",
    name: "APYM G2 Fixture Account",
  },
  gyms: {
    a: {
      id: "2f5f0020-0000-4000-8000-000000000001",
      name: "APYM G2 Fixture Gym A",
    },
    b: {
      id: "2f5f0020-0000-4000-8000-000000000002",
      name: "APYM G2 Fixture Gym B",
    },
  },
  users: {
    manager: {
      id: "apym-g2-fixture-manager",
      contactNumber: "+15550001001",
      name: "APYM G2 Fixture Manager",
    },
    staff: {
      id: "apym-g2-fixture-dual-role-staff",
      contactNumber: "+15550001002",
      name: "APYM G2 Fixture Dual Role Staff",
    },
  },
  members: {
    a: {
      id: "APYM-G2-FIXTURE-MEMBER-A",
      name: "APYM G2 Fixture Member A",
      phone: "+15550002001",
    },
    b: {
      id: "APYM-G2-FIXTURE-MEMBER-B",
      name: "APYM G2 Fixture Member B",
      phone: "+15550002002",
    },
  },
  assignments: {
    aTrainer: "apym-g2-fixture-assignment-a-trainer",
    bReception: "apym-g2-fixture-assignment-b-reception",
  },
  trainerClient: "apym-g2-fixture-delegation-a-only",
} as const;
