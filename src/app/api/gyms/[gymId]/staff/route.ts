import type { NextRequest } from "next/server";
import { assignGymStaff, listGymStaff } from "@/domains/platform/staff/handlers/gym-staff-assignments";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gymId: string }> },
) {
  return listGymStaff(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gymId: string }> },
) {
  return assignGymStaff(request, context);
}
