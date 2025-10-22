import { useQuery } from "@tanstack/react-query";
import ChatSystem from "./chat-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
    chittyId?: string;
  };
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const { toast } = useToast();

  const { data: activeSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/guest-sessions/active"],
  });

  const { data: recordingRequests = [], refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ["/api/recording-requests"],
  });

  const handleApproveRecording = async (requestId: string) => {
    try {
      await apiRequest("PATCH", `/api/recording-requests/${requestId}`, {
        status: "approved",
        approvedBy: currentUser.id
      });
      
      await refetchRequests();
      
      toast({
        title: "Request Approved",
        description: "Recording request has been approved",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve recording request",
        variant: "destructive",
      });
    }
  };

  const handleDenyRecording = async (requestId: string) => {
    try {
      await apiRequest("PATCH", `/api/recording-requests/${requestId}`, {
        status: "denied",
        approvedBy: currentUser.id
      });
      
      await refetchRequests();
      
      toast({
        title: "Request Denied",
        description: "Recording request has been denied",
      });
    } catch (error) {
      toast({
        title: "Denial Failed",
        description: "Failed to deny recording request",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return 'bg-accent';
      case 'guest':
        return 'bg-warning';
      default:
        return 'bg-accent';
    }
  };

  return (
    <div className="w-80 bg-surface border-l border-elevated flex flex-col">
      {/* Active Users Panel */}
      <div className="p-4 border-b border-elevated">
        <h3 className="text-sm font-semibold mb-3 flex items-center">
          <Users className="mr-2 text-primary" size={16} />
          Active Users 
          <Badge variant="outline" className="ml-auto bg-primary text-primary-foreground">
            {activeSessions.length + 1}
          </Badge>
        </h3>
        <div className="space-y-2">
          {/* Current user */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="font-medium">{currentUser.name}</span>
            <span className="text-gray-400 text-xs ml-auto">
              {currentUser.role || "Owner"}
            </span>
          </div>
          {currentUser.chittyId && (
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span className="font-semibold">ChittyID</span>
              <span>{currentUser.chittyId}</span>
            </div>
          )}
          
          {/* Guest users */}
          {activeSessions.map((session: any) => (
            <div key={session.id} className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(session.user?.role)}`}></div>
              <span className="font-medium">{session.user?.firstName || 'Guest User'}</span>
              <span className="text-gray-400 text-xs ml-auto">
                {session.user?.role || 'Guest'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recording Requests */}
      <div className="p-4 border-b border-elevated">
        <h3 className="text-sm font-semibold mb-3 flex items-center">
          <Video className="mr-2 text-warning" size={16} />
          Recording Requests 
          <Badge variant="outline" className="ml-auto bg-warning text-warning-foreground">
            {recordingRequests.length}
          </Badge>
        </h3>
        <div className="space-y-3">
          {recordingRequests.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No pending requests
            </p>
          ) : (
            recordingRequests.map((request: any) => (
              <div key={request.id} className="bg-elevated p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {request.user?.firstName || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(request.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mb-2">
                  Requested recording of {request.camera?.name || 'Unknown Camera'}
                </p>
                {request.reason && (
                  <p className="text-xs text-gray-400 mb-2">
                    Reason: {request.reason}
                  </p>
                )}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveRecording(request.id)}
                    className="flex-1 bg-accent hover:bg-green-600 text-xs py-1 px-2"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDenyRecording(request.id)}
                    className="flex-1 bg-destructive hover:bg-red-600 text-xs py-1 px-2"
                  >
                    <XCircle size={12} className="mr-1" />
                    Deny
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat System */}
      <ChatSystem currentUser={currentUser} />
    </div>
  );
}
