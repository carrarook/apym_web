import { z } from "zod";

export const updateCommissionSchema = z.object({
  commissionId: z.string().min(1),
  isPaid: z.boolean().optional(),
});
