import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertChatMessageSchema,
  insertRecordingRequestSchema,
  insertGuestSessionSchema,
} from "@shared/schema";
import { randomUUID } from "crypto";
import healthRoutes from "./routes/health";
import {
  ChittyIntegration,
  getChittyIntegration,
} from "./services/chittyIntegration";

export async function registerRoutes(
  app: Express,
  integration?: ChittyIntegration,
): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time chat and notifications
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const connectedClients = new Map<string, WebSocket>();

  wss.on("connection", (ws: WebSocket) => {
    const clientId = randomUUID();
    connectedClients.set(clientId, ws);

    console.log(`Client ${clientId} connected`);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "chat_message") {
          // Store the message
          const chatMessage = await storage.createChatMessage({
            userId: message.userId,
            message: message.content,
            messageType: "text",
          });

          // Get user info for the message
          const user = await storage.getUser(message.userId);

          // Broadcast to all connected clients
          const broadcastData = {
            type: "chat_message",
            data: {
              ...chatMessage,
              user,
            },
          };

          connectedClients.forEach((client, id) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastData));
            } else {
              connectedClients.delete(id);
            }
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      connectedClients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });
  });

  // REST API routes

  // Health check routes
  app.use("/api", healthRoutes);

  // White-label configuration route
  app.get("/config/whitelabel-derail.json", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const configPath = path.join(
        process.cwd(),
        "config",
        "whitelabel-derail.json",
      );
      const configData = await fs.readFile(configPath, "utf-8");
      res.json(JSON.parse(configData));
    } catch (error) {
      console.error("Error loading white-label config:", error);
      res.status(404).json({ message: "White-label configuration not found" });
    }
  });

  // User routes
  app.get("/api/user", async (req, res) => {
    try {
      const chitty = integration ?? getChittyIntegration();
      const profile = await chitty.fetchOwnerProfile();

      if (profile) {
        return res.json({
          id: profile.id,
          chittyId: profile.chittyId ?? profile.id,
          email: profile.email,
          username: profile.username ?? profile.email ?? profile.id,
          firstName: profile.displayName ?? profile.username ?? profile.email,
          role: profile.roles?.[0] ?? "owner",
          roles: profile.roles ?? ["owner"],
          profileImageUrl: profile.picture ?? null,
        });
      }

      const fallback = await storage.getUser("admin-1");
      if (!fallback) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(fallback);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Camera routes
  app.get("/api/cameras", async (req, res) => {
    try {
      const cameras = await storage.getCameras();
      res.json(cameras);
    } catch (error) {
      console.error("Error fetching cameras:", error);
      res.status(500).json({ message: "Failed to fetch cameras" });
    }
  });

  app.get("/api/cameras/:id", async (req, res) => {
    try {
      const camera = await storage.getCamera(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: "Camera not found" });
      }
      res.json(camera);
    } catch (error) {
      console.error("Error fetching camera:", error);
      res.status(500).json({ message: "Failed to fetch camera" });
    }
  });

  // Chat routes
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(limit);

      // Get user info for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return { ...message, user };
        }),
      );

      res.json(messagesWithUsers);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Recording request routes
  app.get("/api/recording-requests", async (req, res) => {
    try {
      const requests = await storage.getPendingRecordingRequests();

      // Get user and camera info for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.requesterId);
          const camera = await storage.getCamera(request.cameraId);
          return { ...request, user, camera };
        }),
      );

      res.json(requestsWithDetails);
    } catch (error) {
      console.error("Error fetching recording requests:", error);
      res.status(500).json({ message: "Failed to fetch recording requests" });
    }
  });

  app.post("/api/recording-requests", async (req, res) => {
    try {
      const validatedData = insertRecordingRequestSchema.parse(req.body);
      const request = await storage.createRecordingRequest(validatedData);

      // Broadcast notification to admins
      const notificationData = {
        type: "recording_request",
        data: request,
      };

      connectedClients.forEach((client, id) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notificationData));
        } else {
          connectedClients.delete(id);
        }
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating recording request:", error);
      res.status(500).json({ message: "Failed to create recording request" });
    }
  });

  app.patch("/api/recording-requests/:id", async (req, res) => {
    try {
      const { status, approvedBy } = req.body;
      const updatedRequest = await storage.updateRecordingRequest(
        req.params.id,
        {
          status,
          approvedBy,
        },
      );

      if (!updatedRequest) {
        return res.status(404).json({ message: "Recording request not found" });
      }

      // Broadcast status update
      const notificationData = {
        type: "recording_request_update",
        data: updatedRequest,
      };

      connectedClients.forEach((client, id) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notificationData));
        } else {
          connectedClients.delete(id);
        }
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating recording request:", error);
      res.status(500).json({ message: "Failed to update recording request" });
    }
  });

  // Guest session routes
  app.post("/api/guest-sessions", async (req, res) => {
    try {
      const {
        guestName,
        duration,
        allowedCameras,
        canRecord,
        canPTZ = false,
        maxUsers = 1,
      } = req.body;

      const chitty = integration ?? getChittyIntegration();
      let guestIdentifier: string;

      try {
        guestIdentifier = await chitty.mintGuestChittyId(guestName);
      } catch (mintError) {
        console.warn("ChittyID mint failed, falling back to UUID", mintError);
        guestIdentifier = `CHITTY-GUEST-${randomUUID().slice(0, 8)}`;
      }

      // Create guest user
      const guestUser = await storage.createUser({
        username: guestIdentifier,
        firstName: guestName,
        role: "guest",
        email: `${guestIdentifier.toLowerCase()}@guest.chitty.cc`,
      });

      // Calculate expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + parseDuration(duration));

      const inviteToken = randomUUID();
      const host = req.get("host");
      const protocol = req.protocol;
      const shareUrl = `${protocol}://${host}/guest/${inviteToken}`;
      const createdBy = (req as any).user?.id || "admin-1";

      // Create guest session
      const session = await storage.createGuestSession({
        guestId: guestUser.id,
        inviteToken,
        shareUrl,
        expiresAt,
        allowedCameras,
        canRecord: Boolean(canRecord),
        canPTZ: Boolean(canPTZ),
        maxUsers,
        currentUsers: 0,
        isActive: true,
        isOneTime: false,
        createdBy,
      });

      res.status(201).json({
        ...session,
        guestChittyId: guestIdentifier,
        inviteUrl: shareUrl,
      });
    } catch (error) {
      console.error("Error creating guest session:", error);
      res.status(500).json({ message: "Failed to create guest session" });
    }
  });

  app.get("/api/guest-sessions/active", async (req, res) => {
    try {
      const sessions = await storage.getActiveGuestSessions();

      // Get user info for each session
      const sessionsWithUsers = await Promise.all(
        sessions.map(async (session) => {
          const user = await storage.getUser(session.guestId);
          return { ...session, user };
        }),
      );

      res.json(sessionsWithUsers);
    } catch (error) {
      console.error("Error fetching active guest sessions:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch active guest sessions" });
    }
  });

  // PTZ control routes
  app.post("/api/cameras/:id/ptz", async (req, res) => {
    try {
      const { direction, speed = 5 } = req.body;
      const camera = await storage.getCamera(req.params.id);

      if (!camera) {
        return res.status(404).json({ message: "Camera not found" });
      }

      if (!camera.hasPTZ) {
        return res.status(400).json({ message: "Camera does not support PTZ" });
      }

      // TODO: Implement actual PTZ control via camera API
      console.log(
        `PTZ command for camera ${camera.name}: ${direction} at speed ${speed}`,
      );

      res.json({ message: "PTZ command sent successfully" });
    } catch (error) {
      console.error("Error sending PTZ command:", error);
      res.status(500).json({ message: "Failed to send PTZ command" });
    }
  });

  // Layout routes
  app.get("/api/layouts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const layouts = await storage.getUserLayouts(userId);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching layouts:", error);
      res.status(500).json({ message: "Failed to fetch layouts" });
    }
  });

  app.post("/api/layouts", async (req, res) => {
    try {
      const { userId, layoutName, cameraPositions, isDefault } = req.body;

      const layout = await storage.createUserLayout({
        userId,
        layoutName,
        cameraPositions,
        isDefault,
      });

      res.status(201).json(layout);
    } catch (error) {
      console.error("Error creating layout:", error);
      res.status(500).json({ message: "Failed to create layout" });
    }
  });

  return httpServer;
}

function parseDuration(duration: string): number {
  const value = parseInt(duration.slice(0, -1));
  const unit = duration.slice(-1);

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000; // default 1 hour
  }
}
