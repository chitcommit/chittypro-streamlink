import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, AlertCircle } from "lucide-react";

interface HLSPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoadedData?: () => void;
}

export default function HLSPlayer({
  src,
  poster,
  autoPlay = true,
  muted = true,
  className = "",
  onError,
  onLoadStart,
  onLoadedData,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<string>("auto");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initHLS = () => {
      setIsLoading(true);
      setError(null);
      onLoadStart?.();

      // Check if browser supports HLS natively
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = src;
        video.addEventListener("loadeddata", () => {
          setIsLoading(false);
          onLoadedData?.();
        });
        video.addEventListener("error", handleVideoError);

        if (autoPlay) {
          video.play().catch(handlePlayError);
        }
      } else if (Hls.isSupported()) {
        // Use HLS.js for other browsers
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 3,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 3,
        });

        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest parsed");
          setIsLoading(false);
          onLoadedData?.();

          if (autoPlay) {
            video.play().catch(handlePlayError);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError("Network error - check your connection");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError("Media error - trying to recover");
                hls.recoverMediaError();
                break;
              default:
                setError("Fatal error occurred");
                hls.destroy();
                break;
            }
          }

          onError?.(data);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const level = hls.levels[data.level];
          setQuality(level ? `${level.height}p` : "auto");
        });
      } else {
        setError("HLS is not supported in this browser");
        setIsLoading(false);
      }
    };

    const handleVideoError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      setError(`Video error: ${video.error?.message || "Unknown error"}`);
      setIsLoading(false);
    };

    const handlePlayError = (err: Error) => {
      console.warn("Autoplay failed:", err);
      // Autoplay failed, but that's okay - user will need to click play
    };

    // Initialize HLS
    initHLS();

    // Video event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("error", handleVideoError);
      video.removeEventListener("loadeddata", () => {});
    };
  }, [src, autoPlay, onError, onLoadStart, onLoadedData]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.error("Play failed:", err);
        setError("Failed to play video");
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const retry = () => {
    setError(null);
    setIsLoading(true);

    // Reinitialize HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Force re-initialization by updating the effect
    const video = videoRef.current;
    if (video) {
      video.src = "";
      video.load();

      // Re-trigger the effect
      setTimeout(() => {
        video.src = src;
      }, 100);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={poster}
        muted={isMuted}
        playsInline
        controls={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-red-400 p-4">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p className="text-sm mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {quality && (
              <Badge
                variant="outline"
                className="text-xs text-white border-white/50"
              >
                {quality}
              </Badge>
            )}

            <Badge
              variant="outline"
              className={`text-xs ${
                error
                  ? "border-red-500 text-red-300"
                  : isLoading
                    ? "border-yellow-500 text-yellow-300"
                    : "border-green-500 text-green-300"
              }`}
            >
              {error ? "ERROR" : isLoading ? "LOADING" : "LIVE"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
