import { useQuery } from "@tanstack/react-query";
import CameraGrid from "@/components/camera-grid";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Settings, Share, Grid3x3 } from "lucide-react";
import type { Camera as CameraType } from "@shared/schema";
import { useWhitelabel } from "@/hooks/use-whitelabel";

export default function CameraDashboard() {
  const { config, loading: loadingConfig } = useWhitelabel();

  const { data: cameras = [], isLoading: loadingCameras } = useQuery<
    CameraType[]
  >({
    queryKey: ["/api/cameras"],
  });

  const { data: user, isLoading: loadingUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  if (loadingCameras || loadingUser || loadingConfig) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Loading {config.shortName || "camera system"}...
          </p>
        </div>
      </div>
    );
  }

  const currentUser = {
    id: user?.id || "user-1",
    name: user?.firstName || user?.username || "Camera Admin",
    avatar:
      user?.profileImageUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName || "Admin"}`,
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Camera className="text-accent" size={24} />
              <h1 className="text-xl font-bold">
                {config.name || "Camera System"}
              </h1>
            </div>

            <Badge
              variant="outline"
              className="bg-accent/10 text-accent border-accent/30"
            >
              {cameras.length} Cameras
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {config.features.multiCamera && (
              <Button variant="ghost" size="sm">
                <Grid3x3 className="mr-2" size={16} />
                Layout
              </Button>
            )}

            {config.features.guestAccess && (
              <Button variant="ghost" size="sm">
                <Share className="mr-2" size={16} />
                Share
              </Button>
            )}

            <Button variant="ghost" size="sm">
              <Plus className="mr-2" size={16} />
              Add Camera
            </Button>

            <Button variant="ghost" size="sm">
              <Settings className="mr-2" size={16} />
              Settings
            </Button>

            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-border">
              <img
                src={currentUser.avatar}
                alt="User avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium">{currentUser.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Camera Grid */}
        <CameraGrid cameras={cameras} />

        {/* Sidebar - only show if chat is enabled */}
        {config.features.chat && <Sidebar currentUser={currentUser} />}
      </div>

      {/* Footer Status Bar */}
      <footer className="border-t border-border bg-card px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>System Status: Online</span>
            <span>•</span>
            <span>
              {cameras.filter((c) => c.isActive).length} Active Streams
            </span>
            <span>•</span>
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span>Connected</span>
            {config.branding.customFooter && (
              <>
                <span>•</span>
                <span>{config.branding.customFooter}</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
