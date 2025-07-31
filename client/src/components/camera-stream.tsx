import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Move, 
  ZoomIn, 
  ZoomOut, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Video,
  RecordIcon,
  MoreVertical,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Camera } from "@shared/schema";

interface CameraStreamProps {
  camera: Camera;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export default function CameraStream({ 
  camera, 
  onDragStart, 
  onDragEnd, 
  isDragging = false 
}: CameraStreamProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePTZControl = async (command: string, value?: number) => {
    if (!camera.hasPTZ) return;
    
    try {
      await apiRequest("POST", `/api/cameras/${camera.id}/ptz`, {
        command,
        value: value || 1
      });
      
      toast({
        title: "PTZ Control",
        description: `Camera ${command} command sent`,
      });
    } catch (error) {
      toast({
        title: "PTZ Failed",
        description: "Failed to send PTZ command",
        variant: "destructive",
      });
    }
  };

  const handleRecordingRequest = async () => {
    try {
      await apiRequest("POST", "/api/recording-requests", {
        cameraId: camera.id,
        reason: "Manual recording request"
      });
      
      toast({
        title: "Recording Requested",
        description: "Recording request has been submitted for approval",
      });
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to submit recording request",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Card 
      className={`
        relative h-full bg-elevated border-gray-600 overflow-hidden group
        ${isDragging ? 'opacity-50 rotate-2 z-50' : ''}
        ${camera.hasPTZ ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Camera Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${isVisible ? 'bg-accent text-accent-foreground' : 'bg-gray-600 text-gray-300'}`}
            >
              {camera.name}
            </Badge>
            {camera.resolution && (
              <Badge variant="outline" className="text-xs bg-primary/20 text-primary">
                {camera.resolution}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleVisibility}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <MoreVertical size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface border-elevated">
                <DropdownMenuItem onClick={handleRecordingRequest}>
                  <RecordIcon className="mr-2 h-4 w-4" />
                  Request Recording
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Video Stream */}
      {isVisible ? (
        <div className="video-container h-full relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onContextMenu={(e) => e.preventDefault()}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
          >
            <source src={camera.streamUrl} type="application/x-mpegURL" />
            Your browser does not support the video tag.
          </video>
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-16 left-3 flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>REC</span>
            </div>
          )}
          
          {/* Stream Overlay - Prevents right-click and selection */}
          <div 
            className="absolute inset-0 bg-transparent"
            onContextMenu={(e) => e.preventDefault()}
            onSelectStart={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <EyeOff className="mx-auto mb-2" size={32} />
            <p className="text-sm">Camera Hidden</p>
          </div>
        </div>
      )}

      {/* PTZ Controls */}
      {camera.hasPTZ && isVisible && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            {/* Pan/Tilt Controls */}
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('up')}
              >
                <ArrowUp size={12} />
              </Button>
              <div></div>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('left')}
              >
                <ArrowLeft size={12} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                title="Move"
              >
                <Move size={12} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('right')}
              >
                <ArrowRight size={12} />
              </Button>
              
              <div></div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('down')}
              >
                <ArrowDown size={12} />
              </Button>
              <div></div>
            </div>

            {/* Zoom Controls */}
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('zoom_in')}
              >
                <ZoomIn size={12} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onMouseDown={() => handlePTZControl('zoom_out')}
              >
                <ZoomOut size={12} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}