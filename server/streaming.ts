import { createServer } from "http";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { EventEmitter } from "events";

interface StreamConfig {
  id: string;
  name: string;
  rtspUrl: string;
  quality?: "low" | "medium" | "high";
}

interface StreamOptions {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: string;
}

export class StreamingServer extends EventEmitter {
  private streams: Map<string, any> = new Map();
  private wss: WebSocketServer;

  constructor(server: any) {
    super();
    this.wss = new WebSocketServer({
      server,
      path: "/stream",
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", (ws, req) => {
      console.log("Streaming client connected");

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleStreamingMessage(ws, message);
        } catch (error) {
          console.error("Invalid streaming message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Streaming client disconnected");
      });
    });
  }

  private handleStreamingMessage(ws: any, message: any) {
    switch (message.type) {
      case "start_stream":
        this.startStream(ws, message.streamId, message.options);
        break;
      case "stop_stream":
        this.stopStream(message.streamId);
        break;
      case "get_streams":
        this.sendAvailableStreams(ws);
        break;
    }
  }

  // Start RTSP to WebRTC/HLS conversion
  public async startStream(
    ws: any,
    streamId: string,
    options: StreamOptions = {},
  ) {
    if (this.streams.has(streamId)) {
      console.log(`Stream ${streamId} already running`);
      return;
    }

    try {
      // Get stream config from database or config
      const streamConfig = await this.getStreamConfig(streamId);
      if (!streamConfig) {
        ws.send(JSON.stringify({ type: "error", message: "Stream not found" }));
        return;
      }

      console.log(
        `Starting stream: ${streamConfig.name} (${streamConfig.rtspUrl})`,
      );

      // Start FFmpeg process for RTSP to WebRTC
      const stream = this.createFFmpegStream(streamConfig, options);
      this.streams.set(streamId, stream);

      // Send stream started confirmation
      ws.send(
        JSON.stringify({
          type: "stream_started",
          streamId,
          name: streamConfig.name,
        }),
      );

      // Handle stream data
      stream.stdout?.on("data", (data: Buffer) => {
        // Broadcast to all connected clients
        this.broadcastStreamData(streamId, data);
      });

      stream.on("error", (error: Error) => {
        console.error(`Stream ${streamId} error:`, error);
        this.stopStream(streamId);
      });
    } catch (error) {
      console.error(`Failed to start stream ${streamId}:`, error);
      ws.send(
        JSON.stringify({ type: "error", message: "Failed to start stream" }),
      );
    }
  }

  private createFFmpegStream(config: StreamConfig, options: StreamOptions) {
    const quality = this.getQualitySettings(config.quality || "medium");

    const ffmpegArgs = [
      "-rtsp_transport",
      "tcp",
      "-i",
      config.rtspUrl,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-tune",
      "zerolatency",
      "-crf",
      quality.crf,
      "-maxrate",
      quality.bitrate,
      "-bufsize",
      quality.bufsize,
      "-vf",
      `scale=${quality.width}:${quality.height}`,
      "-r",
      quality.fps.toString(),
      "-f",
      "mpegts",
      "-fflags",
      "nobuffer",
      "-flags",
      "low_delay",
      "pipe:1",
    ];

    console.log("FFmpeg command:", "ffmpeg", ffmpegArgs.join(" "));

    return spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  private getQualitySettings(quality: string) {
    const settings = {
      low: {
        width: 640,
        height: 480,
        fps: 15,
        crf: "28",
        bitrate: "500k",
        bufsize: "1000k",
      },
      medium: {
        width: 1280,
        height: 720,
        fps: 25,
        crf: "23",
        bitrate: "1500k",
        bufsize: "3000k",
      },
      high: {
        width: 1920,
        height: 1080,
        fps: 30,
        crf: "20",
        bitrate: "3000k",
        bufsize: "6000k",
      },
    };

    return settings[quality as keyof typeof settings] || settings.medium;
  }

  private broadcastStreamData(streamId: string, data: Buffer) {
    const message = JSON.stringify({
      type: "stream_data",
      streamId,
      data: data.toString("base64"),
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  public stopStream(streamId: string) {
    const stream = this.streams.get(streamId);
    if (stream) {
      console.log(`Stopping stream: ${streamId}`);
      stream.kill("SIGTERM");
      this.streams.delete(streamId);

      // Notify clients
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "stream_stopped",
              streamId,
            }),
          );
        }
      });
    }
  }

  private sendAvailableStreams(ws: any) {
    // This would typically get streams from database
    const availableStreams = [
      {
        id: "cam-1",
        name: "Front Door",
        status: this.streams.has("cam-1") ? "active" : "inactive",
      },
      {
        id: "cam-2",
        name: "Backyard",
        status: this.streams.has("cam-2") ? "active" : "inactive",
      },
      {
        id: "cam-3",
        name: "Driveway",
        status: this.streams.has("cam-3") ? "active" : "inactive",
      },
      {
        id: "cam-4",
        name: "Side Gate",
        status: this.streams.has("cam-4") ? "active" : "inactive",
      },
    ];

    ws.send(
      JSON.stringify({
        type: "available_streams",
        streams: availableStreams,
      }),
    );
  }

  private async getStreamConfig(
    streamId: string,
  ): Promise<StreamConfig | null> {
    // This would typically query the database
    // For now, return sample data matching the storage.ts cameras
    const configs: Record<string, StreamConfig> = {
      "cam-1": {
        id: "cam-1",
        name: "Front Door",
        rtspUrl:
          "rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        quality: "medium",
      },
      "cam-2": {
        id: "cam-2",
        name: "Backyard",
        rtspUrl:
          "rtsp://demo:demo@ipvmdemo.dyndns.org:5542/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        quality: "high",
      },
      "cam-3": {
        id: "cam-3",
        name: "Driveway",
        rtspUrl:
          "rtsp://demo:demo@ipvmdemo.dyndns.org:5543/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        quality: "medium",
      },
      "cam-4": {
        id: "cam-4",
        name: "Side Gate",
        rtspUrl:
          "rtsp://demo:demo@ipvmdemo.dyndns.org:5544/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast",
        quality: "medium",
      },
    };

    return configs[streamId] || null;
  }

  public getActiveStreams(): string[] {
    return Array.from(this.streams.keys());
  }

  public stopAllStreams() {
    console.log("Stopping all streams...");
    this.streams.forEach((stream, streamId) => {
      this.stopStream(streamId);
    });
  }
}
