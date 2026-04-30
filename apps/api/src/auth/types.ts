export type AuthMode = "disabled" | "dev" | "production_future";
export type WorkspaceRole = "owner" | "admin" | "member";

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
  createdAt: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
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
