import React from 'react';

interface WidgetItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isAvailable?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export const WidgetItem: React.FC<WidgetItemProps> = ({ 
  icon, 
  label, 
  onClick, 
  isAvailable = false,
  draggable = false,
  onDragStart,
  onDragEnd
}) => {
  console.log(`WidgetItem ${label}: isAvailable=${isAvailable}, draggable=${draggable}`);
  
  return (
    <div 
      className={`widget-item ${isAvailable ? 'available' : 'coming-soon'} ${draggable ? 'draggable' : ''}`}
      onClick={onClick}
      draggable={draggable && isAvailable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        cursor: isAvailable && draggable ? 'grab' : 'pointer',
        opacity: isAvailable ? 1 : 0.7
      }}
    >
      <div className="widget-item-content">
        <div className="widget-icon">
          {icon}
        </div>
        <div className="widget-label">
          {label}
        </div>
        {!isAvailable && (
          <div className="coming-soon-badge">
            Em Breve
          </div>
        )}
      </div>
    </div>
  );
};