import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password"), // hashed password
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("viewer"), // owner, admin, viewer, guest
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cameras = pgTable("cameras", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  resolution: text("resolution").default("1080p"),
  hasPTZ: boolean("has_ptz").default(false),
  position: jsonb("position").$type<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>(),
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLayouts = pgTable("user_layouts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  layoutName: text("layout_name").notNull(),
  cameraPositions:
    jsonb("camera_positions").$type<
      Record<string, { x: number; y: number; width: number; height: number }>
    >(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guestSessions = pgTable("guest_sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id")
    .notNull()
    .references(() => users.id),
  inviteToken: text("invite_token").notNull().unique(),
  shareUrl: text("share_url").notNull().unique(), // one-time link URL
  expiresAt: timestamp("expires_at").notNull(),
  allowedCameras: text("allowed_cameras").array(),
  canRecord: boolean("can_record").default(false),
  canPTZ: boolean("can_ptz").default(false),
  maxUsers: integer("max_users").default(1), // concurrent users for this link
  currentUsers: integer("current_users").default(0),
  isActive: boolean("is_active").default(true),
  isOneTime: boolean("is_one_time").default(false), // revoked after first use
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  createdBy: varchar("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recordingRequests = pgTable("recording_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id")
    .notNull()
    .references(() => users.id),
  cameraId: varchar("camera_id")
    .notNull()
    .references(() => cameras.id),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, denied
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  messageType: text("message_type").default("text"), // text, system, notification
  createdAt: timestamp("created_at").defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  cameraId: varchar("camera_id")
    .notNull()
    .references(() => cameras.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  filePath: text("file_path").notNull(),
  duration: integer("duration"), // in seconds
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  isLocal: boolean("is_local").default(false), // local device recording vs server recording
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for share link usage tracking
export const shareLinks = pgTable("share_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  sessionId: varchar("session_id")
    .notNull()
    .references(() => guestSessions.id),
  createdBy: varchar("created_by")
    .notNull()
    .references(() => users.id),
  accessedBy: text("accessed_by"), // IP or user agent
  accessedAt: timestamp("accessed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  createdAt: true,
});

export const insertUserLayoutSchema = createInsertSchema(userLayouts).omit({
  id: true,
  createdAt: true,
});

export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({
  id: true,
  createdAt: true,
});

export const insertRecordingRequestSchema = createInsertSchema(
  recordingRequests,
).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export const insertShareLinkSchema = createInsertSchema(shareLinks).omit({
  id: true,
  createdAt: true,
  accessedAt: true,
  revokedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type UserLayout = typeof userLayouts.$inferSelect;
export type InsertUserLayout = z.infer<typeof insertUserLayoutSchema>;
export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type RecordingRequest = typeof recordingRequests.$inferSelect;
export type InsertRecordingRequest = z.infer<
  typeof insertRecordingRequestSchema
>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
