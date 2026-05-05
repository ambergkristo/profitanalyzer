-- Phase 17 billing and license model foundation.
CREATE TYPE "PlanCode" AS ENUM ('starter', 'pro', 'multi_location', 'founding_partner', 'internal_demo');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired', 'lifetime', 'internal');
CREATE TYPE "BillingProvider" AS ENUM ('none', 'manual', 'stripe_future');
CREATE TYPE "LicenseEntitlementType" AS ENUM ('founding_partner_lifetime', 'internal_demo', 'manual_comp', 'paid_subscription', 'trial');
CREATE TYPE "LicenseEntitlementStatus" AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "code" "PlanCode" NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "includedRestaurants" INTEGER NOT NULL,
  "includedUsers" INTEGER NOT NULL,
  "includedInvoicesPerMonth" INTEGER,
  "featuresJson" JSONB NOT NULL,
  "isPublic" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceSubscription" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "planCode" "PlanCode" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "billingProvider" "BillingProvider" NOT NULL,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "lifetimeAccessReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseEntitlement" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "type" "LicenseEntitlementType" NOT NULL,
  "status" "LicenseEntitlementStatus" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LicenseEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageCounter" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "invoicesProcessed" INTEGER NOT NULL DEFAULT 0,
  "ocrUploads" INTEGER NOT NULL DEFAULT 0,
  "usersCount" INTEGER NOT NULL DEFAULT 0,
  "restaurantsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "WorkspaceSubscription_workspaceId_idx" ON "WorkspaceSubscription"("workspaceId");
CREATE INDEX "WorkspaceSubscription_status_idx" ON "WorkspaceSubscription"("status");
CREATE INDEX "LicenseEntitlement_workspaceId_idx" ON "LicenseEntitlement"("workspaceId");
CREATE INDEX "LicenseEntitlement_type_status_idx" ON "LicenseEntitlement"("type", "status");
CREATE INDEX "UsageCounter_workspaceId_idx" ON "UsageCounter"("workspaceId");
CREATE UNIQUE INDEX "UsageCounter_workspaceId_period_key" ON "UsageCounter"("workspaceId", "period");

ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LicenseEntitlement" ADD CONSTRAINT "LicenseEntitlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
