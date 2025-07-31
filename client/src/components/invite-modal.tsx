import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Link } from "lucide-react";
import type { Camera } from "@shared/schema";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: Camera[];
}

export default function InviteModal({ isOpen, onClose, cameras }: InviteModalProps) {
  const [guestName, setGuestName] = useState("");
  const [duration, setDuration] = useState("1h");
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [canRecord, setCanRecord] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();

  const handleCameraToggle = (cameraId: string, checked: boolean) => {
    setSelectedCameras(prev => 
      checked 
        ? [...prev, cameraId]
        : prev.filter(id => id !== cameraId)
    );
  };

  const handleGenerateInvite = async () => {
    if (!guestName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a guest name",
        variant: "destructive",
      });
      return;
    }

    if (selectedCameras.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one camera",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await apiRequest("POST", "/api/guest-sessions", {
        guestName: guestName.trim(),
        duration,
        allowedCameras: selectedCameras,
        canRecord
      });

      const data = await response.json();
      setInviteUrl(data.inviteUrl);

      toast({
        title: "Invite Generated",
        description: "Guest invite link has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link Copied",
        description: "Invite link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setGuestName("");
    setDuration("1h");
    setSelectedCameras([]);
    setCanRecord(false);
    setInviteUrl("");
    onClose();
  };

  const getDurationLabel = (value: string) => {
    switch (value) {
      case "1h": return "1 Hour";
      case "4h": return "4 Hours";
      case "24h": return "24 Hours";
      case "7d": return "7 Days";
      default: return "1 Hour";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border-elevated text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Link className="mr-2" size={20} />
            Invite Guest
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="guestName" className="text-sm font-medium">
              Guest Name
            </Label>
            <Input
              id="guestName"
              type="text"
              placeholder="Enter guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 bg-elevated border-gray-600 focus:border-primary"
            />
          </div>
          
          <div>
            <Label htmlFor="duration" className="text-sm font-medium">
              Access Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1 bg-elevated border-gray-600 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Camera Access</Label>
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {cameras.map((camera) => (
                <div key={camera.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={camera.id}
                    checked={selectedCameras.includes(camera.id)}
                    onCheckedChange={(checked) => 
                      handleCameraToggle(camera.id, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={camera.id} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {camera.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="canRecord"
              checked={canRecord}
              onCheckedChange={(checked) => setCanRecord(checked as boolean)}
            />
            <Label htmlFor="canRecord" className="text-sm font-normal cursor-pointer">
              Allow local recording
            </Label>
          </div>

          {inviteUrl && (
            <div>
              <Label className="text-sm font-medium">Invite Link</Label>
              <div className="mt-1 flex space-x-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="bg-elevated border-gray-600"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-elevated hover:bg-gray-600"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2">
          {!inviteUrl ? (
            <>
              <Button
                onClick={handleGenerateInvite}
                disabled={isGenerating}
                className="flex-1 bg-primary hover:bg-blue-600"
              >
                {isGenerating ? "Generating..." : "Generate Invite Link"}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-elevated hover:bg-gray-600"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              className="w-full bg-primary hover:bg-blue-600"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
