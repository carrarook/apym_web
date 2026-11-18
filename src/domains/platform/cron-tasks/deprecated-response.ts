import { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { ApiErrors } from "@/lib/api-handler";
import { deprecatedCronResponse } from "@/lib/cron/deprecated-response";

/** @deprecated Use GET /api/cron/unified — cron auth only. */
export async function handleDeprecatedCronGet(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}

/** @deprecated Use GET /api/cron/unified — cron auth only; no session is a platform identity. */
export async function handleDeprecatedCronGetWithAdmin(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}

export { deprecatedCronResponse };
