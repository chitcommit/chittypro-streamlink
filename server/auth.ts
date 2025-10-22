import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRES_IN = "24h";
const BCRYPT_ROUNDS = 12;

export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

// JWT token generation
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT token verification
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Password verification
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication middleware
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}

// Optional authentication (for guest access)
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await storage.getUser(decoded.userId);
        if (user) {
          req.user = user;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for guest access
    next();
  }
}

// Role-based authorization
export function authorize(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
}

// Owner or admin authorization
export function authorizeOwnerOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const allowedRoles = ["owner", "admin"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Owner or admin privileges required.",
    });
  }

  next();
}

// Stream access authorization
export function authorizeStreamAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: "Authentication required for streaming" });
  }

  // Check if user has streaming permissions
  const streamingRoles = ["owner", "admin", "viewer"];
  if (!streamingRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Streaming privileges required.",
    });
  }

  next();
}

// Guest session validation
export async function validateGuestSession(token: string): Promise<boolean> {
  try {
    const session = await storage.getGuestSession(token);
    if (!session) return false;

    // Check if session is active and not expired
    const now = new Date();
    return Boolean(session.isActive) && session.expiresAt > now;
  } catch (error) {
    console.error("Guest session validation error:", error);
    return false;
  }
}

// WebSocket authentication
export async function authenticateWebSocket(
  token: string,
): Promise<User | null> {
  try {
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await storage.getUser(decoded.userId);
    return user || null;
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    return null;
  }
}

// Create default admin user
export async function createDefaultAdmin(): Promise<void> {
  try {
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("Default admin user already exists");
      return;
    }

    // Create default admin user
    const hashedPassword = await hashPassword("admin123");
    const adminUser = await storage.createUser({
      username: "admin",
      password: hashedPassword,
      email: "admin@derail.me",
      firstName: "System",
      lastName: "Administrator",
      role: "owner",
    });

    console.log("Default admin user created:", adminUser.username);
    console.log("Default password: admin123 (CHANGE THIS IMMEDIATELY)");
  } catch (error) {
    console.error("Failed to create default admin user:", error);
  }
}

// Session cleanup
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    // This would typically clean up expired JWT tokens from a blacklist
    // For now, we'll clean up expired guest sessions
    const sessions = await storage.getActiveGuestSessions();
    const now = new Date();

    for (const session of sessions) {
      if (session.expiresAt <= now) {
        await storage.updateGuestSession(session.id, { isActive: false });
      }
    }
  } catch (error) {
    console.error("Session cleanup error:", error);
  }
}

// Rate limiting helper
export function createRateLimit(windowMs: number, max: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of Array.from(requests.entries())) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Check current IP
    const current = requests.get(ip) || { count: 0, resetTime: now + windowMs };

    if (current.resetTime < now) {
      // Reset window
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    requests.set(ip, current);

    if (current.count > max) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });
    }

    next();
  };
}
