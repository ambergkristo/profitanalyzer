import { createHash, randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import { getAppMode } from "../config.js";
import type { AppStore } from "../store/types.js";
import { getDatabaseUrl, getStoreDriver } from "../store/persistence.js";
import type {
  AuthContext,
  AuthMeResponse,
  AuthMode,
  AuthSessionRecord,
  AuthUserProfile,
  AuthWorkspaceMembership,
  WorkspaceRole
} from "./types.js";

function nowIso() {
  return new Date().toISOString();
}

function buildHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildSessionExpiry() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
}

function inferRoleFromEmail(email: string): WorkspaceRole {
  const normalized = email.trim().toLowerCase();
  if (normalized.startsWith("member")) {
    return "member";
  }

  if (normalized.startsWith("admin")) {
    return "admin";
  }

  return "owner";
}

function buildUserId(email: string) {
  const normalized = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `user-${normalized}`;
}

function buildUserName(email: string) {
  const local = email.split("@")[0] ?? "User";
  const stripped = local.replace(/\+.*/u, "").replace(/[-_.]+/g, " ").trim();
  return stripped.length > 0
    ? stripped.replace(/\b\w/g, (character) => character.toUpperCase())
    : "User";
}

export interface DevLoginInput {
  email: string;
  workspaceId?: string;
  role?: WorkspaceRole;
}

interface AuthUserRecord {
  profile: AuthUserProfile;
  memberships: AuthWorkspaceMembership[];
}

export interface AuthService {
  initialize(): Promise<void>;
  getMode(): AuthMode;
  isAuthRequired(): boolean;
  devLogin(input: DevLoginInput): Promise<{ token: string; me: AuthMeResponse }>;
  getMe(token: string): Promise<AuthMeResponse | null>;
  getAuthContext(token: string): Promise<AuthContext | null>;
  logout(token: string): Promise<void>;
  setActiveContext(token: string, input: { workspaceId: string; restaurantId: string }): Promise<AuthMeResponse | null>;
}

export interface CreateAuthServiceOptions {
  env?: NodeJS.ProcessEnv;
  store: AppStore;
}

export class DevAuthUnavailableError extends Error {
  constructor(message = "Dev login is not available for the selected auth mode.") {
    super(message);
    this.name = "DevAuthUnavailableError";
  }
}

export function getAuthMode(environment: NodeJS.ProcessEnv = process.env): AuthMode {
  if (environment.AUTH_MODE === "disabled") {
    return "disabled";
  }

  return environment.AUTH_MODE === "production_future" ? "production_future" : "dev";
}

function buildMemberships(store: AppStore, appMode: ReturnType<typeof getAppMode>, preferredWorkspaceId?: string) {
  const datasets = store.listDatasets();
  const preferredDataset =
    (preferredWorkspaceId
      ? datasets.find((dataset) => `workspace-${dataset.id}` === preferredWorkspaceId || dataset.id === preferredWorkspaceId)
      : undefined) ??
    (appMode === "pilot"
      ? datasets.find((dataset) => dataset.id === "pilot-workspace")
      : undefined) ??
    datasets[0];

  if (!preferredDataset) {
    return [];
  }

  return [
    {
      workspaceId: `workspace-${preferredDataset.id}`,
      workspaceName: preferredDataset.name,
      role: "owner",
      restaurants: [
        {
          restaurantId: preferredDataset.id,
          restaurantName: preferredDataset.name
        }
      ]
    }
  ] satisfies AuthWorkspaceMembership[];
}

export function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const environment = options.env ?? process.env;
  const appMode = getAppMode(environment);
  const authMode = getAuthMode(environment);
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
  const usersByEmail = new Map<string, AuthUserRecord>();
  const sessionsByHash = new Map<string, AuthSessionRecord>();
  let initialized = false;

  async function initialize() {
    if (initialized) {
      return;
    }

    await options.store.initialize();
    if (prisma) {
      await prisma.$connect();
    }
    initialized = true;
  }

  async function ensureUser(input: DevLoginInput): Promise<AuthUserRecord> {
    await initialize();

    const email = input.email.trim().toLowerCase();
    const existing = usersByEmail.get(email);
    if (existing) {
      return existing;
    }

    const memberships = buildMemberships(options.store, appMode, input.workspaceId).map((membership) => ({
      ...membership,
      role: input.role ?? inferRoleFromEmail(email)
    }));

    const profile: AuthUserProfile = {
      id: buildUserId(email),
      email,
      name: buildUserName(email),
      createdAt: nowIso()
    };

    const record: AuthUserRecord = {
      profile,
      memberships
    };

    usersByEmail.set(email, record);

    if (prisma) {
      await prisma.user.upsert({
        where: { id: profile.id },
        update: {
          email: profile.email,
          name: profile.name
        },
        create: {
          id: profile.id,
          email: profile.email,
          name: profile.name
        }
      });

      for (const membership of memberships) {
        await prisma.workspaceMembership.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: membership.workspaceId,
              userId: profile.id
            }
          },
          update: {
            role: membership.role
          },
          create: {
            id: `membership-${membership.workspaceId}-${profile.id}`,
            workspaceId: membership.workspaceId,
            userId: profile.id,
            role: membership.role
          }
        });
      }
    }

    return record;
  }

  function buildMe(record: AuthUserRecord, session: AuthSessionRecord): AuthMeResponse {
    return {
      user: record.profile,
      workspaces: record.memberships.map((membership) => ({
        ...membership,
        restaurants: membership.restaurants.map((restaurant) => ({ ...restaurant }))
      })),
      activeWorkspaceId: session.activeWorkspaceId,
      activeRestaurantId: session.activeRestaurantId
    };
  }

  async function getSession(token: string) {
    await initialize();
    const session = sessionsByHash.get(buildHash(token));
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionsByHash.delete(session.tokenHash);
      if (prisma) {
        await prisma.authSession.deleteMany({ where: { id: session.id } });
      }
      return null;
    }

    return session;
  }

  return {
    async initialize() {
      await initialize();
    },
    getMode() {
      return authMode;
    },
    isAuthRequired() {
      return appMode !== "demo" && authMode !== "disabled";
    },
    async devLogin(input) {
      if (authMode !== "dev") {
        throw new DevAuthUnavailableError(`Dev login is unavailable when AUTH_MODE=${authMode}.`);
      }

      if (!input.email.trim()) {
        throw new Error("email is required.");
      }

      const record = await ensureUser(input);
      const firstMembership = record.memberships[0];
      if (!firstMembership || firstMembership.restaurants.length === 0) {
        throw new Error("No workspace membership is available for this user.");
      }

      const token = randomBytes(24).toString("hex");
      const session: AuthSessionRecord = {
        id: `session-${randomBytes(8).toString("hex")}`,
        userId: record.profile.id,
        tokenHash: buildHash(token),
        expiresAt: buildSessionExpiry(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        activeWorkspaceId: firstMembership.workspaceId,
        activeRestaurantId: firstMembership.restaurants[0].restaurantId
      };
      sessionsByHash.set(session.tokenHash, session);

      if (prisma) {
        await prisma.authSession.upsert({
          where: { id: session.id },
          update: {
            userId: session.userId,
            tokenHash: session.tokenHash,
            expiresAt: new Date(session.expiresAt),
            updatedAt: new Date(session.updatedAt),
            activeWorkspaceId: session.activeWorkspaceId,
            activeRestaurantId: session.activeRestaurantId
          },
          create: {
            id: session.id,
            userId: session.userId,
            tokenHash: session.tokenHash,
            expiresAt: new Date(session.expiresAt),
            activeWorkspaceId: session.activeWorkspaceId,
            activeRestaurantId: session.activeRestaurantId
          }
        });
      }

      return {
        token,
        me: buildMe(record, session)
      };
    },
    async getMe(token) {
      const session = await getSession(token);
      if (!session) {
        return null;
      }

      const record = [...usersByEmail.values()].find((user) => user.profile.id === session.userId);
      if (!record) {
        return null;
      }

      return buildMe(record, session);
    },
    async getAuthContext(token) {
      const session = await getSession(token);
      if (!session) {
        return null;
      }

      const record = [...usersByEmail.values()].find((user) => user.profile.id === session.userId);
      if (!record) {
        return null;
      }

      const membership = record.memberships.find((item) => item.workspaceId === session.activeWorkspaceId);
      if (!membership) {
        return null;
      }

      return {
        ...buildMe(record, session),
        role: membership.role,
        actorUserId: record.profile.id,
        sessionId: session.id
      };
    },
    async logout(token) {
      const tokenHash = buildHash(token);
      const session = sessionsByHash.get(tokenHash);
      sessionsByHash.delete(tokenHash);

      if (prisma && session) {
        await prisma.authSession.deleteMany({ where: { id: session.id } });
      }
    },
    async setActiveContext(token, input) {
      const session = await getSession(token);
      if (!session) {
        return null;
      }

      const record = [...usersByEmail.values()].find((user) => user.profile.id === session.userId);
      if (!record) {
        return null;
      }

      const membership = record.memberships.find((item) => item.workspaceId === input.workspaceId);
      if (!membership) {
        return null;
      }

      if (!membership.restaurants.some((restaurant) => restaurant.restaurantId === input.restaurantId)) {
        return null;
      }

      session.activeWorkspaceId = input.workspaceId;
      session.activeRestaurantId = input.restaurantId;
      session.updatedAt = nowIso();
      sessionsByHash.set(session.tokenHash, session);

      if (prisma) {
        await prisma.authSession.updateMany({
          where: { id: session.id },
          data: {
            activeWorkspaceId: session.activeWorkspaceId,
            activeRestaurantId: session.activeRestaurantId,
            updatedAt: new Date(session.updatedAt)
          }
        });
      }

      return buildMe(record, session);
    }
  };
}
