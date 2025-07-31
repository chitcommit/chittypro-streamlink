import { useState, useRef, useCallback } from "react";
import CameraStream from "./camera-stream";
import { Plus } from "lucide-react";
import type { Camera } from "@shared/schema";

interface CameraGridProps {
  cameras: Camera[];
}

export default function CameraGrid({ cameras }: CameraGridProps) {
  const [draggedCamera, setDraggedCamera] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((cameraId: string) => {
    setDraggedCamera(cameraId);
    setShowGrid(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCamera(null);
    setDragOverIndex(null);
    setShowGrid(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCamera && dragOverIndex !== null) {
      // Handle camera reordering logic here
      console.log(`Moving camera ${draggedCamera} to position ${dropIndex}`);
    }
    handleDragEnd();
  }, [draggedCamera, dragOverIndex, handleDragEnd]);

  // Create a grid of 8 slots (4x2)
  const gridSlots = Array.from({ length: 8 }, (_, index) => {
    const camera = cameras[index];
    return camera || null;
  });

  return (
    <div className="flex-1 p-4 relative">
      {/* Grid Overlay */}
      {showGrid && (
        <div 
          className="absolute inset-0 grid-overlay opacity-100 transition-opacity duration-300 z-10 pointer-events-none"
        />
      )}
      
      {/* Camera Streams Container */}
      <div 
        ref={gridRef}
        className="h-full grid grid-cols-4 gap-4"
      >
        {gridSlots.map((camera, index) => (
          <div
            key={camera?.id || `empty-${index}`}
            className={`
              min-h-64 relative
              ${dragOverIndex === index ? 'ring-2 ring-accent' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            {camera ? (
              <CameraStream
                camera={camera}
                onDragStart={() => handleDragStart(camera.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggedCamera === camera.id}
              />
            ) : (
              <div className="video-container rounded-lg p-4 border-dashed border-2 border-gray-600 flex items-center justify-center h-full group cursor-pointer hover:border-primary transition-colors">
                <div className="text-center text-gray-500 group-hover:text-gray-400">
                  <Plus className="mx-auto mb-2" size={32} />
                  <p className="text-sm">Add Camera</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}