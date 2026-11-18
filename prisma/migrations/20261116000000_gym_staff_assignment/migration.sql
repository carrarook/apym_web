CREATE TYPE "GymStaffRole" AS ENUM ('MANAGER', 'TRAINER', 'RECEPTION');

CREATE UNIQUE INDEX "Gym_id_accountId_key" ON "Gym"("id", "accountId");

CREATE TABLE "GymStaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "role" "GymStaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deactivatedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GymStaffAssignment_accountId_gymId_isActive_idx"
    ON "GymStaffAssignment"("accountId", "gymId", "isActive");

CREATE INDEX "GymStaffAssignment_userId_isActive_idx"
    ON "GymStaffAssignment"("userId", "isActive");

CREATE UNIQUE INDEX "GymStaffAssignment_one_active_per_user_gym"
    ON "GymStaffAssignment"("userId", "gymId")
    WHERE "isActive" = true;

ALTER TABLE "GymStaffAssignment"
    ADD CONSTRAINT "GymStaffAssignment_userId_accountId_fkey"
    FOREIGN KEY ("userId", "accountId")
    REFERENCES "AccountMembership"("userId", "accountId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GymStaffAssignment"
    ADD CONSTRAINT "GymStaffAssignment_gymId_accountId_fkey"
    FOREIGN KEY ("gymId", "accountId")
    REFERENCES "Gym"("id", "accountId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GymStaffAssignment"
    ADD CONSTRAINT "GymStaffAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GymStaffAssignment"
    ADD CONSTRAINT "GymStaffAssignment_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GymStaffAssignment"
    ADD CONSTRAINT "GymStaffAssignment_deactivatedById_fkey"
    FOREIGN KEY ("deactivatedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
