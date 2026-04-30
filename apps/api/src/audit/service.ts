import { Prisma, PrismaClient } from "@prisma/client";

import { getDatabaseUrl, getStoreDriver } from "../store/persistence.js";

export interface AuditLogInput {
  workspaceId: string;
  restaurantId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditService {
  record(input: AuditLogInput): Promise<void>;
}

export function createAuditService(environment: NodeJS.ProcessEnv = process.env): AuditService {
  const storeDriver = getStoreDriver(environment);
  const databaseUrl = getDatabaseUrl(environment);
  const prisma =
    storeDriver === "database" && databaseUrl
      ? new PrismaClient({
          datasources: {
            db: {
              url: databaseUrl
            }
          }
        })
      : null;

  return {
    async record(input) {
      if (!prisma) {
        return;
      }

      await prisma.auditLog.create({
        data: {
          id: `audit-${input.action}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
          workspaceId: input.workspaceId,
          restaurantId: input.restaurantId ?? null,
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          metadataJson: JSON.parse(
            JSON.stringify(input.metadata ?? {})
          ) as Prisma.InputJsonValue
        }
      });
    }
  };
}
