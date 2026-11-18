import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { inngest } from "@/inngest/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("health");

const mutatingBodySchema = z
  .object({
    errorType: z.string().optional(),
    errorMessage: z.string().optional(),
  })
  .passthrough();

/**
 * Health check endpoint.
 * Basic health (database status) is public for load balancers.
 * Error monitoring details require admin auth.
 */
export async function healthCheckHandler(request: NextRequest) {
  let databaseHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseHealthy = true;
  } catch (error) {
    logger.error("Database health check failed:", error as Error);
  }

  const basicResponse = {
    status: databaseHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: databaseHealthy ? "healthy" : "unhealthy",
    },
  };

  return successResponse(basicResponse);
}

/** Manually trigger error fix (Admin only). */
export async function healthFixHandler(request: NextRequest) {
  try {
    return ApiErrors.forbidden("Platform operator access required");
  } catch (error: unknown) {
    logger.error("Health fix error:", error instanceof Error ? error : undefined);
    return ApiErrors.internal("Failed to trigger fix");
  }
}
