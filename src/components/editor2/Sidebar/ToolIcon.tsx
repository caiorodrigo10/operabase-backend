import React from 'react';

interface ToolIconProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ 
  icon, 
  label, 
  isActive, 
  onClick 
}) => {
  return (
    <div 
      className={`editor2-tool-icon ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={label}
    >
      <span className="editor2-tool-icon-symbol">{icon}</span>
    </div>
  );
};