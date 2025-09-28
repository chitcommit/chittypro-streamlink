import { useState, useEffect, useRef, useCallback } from "react";

interface StreamOptions {
  quality?: "low" | "medium" | "high";
  autoStart?: boolean;
}

interface StreamState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  streamData: string | null;
}

export function useStream(streamId: string, options: StreamOptions = {}) {
  const [state, setState] = useState<StreamState>({
    isConnected: false,
    isStreaming: false,
    error: null,
    streamData: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/stream`;

    console.log("Connecting to streaming server:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to streaming server");
      setState((prev) => ({ ...prev, isConnected: true, error: null }));

      if (options.autoStart) {
        startStream();
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleStreamingMessage(message);
      } catch (error) {
        console.error("Failed to parse streaming message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from streaming server");
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isStreaming: false,
      }));
    };

    ws.onerror = (error) => {
      console.error("Streaming WebSocket error:", error);
      setState((prev) => ({
        ...prev,
        error: "Connection failed",
        isConnected: false,
        isStreaming: false,
      }));
    };
  }, [options.autoStart, streamId]);

  const handleStreamingMessage = useCallback(
    (message: any) => {
      switch (message.type) {
        case "stream_started":
          console.log("Stream started:", message.name);
          setState((prev) => ({ ...prev, isStreaming: true, error: null }));
          break;

        case "stream_stopped":
          console.log("Stream stopped");
          setState((prev) => ({ ...prev, isStreaming: false }));
          break;

        case "stream_data":
          if (message.streamId === streamId) {
            // Handle incoming video data
            handleVideoData(message.data);
          }
          break;

        case "error":
          console.error("Stream error:", message.message);
          setState((prev) => ({
            ...prev,
            error: message.message,
            isStreaming: false,
          }));
          break;

        case "available_streams":
          console.log("Available streams:", message.streams);
          break;
      }
    },
    [streamId],
  );

  const handleVideoData = useCallback((base64Data: string) => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Convert base64 to blob and create object URL
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "video/mp2t" });
      const url = URL.createObjectURL(blob);

      // For now, we'll need to implement proper video decoding
      // This is a simplified version - in production you'd use WebRTC or HLS.js
      setState((prev) => ({ ...prev, streamData: url }));
    } catch (error) {
      console.error("Failed to process video data:", error);
    }
  }, []);

  const startStream = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState((prev) => ({
        ...prev,
        error: "Not connected to streaming server",
      }));
      return;
    }

    console.log("Starting stream:", streamId);
    wsRef.current.send(
      JSON.stringify({
        type: "start_stream",
        streamId,
        options: {
          quality: options.quality || "medium",
        },
      }),
    );
  }, [streamId, options.quality]);

  const stopStream = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    console.log("Stopping stream:", streamId);
    wsRef.current.send(
      JSON.stringify({
        type: "stop_stream",
        streamId,
      }),
    );
  }, [streamId]);

  const getAvailableStreams = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: "get_streams",
      }),
    );
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isStreaming) {
        stopStream();
      }
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    startStream,
    stopStream,
    getAvailableStreams,
    canvasRef,
    videoRef,
  };
}
