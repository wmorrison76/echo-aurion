import { createClient } from "@supabase/supabase-js";
let supabase: ReturnType<typeof createClient> | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );
}
export interface LayerLock {
  layerId: string;
  designId: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}
export interface DesignPermission {
  designId: string;
  userId: string;
  permission: "owner" | "editor" | "commenter" | "viewer";
  grantedAt: number;
}
export interface ShareLink {
  linkId: string;
  designId: string;
  permission: "view" | "comment" | "edit";
  token: string;
  expiresAt: number | null;
  createdAt: number;
}
class CollaborationStore {
  private layerLocks: Map<string, LayerLock> = new Map();
  private permissions: Map<string, DesignPermission[]> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();
  lockLayer(
    layerId: string,
    designId: string,
    userId: string,
    userName: string,
  ): LayerLock {
    const lockKey = `${designId}:${layerId}`;
    const lock: LayerLock = {
      layerId,
      designId,
      userId,
      userName,
      lockedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    this.layerLocks.set(lockKey, lock);
    return lock;
  }
  unlockLayer(layerId: string, designId: string): boolean {
    const lockKey = `${designId}:${layerId}`;
    const lock = this.layerLocks.get(lockKey);
    if (!lock) return false;
    this.layerLocks.delete(lockKey);
    return true;
  }
  getLayerLock(layerId: string, designId: string): LayerLock | null {
    const lockKey = `${designId}:${layerId}`;
    const lock = this.layerLocks.get(lockKey);
    if (!lock) return null;
    if (lock.expiresAt < Date.now()) {
      this.layerLocks.delete(lockKey);
      return null;
    }
    return lock;
  }
  grantPermission(
    designId: string,
    userId: string,
    permission: "owner" | "editor" | "commenter" | "viewer",
  ): DesignPermission {
    const permKey = designId;
    if (!this.permissions.has(permKey)) {
      this.permissions.set(permKey, []);
    }
    const perm: DesignPermission = {
      designId,
      userId,
      permission,
      grantedAt: Date.now(),
    };
    const perms = this.permissions.get(permKey)!;
    const existingIndex = perms.findIndex((p) => p.userId === userId);
    if (existingIndex >= 0) {
      perms[existingIndex] = perm;
    } else {
      perms.push(perm);
    }
    return perm;
  }
  getPermission(designId: string, userId: string): DesignPermission | null {
    const perms = this.permissions.get(designId);
    if (!perms) return null;
    return perms.find((p) => p.userId === userId) || null;
  }
  hasPermission(
    designId: string,
    userId: string,
    requiredPermission: "owner" | "editor" | "commenter" | "viewer",
  ): boolean {
    const perm = this.getPermission(designId, userId);
    if (!perm) return false;
    const permissionHierarchy = {
      owner: 4,
      editor: 3,
      commenter: 2,
      viewer: 1,
    };
    return (
      permissionHierarchy[perm.permission] >=
      permissionHierarchy[requiredPermission]
    );
  }
  createShareLink(
    designId: string,
    permission: "view" | "comment" | "edit",
    expiresAt: number | null = null,
  ): ShareLink {
    const token = this.generateToken();
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const link: ShareLink = {
      linkId,
      designId,
      permission,
      token,
      expiresAt,
      createdAt: Date.now(),
    };
    this.shareLinks.set(token, link);
    return link;
  }
  getShareLink(token: string): ShareLink | null {
    const link = this.shareLinks.get(token);
    if (!link) return null;
    if (link.expiresAt && link.expiresAt < Date.now()) {
      this.shareLinks.delete(token);
      return null;
    }
    return link;
  }
  revokeShareLink(token: string): boolean {
    return this.shareLinks.delete(token);
  }
  private generateToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
export default new CollaborationStore();
