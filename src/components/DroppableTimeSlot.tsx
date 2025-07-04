import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDrag } from './DragProvider';

interface DroppableTimeSlotProps {
  date: Date;
  hour: number;
  minute: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({
  date,
  hour,
  minute,
  children,
  className = '',
  style
}) => {
  const { isDragging, targetSlot } = useDrag();
  
  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: `time-slot-${date.getTime()}-${hour}-${minute}`,
    data: {
      type: 'time-slot',
      date,
      hour,
      minute
    }
  });

  // Check if this is the current target slot
  const isTargetSlot = targetSlot && 
    targetSlot.date.getTime() === date.getTime() &&
    targetSlot.hour === hour &&
    targetSlot.minute === minute;

  const slotClassName = `
    ${className}
    ${isDragging ? 'time-slot' : ''}
    ${isOver ? 'drop-zone-active' : ''}
    ${isTargetSlot ? 'drop-zone-target' : ''}
    transition-all duration-200 ease-in-out
  `.trim();

  return (
    <div
      ref={setNodeRef}
      className={slotClassName}
      style={style}
    >
      {children}
      {/* Visual indicator for snap target */}
      {isTargetSlot && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 shadow-sm z-50 snap-indicator" />
      )}
    </div>
  );
};