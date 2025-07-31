import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertChatMessageSchema, insertRecordingRequestSchema, insertGuestSessionSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time chat and notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    connectedClients.set(clientId, ws);
    
    console.log(`Client ${clientId} connected`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat_message') {
          // Store the message
          const chatMessage = await storage.createChatMessage({
            userId: message.userId,
            message: message.content,
            messageType: 'text'
          });

          // Get user info for the message
          const user = await storage.getUser(message.userId);
          
          // Broadcast to all connected clients
          const broadcastData = {
            type: 'chat_message',
            data: {
              ...chatMessage,
              user
            }
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
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });
  });

  // REST API routes
  
  // User routes
  app.get('/api/user', async (req, res) => {
    try {
      // For now, return the admin user as the current user
      const user = await storage.getUser('admin-1');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });
  
  // Camera routes
  app.get('/api/cameras', async (req, res) => {
    try {
      const cameras = await storage.getCameras();
      res.json(cameras);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      res.status(500).json({ message: 'Failed to fetch cameras' });
    }
  });

  app.get('/api/cameras/:id', async (req, res) => {
    try {
      const camera = await storage.getCamera(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      res.json(camera);
    } catch (error) {
      console.error('Error fetching camera:', error);
      res.status(500).json({ message: 'Failed to fetch camera' });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(limit);
      
      // Get user info for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return { ...message, user };
        })
      );
      
      res.json(messagesWithUsers);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  // Recording request routes
  app.get('/api/recording-requests', async (req, res) => {
    try {
      const requests = await storage.getPendingRecordingRequests();
      
      // Get user and camera info for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const user = await storage.getUser(request.requesterId);
          const camera = await storage.getCamera(request.cameraId);
          return { ...request, user, camera };
        })
      );
      
      res.json(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching recording requests:', error);
      res.status(500).json({ message: 'Failed to fetch recording requests' });
    }
  });

  app.post('/api/recording-requests', async (req, res) => {
    try {
      const validatedData = insertRecordingRequestSchema.parse(req.body);
      const request = await storage.createRecordingRequest(validatedData);
      
      // Broadcast notification to admins
      const notificationData = {
        type: 'recording_request',
        data: request
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
      console.error('Error creating recording request:', error);
      res.status(500).json({ message: 'Failed to create recording request' });
    }
  });

  app.patch('/api/recording-requests/:id', async (req, res) => {
    try {
      const { status, approvedBy } = req.body;
      const updatedRequest = await storage.updateRecordingRequest(req.params.id, {
        status,
        approvedBy
      });
      
      if (!updatedRequest) {
        return res.status(404).json({ message: 'Recording request not found' });
      }
      
      // Broadcast status update
      const notificationData = {
        type: 'recording_request_update',
        data: updatedRequest
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
      console.error('Error updating recording request:', error);
      res.status(500).json({ message: 'Failed to update recording request' });
    }
  });

  // Guest session routes
  app.post('/api/guest-sessions', async (req, res) => {
    try {
      const { guestName, duration, allowedCameras, canRecord } = req.body;
      
      // Create guest user
      const guestUser = await storage.createUser({
        username: `guest_${Date.now()}`,
        firstName: guestName,
        role: 'guest'
      });

      // Calculate expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + parseDuration(duration));
      
      // Create guest session
      const session = await storage.createGuestSession({
        guestId: guestUser.id,
        inviteToken: randomUUID(),
        expiresAt,
        allowedCameras,
        canRecord,
        isActive: true
      });
      
      res.status(201).json({
        ...session,
        inviteUrl: `${req.protocol}://${req.get('host')}/guest/${session.inviteToken}`
      });
    } catch (error) {
      console.error('Error creating guest session:', error);
      res.status(500).json({ message: 'Failed to create guest session' });
    }
  });

  app.get('/api/guest-sessions/active', async (req, res) => {
    try {
      const sessions = await storage.getActiveGuestSessions();
      
      // Get user info for each session
      const sessionsWithUsers = await Promise.all(
        sessions.map(async (session) => {
          const user = await storage.getUser(session.guestId);
          return { ...session, user };
        })
      );
      
      res.json(sessionsWithUsers);
    } catch (error) {
      console.error('Error fetching active guest sessions:', error);
      res.status(500).json({ message: 'Failed to fetch active guest sessions' });
    }
  });

  // PTZ control routes
  app.post('/api/cameras/:id/ptz', async (req, res) => {
    try {
      const { direction, speed = 5 } = req.body;
      const camera = await storage.getCamera(req.params.id);
      
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      if (!camera.hasPTZ) {
        return res.status(400).json({ message: 'Camera does not support PTZ' });
      }
      
      // TODO: Implement actual PTZ control via camera API
      console.log(`PTZ command for camera ${camera.name}: ${direction} at speed ${speed}`);
      
      res.json({ message: 'PTZ command sent successfully' });
    } catch (error) {
      console.error('Error sending PTZ command:', error);
      res.status(500).json({ message: 'Failed to send PTZ command' });
    }
  });

  // Layout routes
  app.get('/api/layouts', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const layouts = await storage.getUserLayouts(userId);
      res.json(layouts);
    } catch (error) {
      console.error('Error fetching layouts:', error);
      res.status(500).json({ message: 'Failed to fetch layouts' });
    }
  });

  app.post('/api/layouts', async (req, res) => {
    try {
      const { userId, layoutName, cameraPositions, isDefault } = req.body;
      
      const layout = await storage.createUserLayout({
        userId,
        layoutName,
        cameraPositions,
        isDefault
      });
      
      res.status(201).json(layout);
    } catch (error) {
      console.error('Error creating layout:', error);
      res.status(500).json({ message: 'Failed to create layout' });
    }
  });

  return httpServer;
}

function parseDuration(duration: string): number {
  const value = parseInt(duration.slice(0, -1));
  const unit = duration.slice(-1);
  
  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000; // default 1 hour
  }
}
