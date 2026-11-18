"use strict";

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { gymRequestHasPermission } from "@/lib/security/gym-authorization";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import {
  handleQuickEntryGet,
  handleQuickEntryPost,
} from "@/domains/payments/handlers/process-quick-entry-batch";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (!(await gymRequestHasPermission(session, request, "canViewPayments"))) {
    return ApiErrors.forbidden("Permission denied: cannot view payments");
  }
  return handleQuickEntryGet();
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) {
    return ApiErrors.unauthorized();
  }
  if (!(await gymRequestHasPermission(session, request, "canCreatePayments"))) {
    return ApiErrors.forbidden("Permission denied: cannot record payments");
  }

  return handleQuickEntryPost(request);
}
