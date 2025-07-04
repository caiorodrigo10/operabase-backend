import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
import { format } from 'date-fns';
import { useDrag } from './DragProvider';

interface DraggableAppointmentProps {
  appointment: Appointment;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const DraggableAppointment: React.FC<DraggableAppointmentProps> = ({
  appointment,
  children,
  style,
  className
}) => {
  const { isDragging, draggedAppointment } = useDrag();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging
  } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment: appointment
    }
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isCurrentlyDragging ? 0.5 : 1,
    zIndex: isCurrentlyDragging ? 1000 : 'auto',
    cursor: 'grab'
  };

  // Enhanced styling for better visual consistency
  const combinedStyle = {
    ...style,
    ...dragStyle,
    // Ensure consistent sizing during drag
    minHeight: style?.minHeight || '60px',
    width: style?.width || 'auto'
  };

  const combinedClassName = `
    ${className || ''}
    ${isCurrentlyDragging ? 'dragging-appointment' : ''}
    ${isDragging && draggedAppointment?.id === appointment.id ? 'opacity-50' : ''}
    transition-all duration-200 ease-in-out
    hover:scale-[1.02] hover:shadow-lg
  `.trim();

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={combinedClassName}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};