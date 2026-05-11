import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import { getAppMode } from "../config.js";
import { getDatabaseUrl, getStoreDriver } from "../store/persistence.js";
import type { AppStore } from "../store/types.js";
import type {
  AuthContext,
  AuthMeResponse,
  AuthMode,
  AuthSessionRecord,
  AuthUserProfile,
  AuthWorkspaceMembership,
  UserStatus,
  WorkspaceRole
} from "./types.js";

const scrypt = promisify(scryptCallback);
const passwordHashPrefix = "scrypt";

function nowIso() {
  return new Date().toISOString();
}

function buildHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildSessionExpiry(environment: NodeJS.ProcessEnv) {
  const ttlHours = Number(environment.SESSION_TTL_HOURS ?? 168);
  const safeTtlHours = Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 168;
  return new Date(Date.now() + 1000 * 60 * 60 * safeTtlHours).toISOString();
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim().toLowerCase());
}

function getPasswordMinLength(environment: NodeJS.ProcessEnv) {
  const configured = Number(environment.PASSWORD_MIN_LENGTH ?? 10);
  return Number.isFinite(configured) && configured >= 10 ? Math.floor(configured) : 10;
}

function isPublicSignupAllowed(environment: NodeJS.ProcessEnv) {
  return environment.ALLOW_PUBLIC_SIGNUP === "true";
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${passwordHashPrefix}$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encodedHash: string | undefined) {
  if (!encodedHash) {
    return false;
  }

  const [algorithm, salt, hash] = encodedHash.split("$");
  if (algorithm !== passwordHashPrefix || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface DevLoginInput {
  email: string;
  workspaceId?: string;
  role?: WorkspaceRole;
}

export interface PasswordRegisterInput {
  email: string;
  name: string;
  password: string;
  workspaceId?: string;
}

export interface PasswordLoginInput {
  email: string;
  password: string;
}

interface AuthUserRecord {
  profile: AuthUserProfile;
  memberships: AuthWorkspaceMembership[];
  passwordHash?: string;
}

export interface AuthService {
  initialize(): Promise<void>;
  getMode(): AuthMode;
  isAuthRequired(): boolean;
  devLogin(input: DevLoginInput): Promise<{ token: string; me: AuthMeResponse }>;
  register(input: PasswordRegisterInput): Promise<{ token: string; me: AuthMeResponse }>;
  login(input: PasswordLoginInput): Promise<{ token: string; me: AuthMeResponse }>;
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

  if (environment.AUTH_MODE === "password") {
    return "password";
  }

  if (environment.AUTH_MODE === "external_oidc_future") {
    return "external_oidc_future";
  }

  return "dev";
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

function normalizeUserStatus(value: string | null | undefined): UserStatus {
  return value === "disabled" || value === "invited" ? value : "active";
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

  async function persistMemberships(profile: AuthUserProfile, memberships: AuthWorkspaceMembership[], passwordHash?: string) {
    if (!prisma) {
      return;
    }

    await prisma.user.upsert({
      where: { id: profile.id },
      update: {
        email: profile.email,
        name: profile.name,
        status: profile.status,
        passwordHash: passwordHash ?? undefined
      },
      create: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        status: profile.status,
        passwordHash
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
      status: "active",
      createdAt: nowIso()
    };

    const record: AuthUserRecord = {
      profile,
      memberships
    };

    usersByEmail.set(email, record);
    await persistMemberships(profile, memberships);

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

  async function createSession(record: AuthUserRecord) {
    const firstMembership = record.memberships[0];
    if (!firstMembership || firstMembership.restaurants.length === 0) {
      throw new Error("No workspace membership is available for this user.");
    }

    const token = randomBytes(24).toString("hex");
    const session: AuthSessionRecord = {
      id: `session-${randomBytes(8).toString("hex")}`,
      userId: record.profile.id,
      tokenHash: buildHash(token),
      expiresAt: buildSessionExpiry(environment),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastSeenAt: nowIso(),
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
          lastSeenAt: session.lastSeenAt ? new Date(session.lastSeenAt) : null,
          activeWorkspaceId: session.activeWorkspaceId,
          activeRestaurantId: session.activeRestaurantId
        },
        create: {
          id: session.id,
          userId: session.userId,
          tokenHash: session.tokenHash,
          expiresAt: new Date(session.expiresAt),
          lastSeenAt: session.lastSeenAt ? new Date(session.lastSeenAt) : null,
          activeWorkspaceId: session.activeWorkspaceId,
          activeRestaurantId: session.activeRestaurantId
        }
      });
    }

    return {
      token,
      me: buildMe(record, session)
    };
  }

  async function loadUserRecordByEmail(email: string) {
    const existing = usersByEmail.get(email);
    if (existing) {
      return existing;
    }

    if (!prisma) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                restaurants: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    const record: AuthUserRecord = {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: normalizeUserStatus(user.status),
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        createdAt: user.createdAt.toISOString()
      },
      passwordHash: user.passwordHash ?? undefined,
      memberships: user.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        role: membership.role,
        restaurants: membership.workspace.restaurants.map((restaurant) => ({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name
        }))
      }))
    };
    usersByEmail.set(email, record);
    return record;
  }

  async function loadUserRecordById(userId: string) {
    const existing = [...usersByEmail.values()].find((user) => user.profile.id === userId);
    if (existing) {
      return existing;
    }

    if (!prisma) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                restaurants: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    const record: AuthUserRecord = {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: normalizeUserStatus(user.status),
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        createdAt: user.createdAt.toISOString()
      },
      passwordHash: user.passwordHash ?? undefined,
      memberships: user.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        role: membership.role,
        restaurants: membership.workspace.restaurants.map((restaurant) => ({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name
        }))
      }))
    };
    usersByEmail.set(user.email, record);
    return record;
  }

  async function getSession(token: string) {
    await initialize();
    const tokenHash = buildHash(token);
    let session = sessionsByHash.get(tokenHash);
    if (!session && prisma) {
      const persisted = await prisma.authSession.findUnique({
        where: { tokenHash }
      });

      if (persisted) {
        session = {
          id: persisted.id,
          userId: persisted.userId,
          tokenHash: persisted.tokenHash,
          expiresAt: persisted.expiresAt.toISOString(),
          revokedAt: persisted.revokedAt?.toISOString(),
          lastSeenAt: persisted.lastSeenAt?.toISOString(),
          userAgent: persisted.userAgent ?? undefined,
          ipHash: persisted.ipHash ?? undefined,
          createdAt: persisted.createdAt.toISOString(),
          updatedAt: persisted.updatedAt.toISOString(),
          activeWorkspaceId: persisted.activeWorkspaceId,
          activeRestaurantId: persisted.activeRestaurantId
        };
        sessionsByHash.set(tokenHash, session);
      }
    }

    if (!session) {
      return null;
    }

    if (session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionsByHash.delete(session.tokenHash);
      return null;
    }

    session.lastSeenAt = nowIso();
    sessionsByHash.set(session.tokenHash, session);

    if (prisma) {
      await prisma.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: {
          lastSeenAt: new Date(session.lastSeenAt),
          updatedAt: new Date(session.lastSeenAt)
        }
      });
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
      if (authMode !== "dev" || appMode === "production") {
        throw new DevAuthUnavailableError(`Dev login is unavailable when AUTH_MODE=${authMode}.`);
      }

      if (!input.email.trim()) {
        throw new Error("email is required.");
      }

      return createSession(await ensureUser(input));
    },
    async register(input) {
      if (authMode !== "password") {
        throw new DevAuthUnavailableError(`Password registration is unavailable when AUTH_MODE=${authMode}.`);
      }

      await initialize();
      const email = input.email.trim().toLowerCase();
      const minLength = getPasswordMinLength(environment);

      if (!isValidEmail(email)) {
        throw new Error("A valid email is required.");
      }

      if (input.password.length < minLength) {
        throw new Error(`Password must be at least ${minLength} characters.`);
      }

      if (!isPublicSignupAllowed(environment) && !input.workspaceId) {
        throw new Error("Public signup is disabled.");
      }

      if (await loadUserRecordByEmail(email)) {
        throw new Error("User already exists.");
      }

      const memberships = buildMemberships(options.store, appMode, input.workspaceId).map((membership) => ({
        ...membership,
        role: "owner" as const
      }));
      const passwordHash = await hashPassword(input.password);
      const profile: AuthUserProfile = {
        id: buildUserId(email),
        email,
        name: input.name.trim() || buildUserName(email),
        status: "active",
        createdAt: nowIso()
      };
      const record: AuthUserRecord = { profile, memberships, passwordHash };
      usersByEmail.set(email, record);
      await persistMemberships(profile, memberships, passwordHash);

      return createSession(record);
    },
    async login(input) {
      if (authMode !== "password") {
        throw new DevAuthUnavailableError(`Password login is unavailable when AUTH_MODE=${authMode}.`);
      }

      await initialize();
      const record = await loadUserRecordByEmail(input.email.trim().toLowerCase());
      if (!record || record.profile.status !== "active" || !(await verifyPassword(input.password, record.passwordHash))) {
        throw new Error("Invalid credentials.");
      }

      return createSession(record);
    },
    async getMe(token) {
      const session = await getSession(token);
      if (!session) {
        return null;
      }

      const record = await loadUserRecordById(session.userId);
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

      const record = await loadUserRecordById(session.userId);
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
        await prisma.authSession.updateMany({
          where: { id: session.id },
          data: {
            revokedAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    },
    async setActiveContext(token, input) {
      const session = await getSession(token);
      if (!session) {
        return null;
      }

      const record = await loadUserRecordById(session.userId);
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
