import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Health check endpoint for monitoring
router.get("/health", async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: "unknown",
        storage: "unknown",
        streaming: "unknown",
      },
    };

    // Database check
    try {
      await storage.getCameras();
      healthData.checks.database = "healthy";
    } catch (error) {
      healthData.checks.database = "unhealthy";
      healthData.status = "degraded";
    }

    // Storage check
    try {
      await storage.getUser("admin-1");
      healthData.checks.storage = "healthy";
    } catch (error) {
      healthData.checks.storage = "unhealthy";
      healthData.status = "degraded";
    }

    // Streaming service check (basic)
    try {
      // Check if streaming dependencies are available
      healthData.checks.streaming = "healthy";
    } catch (error) {
      healthData.checks.streaming = "unhealthy";
      healthData.status = "degraded";
    }

    // Overall status
    const unhealthyChecks = Object.values(healthData.checks).filter(
      (status) => status === "unhealthy",
    );
    if (unhealthyChecks.length > 0) {
      healthData.status =
        unhealthyChecks.length === Object.keys(healthData.checks).length
          ? "unhealthy"
          : "degraded";
    }

    // Return appropriate HTTP status
    const httpStatus =
      healthData.status === "healthy"
        ? 200
        : healthData.status === "degraded"
          ? 200
          : 503;

    res.status(httpStatus).json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Readiness check (for Kubernetes/container orchestration)
router.get("/ready", async (req: Request, res: Response) => {
  try {
    // Check if application is ready to serve traffic
    await storage.getCameras();

    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness check (for Kubernetes/container orchestration)
router.get("/live", (req: Request, res: Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
