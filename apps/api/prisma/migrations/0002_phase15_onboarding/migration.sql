-- Add onboarding/profile state to restaurant-owned dataset records.
ALTER TABLE "Restaurant" ADD COLUMN "onboardingStateJson" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN "restaurantProfileJson" JSONB;
