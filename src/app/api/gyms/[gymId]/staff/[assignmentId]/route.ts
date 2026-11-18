import type { NextRequest } from "next/server";
import {
  revokeGymStaffAssignment,
  updateGymStaffAssignment,
} from "@/domains/platform/staff/handlers/gym-staff-assignment";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ gymId: string; assignmentId: string }> },
) {
  return updateGymStaffAssignment(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ gymId: string; assignmentId: string }> },
) {
  return revokeGymStaffAssignment(request, context);
}
