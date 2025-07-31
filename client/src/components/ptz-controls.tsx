import { Button } from "@/components/ui/button";
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Circle,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PTZControlsProps {
  cameraId: string;
}

export default function PTZControls({ cameraId }: PTZControlsProps) {
  const { toast } = useToast();

  const handlePTZCommand = async (direction: string) => {
    try {
      await apiRequest("POST", `/api/cameras/${cameraId}/ptz`, {
        direction,
        speed: 5
      });
      
      toast({
        title: "PTZ Command Sent",
        description: `Moving camera ${direction}`,
      });
    } catch (error) {
      toast({
        title: "PTZ Error",
        description: "Failed to send PTZ command",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-5 gap-1 w-40">
        {/* Top row */}
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("up-left")}
        >
          <ArrowUp className="transform -rotate-45" size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("up")}
        >
          <ArrowUp size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("up-right")}
        >
          <ArrowUp className="transform rotate-45" size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("zoom-in")}
        >
          <ZoomIn size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("preset-1")}
        >
          1
        </Button>

        {/* Middle row */}
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("left")}
        >
          <ArrowLeft size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("center")}
        >
          <Circle size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("right")}
        >
          <ArrowRight size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("zoom-out")}
        >
          <ZoomOut size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("preset-2")}
        >
          2
        </Button>

        {/* Bottom row */}
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("down-left")}
        >
          <ArrowDown className="transform rotate-45" size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("down")}
        >
          <ArrowDown size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("down-right")}
        >
          <ArrowDown className="transform -rotate-45" size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("rotate-left")}
        >
          <RotateCcw size={10} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 bg-elevated hover:bg-gray-600 rounded text-xs p-0"
          onClick={() => handlePTZCommand("rotate-right")}
        >
          <RotateCw size={10} />
        </Button>
      </div>
    </div>
  );
}