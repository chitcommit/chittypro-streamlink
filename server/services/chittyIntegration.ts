import { randomUUID } from "crypto";

interface AuthToken {
  accessToken: string;
  expiresAt: number;
  scope: string[];
}

interface ChittyAuthUser {
  id: string;
  chittyId?: string;
  email?: string;
  username?: string;
  displayName?: string;
  roles?: string[];
  picture?: string;
}

interface RegisterPayload {
  service: string;
  version: string;
  chittyId?: string;
  endpoints: Record<string, string>;
  capabilities: string[];
  status: "active" | "inactive";
  sessionId: string;
  framework: string;
  lastHeartbeat: string;
}

function encodeBasicAuth(id: string, secret: string): string {
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export class ChittyAuthClient {
  private token: AuthToken | null = null;

  constructor(
    private readonly authUrl: string,
    private readonly clientId?: string,
    private readonly clientSecret?: string,
    private readonly scope: string =
      "schema:read schema:write evidence:manage cases:manage mcp:agent",
  ) {}

  private ensureCredentials() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "ChittyAuth credentials are not configured. Set CHITTYAUTH_CLIENT_ID and CHITTYAUTH_CLIENT_SECRET.",
      );
    }
  }

  private isExpired(): boolean {
    if (!this.token) return true;
    return Date.now() >= this.token.expiresAt - 30_000;
  }

  private async requestToken(): Promise<AuthToken> {
    this.ensureCredentials();

    const response = await fetch(`${this.authUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodeBasicAuth(
          this.clientId!,
          this.clientSecret!,
        )}`,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        scope: this.scope,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `ChittyAuth token request failed (${response.status}): ${detail}`,
      );
    }

    const body = (await response.json()) as {
      access_token: string;
      expires_in: number;
      scope?: string;
    };

    const token: AuthToken = {
      accessToken: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
      scope: body.scope ? body.scope.split(" ") : this.scope.split(" "),
    };

    this.token = token;
    return token;
  }

  async getAccessToken(): Promise<string> {
    if (!this.token || this.isExpired()) {
      await this.requestToken();
    }

    return this.token!.accessToken;
  }

  async getUserInfo(): Promise<ChittyAuthUser | null> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.authUrl}/api/user/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as any;
      return {
        id: data.id ?? data.userId ?? data.chittyId ?? "unknown",
        chittyId: data.chittyId ?? data.id,
        email: data.email,
        username: data.username ?? data.email,
        displayName:
          data.displayName ?? data.name ?? data.username ?? data.email,
        roles: data.roles ?? data.permissions ?? [],
        picture: data.picture ?? data.avatar,
      };
    } catch (error) {
      console.warn("ChittyAuth getUserInfo failed", error);
      return null;
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.authUrl}/api/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.warn("ChittyAuth API key validation failed", error);
      return false;
    }
  }
}

export class ChittyIdClient {
  constructor(
    private readonly serviceUrl: string,
    private readonly apiKey?: string,
  ) {}

  async mint(entity: string, metadata: Record<string, any> = {}): Promise<string> {
    const response = await fetch(`${this.serviceUrl}/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        entity,
        metadata,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `ChittyID mint failed (${response.status}): ${detail}`,
      );
    }

    const body = (await response.json()) as { chittyId: string };
    return body.chittyId;
  }
}

export class ChittyRegistryClient {
  constructor(
    private readonly registryUrl: string,
    private readonly apiKey?: string,
  ) {}

  async registerService(payload: RegisterPayload): Promise<void> {
    try {
      const response = await fetch(`${this.registryUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Registry registration failed (${response.status}): ${detail}`,
        );
      }
    } catch (error) {
      console.warn("ChittyRegistry registration failed", error);
    }
  }

  async heartbeat(sessionId: string, service: string): Promise<void> {
    try {
      const response = await fetch(`${this.registryUrl}/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          service,
          status: "active",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn("ChittyRegistry heartbeat failed", error);
    }
  }
}

export class ChittyIntegration {
  private readonly authClient: ChittyAuthClient;
  private readonly idClient: ChittyIdClient;
  private readonly registryClient: ChittyRegistryClient;
  private readonly sessionId: string = randomUUID();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    const authUrl =
      process.env.CHITTYAUTH_URL?.trim() || "https://auth.chitty.cc";
    const chittyIdUrl =
      process.env.CHITTYID_SERVICE_URL?.trim() || "https://id.chitty.cc/v1";
    const registryUrl =
      process.env.CHITTY_REGISTRY_URL?.trim() ||
      "https://registry.chitty.cc/api/v1";

    this.authClient = new ChittyAuthClient(
      authUrl,
      process.env.CHITTYAUTH_CLIENT_ID,
      process.env.CHITTYAUTH_CLIENT_SECRET,
      process.env.CHITTYAUTH_SCOPE,
    );

    this.idClient = new ChittyIdClient(
      chittyIdUrl,
      process.env.CHITTYID_API_KEY,
    );

    this.registryClient = new ChittyRegistryClient(
      registryUrl,
      process.env.CHITTY_REGISTRY_API_KEY,
    );
  }

  async ensureRegistered(): Promise<void> {
    const serviceName =
      process.env.CHITTY_SERVICE_NAME || "chittypro-streamlink";

    const payload: RegisterPayload = {
      service: serviceName,
      version: process.env.CHITTY_SERVICE_VERSION || "1.0.0",
      chittyId: process.env.CHITTY_SERVICE_CHITTYID,
      endpoints: {
        api: process.env.CHITTY_SERVICE_API_URL || "http://localhost:5000/api",
        health:
          process.env.CHITTY_SERVICE_HEALTH_URL ||
          "http://localhost:5000/api/health",
        streaming:
          process.env.CHITTY_SERVICE_STREAM_URL ||
          "http://localhost:5000/stream",
      },
      capabilities: [
        "camera_streaming",
        "guest_access",
        "ptz_control",
        "recording_management",
      ],
      status: "active",
      sessionId: this.sessionId,
      framework: "ChittyPro Streamlink",
      lastHeartbeat: new Date().toISOString(),
    };

    await this.registryClient.registerService(payload);

    const heartbeatInterval = Number(
      process.env.CHITTY_REGISTRY_HEARTBEAT_MS || 60000,
    );

    if (heartbeatInterval > 0) {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }

      this.heartbeatTimer = setInterval(() => {
        this.registryClient
          .heartbeat(this.sessionId, payload.service)
          .catch(console.warn);
      }, heartbeatInterval);
    }
  }

  async fetchOwnerProfile(): Promise<ChittyAuthUser | null> {
    return this.authClient.getUserInfo();
  }

  async mintGuestChittyId(name?: string): Promise<string> {
    const metadata = {
      createdBy: "chittypro-streamlink",
      createdAt: new Date().toISOString(),
      name,
    };

    return this.idClient.mint("ACTOR", metadata);
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    return this.authClient.validateApiKey(apiKey);
  }
}

let integration: ChittyIntegration | null = null;

export function getChittyIntegration(): ChittyIntegration {
  if (!integration) {
    integration = new ChittyIntegration();
  }

  return integration;
}

export async function initializeChittyIntegration() {
  try {
    await getChittyIntegration().ensureRegistered();
  } catch (error) {
    console.warn("Chitty integration registration skipped:", error);
  }
}
