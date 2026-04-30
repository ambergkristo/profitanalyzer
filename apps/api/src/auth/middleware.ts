import type express from "express";

import { getAppMode } from "../config.js";
import type { AppStore } from "../store/types.js";
import type { AuthService } from "./service.js";
import type { AuthContext, WorkspaceRole } from "./types.js";

type AppRequest = express.Request & {
  authContext?: AuthContext;
  effectiveDatasetId?: string;
};

const roleRank: Record<WorkspaceRole, number> = {
  owner: 3,
  admin: 2,
  member: 1
};

export function readBearerToken(request: express.Request) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export interface RequireAccessOptions {
  minimumRole?: WorkspaceRole;
}

export function requireAccess(
  authService: AuthService,
  store: AppStore,
  environment: NodeJS.ProcessEnv | undefined,
  options: RequireAccessOptions = {}
) {
  return async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const appMode = getAppMode(environment);

    if (appMode === "demo") {
      next();
      return;
    }

    if (!authService.isAuthRequired()) {
      response.status(503).json({
        message: "Auth is disabled for a non-demo mode."
      });
      return;
    }

    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ message: "Authentication is required." });
      return;
    }

    const authContext = await authService.getAuthContext(token);
    if (!authContext) {
      response.status(401).json({ message: "Session is invalid or expired." });
      return;
    }

    if (
      options.minimumRole &&
      roleRank[authContext.role] < roleRank[options.minimumRole]
    ) {
      response.status(403).json({ message: "You do not have access to this action." });
      return;
    }

    const requestWithAuth = request as AppRequest;
    requestWithAuth.authContext = authContext;
    requestWithAuth.effectiveDatasetId = authContext.activeRestaurantId;

    const resolved = store.getResolvedDataset(authContext.activeRestaurantId);
    if (!resolved) {
      response.status(403).json({ message: "Workspace context does not map to a valid restaurant." });
      return;
    }

    next();
  };
}

export function resolveScopedDatasetId(
  request: express.Request,
  requestedDatasetId: string | undefined
) {
  const requestWithAuth = request as AppRequest;
  if (!requestWithAuth.authContext) {
    return requestedDatasetId;
  }

  if (
    requestedDatasetId &&
    requestedDatasetId.trim().length > 0 &&
    requestedDatasetId !== requestWithAuth.authContext.activeRestaurantId
  ) {
    return "forbidden";
  }

  return requestWithAuth.authContext.activeRestaurantId;
}

export function getRequestAuthContext(request: express.Request) {
  return (request as AppRequest).authContext ?? null;
}
