import { randomBytes } from "crypto";
import { storage } from "./storage";
import type { User, GuestSession, ShareLink } from "@shared/schema";

export interface ShareLinkOptions {
  duration: number; // in milliseconds
  allowedCameras: string[];
  canRecord?: boolean;
  canPTZ?: boolean;
  maxUsers?: number;
  isOneTime?: boolean;
}

export interface ShareLinkResult {
  shareUrl: string;
  token: string;
  expiresAt: Date;
  guestSession: GuestSession;
  shareLink: ShareLink;
}

export class SharingService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.APP_URL || "https://derail.me") {
    this.baseUrl = baseUrl;
  }

  // Generate secure random token
  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  // Create one-time or temporary share link
  async createShareLink(
    createdBy: string,
    options: ShareLinkOptions,
  ): Promise<ShareLinkResult> {
    try {
      const token = this.generateToken();
      const shareUrl = `${this.baseUrl}/share/${token}`;
      const expiresAt = new Date(Date.now() + options.duration);

      // Create guest user for this session
      const guestUser = await storage.createUser({
        username: `guest_${Date.now()}`,
        firstName: "Guest User",
        role: "guest",
      });

      // Create guest session
      const guestSession = await storage.createGuestSession({
        guestId: guestUser.id,
        inviteToken: token,
        shareUrl,
        expiresAt,
        allowedCameras: options.allowedCameras,
        canRecord: options.canRecord || false,
        canPTZ: options.canPTZ || false,
        maxUsers: options.maxUsers || 1,
        currentUsers: 0,
        isActive: true,
        isOneTime: options.isOneTime || false,
        createdBy: createdBy,
      });

      // Create share link tracking
      const shareLink = await storage.createShareLink({
        token,
        sessionId: guestSession.id,
        createdBy,
        expiresAt,
        isRevoked: false,
      });

      return {
        shareUrl,
        token,
        expiresAt,
        guestSession,
        shareLink,
      };
    } catch (error) {
      console.error("Failed to create share link:", error);
      throw new Error("Failed to create share link");
    }
  }

  // Validate and access share link
  async accessShareLink(
    token: string,
    accessInfo: { ip?: string; userAgent?: string },
  ) {
    try {
      const shareLink = await storage.getShareLink(token);
      if (!shareLink) {
        throw new Error("Share link not found");
      }

      const now = new Date();

      // Check if link is expired
      if (shareLink.expiresAt <= now) {
        throw new Error("Share link has expired");
      }

      // Check if link is revoked
      if (shareLink.isRevoked) {
        throw new Error("Share link has been revoked");
      }

      // Get associated guest session
      const guestSession = await storage.getGuestSession(shareLink.sessionId);
      if (!guestSession || !guestSession.isActive) {
        throw new Error("Guest session is not active");
      }

      // Check concurrent user limit
      const currentUsers = guestSession.currentUsers ?? 0;
      const maxUsers = guestSession.maxUsers ?? 1;

      if (currentUsers >= maxUsers) {
        throw new Error("Maximum concurrent users reached for this link");
      }

      // Track access
      await storage.updateShareLink(shareLink.id, {
        accessedBy: `${accessInfo.ip || "unknown"} - ${accessInfo.userAgent || "unknown"}`,
        accessedAt: now,
      });

      // Update current user count
      await storage.updateGuestSession(guestSession.id, {
        currentUsers: currentUsers + 1,
      });

      // Revoke one-time link after first access
      if (guestSession.isOneTime) {
        await this.revokeShareLink(
          token,
          guestSession.createdBy,
          "One-time use completed",
        );
      }

      return {
        guestSession,
        shareLink,
        guestUser: await storage.getUser(guestSession.guestId),
      };
    } catch (error) {
      console.error("Failed to access share link:", error);
      throw error;
    }
  }

  // Revoke share link (owner can revoke)
  async revokeShareLink(token: string, revokedBy: string, reason?: string) {
    try {
      const shareLink = await storage.getShareLink(token);
      if (!shareLink) {
        throw new Error("Share link not found");
      }

      const guestSession = await storage.getGuestSession(shareLink.sessionId);
      if (!guestSession) {
        throw new Error("Guest session not found");
      }

      // Check if user has permission to revoke
      const revoker = await storage.getUser(revokedBy);
      if (!revoker) {
        throw new Error("Invalid user");
      }

      const canRevoke =
        revoker.id === guestSession.createdBy ||
        ["owner", "admin"].includes(revoker.role);

      if (!canRevoke) {
        throw new Error("Insufficient permissions to revoke share link");
      }

      const now = new Date();

      // Revoke share link
      await storage.updateShareLink(shareLink.id, {
        isRevoked: true,
        revokedAt: now,
        revokedBy,
      });

      // Deactivate guest session
      await storage.updateGuestSession(guestSession.id, {
        isActive: false,
        revokedAt: now,
        revokedBy,
      });

      console.log(
        `Share link revoked by ${revoker.username}: ${reason || "No reason provided"}`,
      );

      return { success: true, message: "Share link revoked successfully" };
    } catch (error) {
      console.error("Failed to revoke share link:", error);
      throw error;
    }
  }

  // Get all active share links for a user
  async getActiveShareLinks(userId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user || !["owner", "admin"].includes(user.role)) {
        throw new Error("Insufficient permissions");
      }

      const activeLinks = await storage.getActiveShareLinks(userId);

      // Get detailed information for each link
      const detailedLinks = await Promise.all(
        activeLinks.map(async (link) => {
          const session = await storage.getGuestSession(link.sessionId);
          const guestUser = session
            ? await storage.getUser(session.guestId)
            : null;

          return {
            ...link,
            session,
            guestUser,
            isExpired: link.expiresAt <= new Date(),
            isActive: !link.isRevoked && link.expiresAt > new Date(),
          };
        }),
      );

      return detailedLinks;
    } catch (error) {
      console.error("Failed to get active share links:", error);
      throw error;
    }
  }

  // Cleanup expired links
  async cleanupExpiredLinks() {
    try {
      const now = new Date();
      const expiredLinks = await storage.getExpiredShareLinks();

      for (const link of expiredLinks) {
        if (!link.isRevoked) {
          await storage.updateShareLink(link.id, {
            isRevoked: true,
            revokedAt: now,
            revokedBy: "system", // System cleanup
          });
        }

        // Also deactivate associated guest sessions
        const session = await storage.getGuestSession(link.sessionId);
        if (session && session.isActive) {
          await storage.updateGuestSession(session.id, {
            isActive: false,
            revokedAt: now,
            revokedBy: "system",
          });
        }
      }

      console.log(`Cleaned up ${expiredLinks.length} expired share links`);
      return expiredLinks.length;
    } catch (error) {
      console.error("Failed to cleanup expired links:", error);
      throw error;
    }
  }

  // Get share link statistics
  async getShareLinkStats(userId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user || !["owner", "admin"].includes(user.role)) {
        throw new Error("Insufficient permissions");
      }

      const stats = await storage.getShareLinkStats(userId);
      return stats;
    } catch (error) {
      console.error("Failed to get share link stats:", error);
      throw error;
    }
  }

  // Generate quick access link for specific camera
  async createQuickCameraLink(
    createdBy: string,
    cameraId: string,
    duration: number = 24 * 60 * 60 * 1000, // 24 hours default
  ) {
    return this.createShareLink(createdBy, {
      duration,
      allowedCameras: [cameraId],
      canRecord: false,
      canPTZ: false,
      maxUsers: 1,
      isOneTime: false,
    });
  }

  // Generate one-time emergency access link
  async createEmergencyLink(
    createdBy: string,
    duration: number = 60 * 60 * 1000, // 1 hour default
  ) {
    const cameras = await storage.getCameras();
    const allCameraIds = cameras.map((cam) => cam.id);

    return this.createShareLink(createdBy, {
      duration,
      allowedCameras: allCameraIds,
      canRecord: true,
      canPTZ: true,
      maxUsers: 1,
      isOneTime: true,
    });
  }

  // Decrease current user count when user disconnects
  async userDisconnected(token: string) {
    try {
      const shareLink = await storage.getShareLink(token);
      if (!shareLink) return;

      const guestSession = await storage.getGuestSession(shareLink.sessionId);
      if (!guestSession) return;

      const currentUsers = guestSession.currentUsers ?? 0;
      const newCount = Math.max(0, currentUsers - 1);
      await storage.updateGuestSession(guestSession.id, {
        currentUsers: newCount,
      });

      console.log(
        `User disconnected from share link. Current users: ${newCount}`,
      );
    } catch (error) {
      console.error("Failed to handle user disconnection:", error);
    }
  }
}

// Export singleton instance
export const sharingService = new SharingService();
