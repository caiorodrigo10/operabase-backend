import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  DragMoveEvent,
  Active,
  Over
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
// Define Appointment type inline
interface Appointment {
  id: number;
  contact_id: number;
  clinic_id: number;
  user_id: number;
  doctor_name?: string;
  specialty?: string;
  appointment_type?: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  cancellation_reason?: string;
  session_notes?: string;
  next_appointment_suggested?: string;
  payment_status?: string;
  payment_amount?: number;
  google_calendar_event_id?: string;
  created_at: string;
  updated_at: string;
  contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
}
import { format, addMinutes } from 'date-fns';

interface DragContextType {
  isDragging: boolean;
  draggedAppointment: Appointment | null;
  targetSlot: { date: Date; hour: number; minute: number } | null;
  onDragStart: (appointment: Appointment) => void;
  onDragEnd: () => void;
}

const DragContext = React.createContext<DragContextType>({
  isDragging: false,
  draggedAppointment: null,
  targetSlot: null,
  onDragStart: () => {},
  onDragEnd: () => {}
});

export const useDrag = () => React.useContext(DragContext);

interface DragProviderProps {
  children: React.ReactNode;
  onAppointmentMove: (appointmentId: number, newDate: Date, newTime: string) => void;
}

// Custom collision detection for 5-minute precision snapping
const customCollisionDetection = (args: any) => {
  const { droppableContainers, active, pointerCoordinates } = args;
  
  if (!pointerCoordinates || !active) return [];
  
  // Find the time slot containers
  const timeSlotContainers = Array.from(droppableContainers.values()).filter(
    container => container.id.toString().startsWith('time-slot-')
  );
  
  // Calculate the closest time slot with 5-minute precision
  let closestDistance = Infinity;
  let closestContainer = null;
  
  for (const container of timeSlotContainers) {
    if (!container.rect.current) continue;
    
    const rect = container.rect.current;
    const distance = Math.sqrt(
      Math.pow(pointerCoordinates.x - (rect.left + rect.width / 2), 2) +
      Math.pow(pointerCoordinates.y - (rect.top + rect.height / 2), 2)
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestContainer = container;
    }
  }
  
  return closestContainer ? [{ id: closestContainer.id }] : [];
};

// Custom drag overlay component that maintains consistent size
const AppointmentDragOverlay: React.FC<{ appointment: Appointment | null }> = ({ appointment }) => {
  if (!appointment) return null;
  
  const duration = appointment.duration_minutes || 30;
  const patientName = appointment.contact?.name || 'Paciente';
  
  return (
    <div 
      className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3 shadow-lg opacity-90 cursor-move"
      style={{ 
        width: '200px', 
        minHeight: '60px',
        maxWidth: '250px'
      }}
    >
      <div className="flex items-start gap-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
        <div className="flex-1 overflow-hidden">
          <div className="text-sm font-medium text-blue-900 truncate">{patientName}</div>
          <div className="text-xs text-blue-700 mt-1">
            {duration}min • {appointment.scheduled_date ? format(new Date(appointment.scheduled_date), 'HH:mm') : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DragProvider: React.FC<DragProviderProps> = ({ children, onAppointmentMove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [targetSlot, setTargetSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);

  // Configure sensors for precise control
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const appointment = active.data.current?.appointment as Appointment;
    
    if (appointment) {
      setIsDragging(true);
      setDraggedAppointment(appointment);
      
      // Set custom cursor style
      document.body.style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcgMTRMMTIgOUwxNyAxNCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNNyAxMEwxMiAxNUwxNyAxMCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K") 12 12, move';
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { over } = event;
    
    if (over && over.id.toString().startsWith('time-slot-')) {
      const slotData = over.data.current;
      if (slotData?.date && slotData?.hour !== undefined && slotData?.minute !== undefined) {
        setTargetSlot({
          date: slotData.date,
          hour: slotData.hour,
          minute: slotData.minute
        });
      }
    } else {
      setTargetSlot(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset cursor
    document.body.style.cursor = '';
    
    if (over && over.id.toString().startsWith('time-slot-') && draggedAppointment) {
      const slotData = over.data.current;
      
      if (slotData?.date && slotData?.hour !== undefined && slotData?.minute !== undefined) {
        const newTime = `${slotData.hour.toString().padStart(2, '0')}:${slotData.minute.toString().padStart(2, '0')}`;
        onAppointmentMove(draggedAppointment.id, slotData.date, newTime);
      }
    }
    
    // Reset state
    setIsDragging(false);
    setDraggedAppointment(null);
    setTargetSlot(null);
  }, [draggedAppointment, onAppointmentMove]);

  const contextValue: DragContextType = {
    isDragging,
    draggedAppointment,
    targetSlot,
    onDragStart: (appointment: Appointment) => setDraggedAppointment(appointment),
    onDragEnd: () => {
      setIsDragging(false);
      setDraggedAppointment(null);
      setTargetSlot(null);
    }
  };

  return (
    <DragContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
      >
        {children}
        <DragOverlay>
          <AppointmentDragOverlay appointment={draggedAppointment} />
        </DragOverlay>
      </DndContext>
    </DragContext.Provider>
  );
};