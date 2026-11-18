import { updateCommissionSchema } from "../commission-validation";

describe("updateCommissionSchema", () => {
  it("accepts a commission ID and optional paid state", () => {
    expect(
      updateCommissionSchema.parse({ commissionId: "commission-1", isPaid: true }),
    ).toEqual({ commissionId: "commission-1", isPaid: true });

    expect(updateCommissionSchema.parse({ commissionId: "commission-1" })).toEqual({
      commissionId: "commission-1",
    });
  });

  it("rejects missing IDs and non-boolean paid states", () => {
    expect(updateCommissionSchema.safeParse({ isPaid: true }).success).toBe(false);
    expect(
      updateCommissionSchema.safeParse({ commissionId: "commission-1", isPaid: "true" })
        .success,
    ).toBe(false);
  });
});
