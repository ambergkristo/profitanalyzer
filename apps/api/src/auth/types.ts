export type AuthMode = "disabled" | "dev" | "password" | "external_oidc_future";
export type WorkspaceRole = "owner" | "admin" | "member";
export type UserStatus = "active" | "disabled" | "invited";

export interface AuthWorkspaceRestaurant {
  restaurantId: string;
  restaurantName: string;
}

export interface AuthWorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  restaurants: AuthWorkspaceRestaurant[];
}

export interface AuthUserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  emailVerifiedAt?: string;
  createdAt: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  lastSeenAt?: string;
  userAgent?: string;
  ipHash?: string;
  createdAt: string;
  updatedAt: string;
  activeWorkspaceId: string;
  activeRestaurantId: string;
}

export interface AuthMeResponse {
  user: AuthUserProfile;
  workspaces: AuthWorkspaceMembership[];
  activeWorkspaceId: string;
  activeRestaurantId: string;
}

export interface AuthContext extends AuthMeResponse {
  role: WorkspaceRole;
  actorUserId: string;
  sessionId: string;
}
