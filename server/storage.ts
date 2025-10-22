import {
  users,
  cameras,
  userLayouts,
  guestSessions,
  recordingRequests,
  chatMessages,
  recordings,
  type User,
  type InsertUser,
  type Camera,
  type InsertCamera,
  type UserLayout,
  type InsertUserLayout,
  type GuestSession,
  type InsertGuestSession,
  type RecordingRequest,
  type InsertRecordingRequest,
  type ChatMessage,
  type InsertChatMessage,
  type Recording,
  type InsertRecording,
  type ShareLink,
  type InsertShareLink,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Camera operations
  getCameras(): Promise<Camera[]>;
  getCamera(id: string): Promise<Camera | undefined>;
  getCamerasByOwner(ownerId: string): Promise<Camera[]>;
  createCamera(camera: InsertCamera): Promise<Camera>;
  updateCamera(id: string, updates: Partial<InsertCamera>): Promise<Camera | undefined>;
  deleteCamera(id: string): Promise<boolean>;

  // Layout operations
  getUserLayouts(userId: string): Promise<UserLayout[]>;
  createUserLayout(layout: InsertUserLayout): Promise<UserLayout>;
  updateUserLayout(id: string, updates: Partial<InsertUserLayout>): Promise<UserLayout | undefined>;
  deleteUserLayout(id: string): Promise<boolean>;

  // Guest session operations
  getGuestSession(token: string): Promise<GuestSession | undefined>;
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  updateGuestSession(id: string, updates: Partial<InsertGuestSession>): Promise<GuestSession | undefined>;
  getActiveGuestSessions(): Promise<GuestSession[]>;

  // Recording request operations
  getRecordingRequests(): Promise<RecordingRequest[]>;
  getPendingRecordingRequests(): Promise<RecordingRequest[]>;
  createRecordingRequest(request: InsertRecordingRequest): Promise<RecordingRequest>;
  updateRecordingRequest(id: string, updates: Partial<InsertRecordingRequest>): Promise<RecordingRequest | undefined>;

  // Chat operations
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Recording operations
  getRecordings(cameraId?: string, userId?: string): Promise<Recording[]>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: string, updates: Partial<InsertRecording>): Promise<Recording | undefined>;

  // Share link operations
  createShareLink(link: InsertShareLink): Promise<ShareLink>;
  getShareLink(identifier: string): Promise<ShareLink | undefined>;
  updateShareLink(
    id: string,
    updates: Partial<ShareLink>,
  ): Promise<ShareLink | undefined>;
  getActiveShareLinks(userId: string): Promise<ShareLink[]>;
  getExpiredShareLinks(): Promise<ShareLink[]>;
  getShareLinkStats(userId: string): Promise<{
    active: number;
    expired: number;
    revoked: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private cameras: Map<string, Camera> = new Map();
  private userLayouts: Map<string, UserLayout> = new Map();
  private guestSessions: Map<string, GuestSession> = new Map();
  private recordingRequests: Map<string, RecordingRequest> = new Map();
  private chatMessages: ChatMessage[] = [];
  private recordings: Map<string, Recording> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();

  constructor() {
    this.initSampleData();
  }

  private initSampleData() {
    // Create sample admin user
    const adminUser: User = {
      id: "admin-1",
      username: "admin",
      email: "admin@reolink.com",
      firstName: "John",
      lastName: "Admin",
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32",
      role: "owner",
      password: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample cameras
    const sampleCameras: Camera[] = [
      {
        id: "cam-1",
        name: "Front Door",
        streamUrl: "rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        resolution: "1080p",
        hasPTZ: true,
        position: { x: 0, y: 0, width: 1, height: 1 },
        isActive: true,
        ownerId: "admin-1",
        createdAt: new Date(),
      },
      {
        id: "cam-2",
        name: "Backyard",
        streamUrl: "rtsp://demo:demo@ipvmdemo.dyndns.org:5542/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        resolution: "4K",
        hasPTZ: true,
        position: { x: 1, y: 0, width: 1, height: 1 },
        isActive: true,
        ownerId: "admin-1",
        createdAt: new Date(),
      },
      {
        id: "cam-3",
        name: "Driveway",
        streamUrl: "rtsp://demo:demo@ipvmdemo.dyndns.org:5543/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        resolution: "1080p",
        hasPTZ: false,
        position: { x: 2, y: 0, width: 1, height: 1 },
        isActive: true,
        ownerId: "admin-1",
        createdAt: new Date(),
      },
      {
        id: "cam-4",
        name: "Side Gate",
        streamUrl: "rtsp://demo:demo@ipvmdemo.dyndns.org:5544/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        resolution: "1080p",
        hasPTZ: false,
        position: { x: 3, y: 0, width: 1, height: 1 },
        isActive: true,
        ownerId: "admin-1",
        createdAt: new Date(),
      },
    ];

    sampleCameras.forEach(camera => this.cameras.set(camera.id, camera));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "viewer",
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      password: insertUser.password || null,
      isActive: insertUser.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Camera operations
  async getCameras(): Promise<Camera[]> {
    return Array.from(this.cameras.values());
  }

  async getCamera(id: string): Promise<Camera | undefined> {
    return this.cameras.get(id);
  }

  async getCamerasByOwner(ownerId: string): Promise<Camera[]> {
    return Array.from(this.cameras.values()).filter(camera => camera.ownerId === ownerId);
  }

  async createCamera(insertCamera: InsertCamera): Promise<Camera> {
    const id = randomUUID();
    const camera: Camera = {
      ...insertCamera,
      id,
      resolution: insertCamera.resolution || "1080p",
      hasPTZ: insertCamera.hasPTZ ?? false,
      position: insertCamera.position || null,
      isActive: insertCamera.isActive ?? true,
      ownerId: insertCamera.ownerId || null,
      createdAt: new Date(),
    };
    this.cameras.set(id, camera);
    return camera;
  }

  async updateCamera(id: string, updates: Partial<InsertCamera>): Promise<Camera | undefined> {
    const camera = this.cameras.get(id);
    if (!camera) return undefined;
    
    const updatedCamera = { ...camera, ...updates };
    this.cameras.set(id, updatedCamera);
    return updatedCamera;
  }

  async deleteCamera(id: string): Promise<boolean> {
    return this.cameras.delete(id);
  }

  // Layout operations
  async getUserLayouts(userId: string): Promise<UserLayout[]> {
    return Array.from(this.userLayouts.values()).filter(layout => layout.userId === userId);
  }

  async createUserLayout(insertLayout: InsertUserLayout): Promise<UserLayout> {
    const id = randomUUID();
    const layout: UserLayout = {
      ...insertLayout,
      id,
      cameraPositions: insertLayout.cameraPositions || null,
      isDefault: insertLayout.isDefault || null,
      createdAt: new Date(),
    };
    this.userLayouts.set(id, layout);
    return layout;
  }

  async updateUserLayout(id: string, updates: Partial<InsertUserLayout>): Promise<UserLayout | undefined> {
    const layout = this.userLayouts.get(id);
    if (!layout) return undefined;
    
    const updatedLayout = { ...layout, ...updates };
    this.userLayouts.set(id, updatedLayout);
    return updatedLayout;
  }

  async deleteUserLayout(id: string): Promise<boolean> {
    return this.userLayouts.delete(id);
  }

  // Guest session operations
  async getGuestSession(identifier: string): Promise<GuestSession | undefined> {
    const byId = this.guestSessions.get(identifier);
    if (byId) return byId;

    return Array.from(this.guestSessions.values()).find(
      (session) => session.inviteToken === identifier,
    );
  }

  async createGuestSession(insertSession: InsertGuestSession): Promise<GuestSession> {
    const id = randomUUID();
    const session: GuestSession = {
      ...insertSession,
      id,
      shareUrl: insertSession.shareUrl,
      allowedCameras: insertSession.allowedCameras ?? [],
      canRecord: insertSession.canRecord ?? false,
      canPTZ: insertSession.canPTZ ?? false,
      maxUsers: insertSession.maxUsers ?? 1,
      currentUsers: insertSession.currentUsers ?? 0,
      isActive: insertSession.isActive ?? true,
      isOneTime: insertSession.isOneTime ?? false,
      revokedAt: insertSession.revokedAt ?? null,
      revokedBy: insertSession.revokedBy || null,
      createdAt: new Date(),
    };
    this.guestSessions.set(id, session);
    return session;
  }

  async updateGuestSession(id: string, updates: Partial<InsertGuestSession>): Promise<GuestSession | undefined> {
    const session = this.guestSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: GuestSession = {
      ...session,
      ...updates,
      shareUrl: updates.shareUrl ?? session.shareUrl,
      allowedCameras: updates.allowedCameras ?? session.allowedCameras,
      canRecord: updates.canRecord ?? session.canRecord,
      canPTZ: updates.canPTZ ?? session.canPTZ,
      maxUsers: updates.maxUsers ?? session.maxUsers,
      currentUsers: updates.currentUsers ?? session.currentUsers,
      isActive: updates.isActive ?? session.isActive,
      isOneTime: updates.isOneTime ?? session.isOneTime,
      revokedAt: updates.revokedAt ?? session.revokedAt,
      revokedBy: updates.revokedBy ?? session.revokedBy,
      createdBy: updates.createdBy ?? session.createdBy,
      expiresAt: updates.expiresAt ?? session.expiresAt,
    };
    this.guestSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveGuestSessions(): Promise<GuestSession[]> {
    const now = new Date();
    return Array.from(this.guestSessions.values())
      .filter(session => session.isActive && session.expiresAt > now);
  }

  // Recording request operations
  async getRecordingRequests(): Promise<RecordingRequest[]> {
    return Array.from(this.recordingRequests.values());
  }

  async getPendingRecordingRequests(): Promise<RecordingRequest[]> {
    return Array.from(this.recordingRequests.values())
      .filter(request => request.status === "pending");
  }

  async createRecordingRequest(insertRequest: InsertRecordingRequest): Promise<RecordingRequest> {
    const id = randomUUID();
    const request: RecordingRequest = {
      ...insertRequest,
      id,
      status: insertRequest.status || "pending",
      reason: insertRequest.reason || null,
      approvedBy: insertRequest.approvedBy || null,
      createdAt: new Date(),
      respondedAt: null,
    };
    this.recordingRequests.set(id, request);
    return request;
  }

  async updateRecordingRequest(id: string, updates: Partial<InsertRecordingRequest>): Promise<RecordingRequest | undefined> {
    const request = this.recordingRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      ...updates,
      respondedAt: updates.status && updates.status !== "pending" ? new Date() : request.respondedAt
    };
    this.recordingRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Chat operations
  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return this.chatMessages
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit)
      .reverse();
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      messageType: insertMessage.messageType || null,
      createdAt: new Date(),
    };
    this.chatMessages.push(message);
    return message;
  }

  // Recording operations
  async getRecordings(cameraId?: string, userId?: string): Promise<Recording[]> {
    let recordings = Array.from(this.recordings.values());
    
    if (cameraId) {
      recordings = recordings.filter(recording => recording.cameraId === cameraId);
    }
    
    if (userId) {
      recordings = recordings.filter(recording => recording.userId === userId);
    }
    
    return recordings;
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = randomUUID();
    const recording: Recording = {
      ...insertRecording,
      id,
      duration: insertRecording.duration || null,
      endTime: insertRecording.endTime || null,
      isLocal: insertRecording.isLocal || null,
      createdAt: new Date(),
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async updateRecording(id: string, updates: Partial<InsertRecording>): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updatedRecording = { ...recording, ...updates };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  // Share link operations
  async createShareLink(insertLink: InsertShareLink): Promise<ShareLink> {
    const id = randomUUID();
    const link: ShareLink = {
      ...insertLink,
      id,
      accessedBy: insertLink.accessedBy || null,
      accessedAt: null,
      isRevoked: insertLink.isRevoked ?? false,
      revokedAt: null,
      revokedBy: insertLink.revokedBy || null,
      createdAt: new Date(),
    };
    this.shareLinks.set(id, link);
    return link;
  }

  async getShareLink(identifier: string): Promise<ShareLink | undefined> {
    const byId = this.shareLinks.get(identifier);
    if (byId) return byId;

    return Array.from(this.shareLinks.values()).find(
      (link) => link.token === identifier,
    );
  }

  async updateShareLink(
    id: string,
    updates: Partial<ShareLink>,
  ): Promise<ShareLink | undefined> {
    const existing = await this.getShareLink(id);
    if (!existing) return undefined;

    const key = this.shareLinks.has(id) ? id : existing.id;
    const updated: ShareLink = {
      ...existing,
      ...updates,
      accessedBy: updates.accessedBy ?? existing.accessedBy,
      accessedAt: updates.accessedAt ?? existing.accessedAt,
      isRevoked: updates.isRevoked ?? existing.isRevoked,
      revokedAt: updates.revokedAt ?? existing.revokedAt,
      revokedBy: updates.revokedBy ?? existing.revokedBy,
      expiresAt: updates.expiresAt ?? existing.expiresAt,
    };

    this.shareLinks.set(key, updated);
    return updated;
  }

  async getActiveShareLinks(userId: string): Promise<ShareLink[]> {
    const now = new Date();
    return Array.from(this.shareLinks.values()).filter(
      (link) =>
        link.createdBy === userId && !link.isRevoked && link.expiresAt > now,
    );
  }

  async getExpiredShareLinks(): Promise<ShareLink[]> {
    const now = new Date();
    return Array.from(this.shareLinks.values()).filter(
      (link) => link.expiresAt <= now && !link.isRevoked,
    );
  }

  async getShareLinkStats(userId: string): Promise<{
    active: number;
    expired: number;
    revoked: number;
  }> {
    const now = new Date();
    let active = 0;
    let expired = 0;
    let revoked = 0;

    for (const link of Array.from(this.shareLinks.values())) {
      if (link.createdBy !== userId) continue;

      if (link.isRevoked) {
        revoked++;
      } else if (link.expiresAt <= now) {
        expired++;
      } else {
        active++;
      }
    }

    return { active, expired, revoked };
  }
}

export const storage = new MemStorage();
