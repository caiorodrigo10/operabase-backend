import { SystemEvent } from "@/types/conversations";
import { Activity } from "lucide-react";

interface EventMarkerProps {
  event: SystemEvent;
}

export function EventMarker({ event }: EventMarkerProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-xs font-medium max-w-sm text-center shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <Activity className="w-3 h-3 text-blue-600" />
          <span>{event.content}</span>
        </div>
      </div>
    </div>
  );
}