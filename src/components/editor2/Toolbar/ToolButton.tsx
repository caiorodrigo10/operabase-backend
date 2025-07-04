import React from 'react';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export const ToolButton: React.FC<ToolButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  isActive = false 
}) => {
  return (
    <div className="tool-button-container">
      <button
        className={`tool-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        title={label}
        aria-label={label}
      >
        {icon}
      </button>
      <span className="tool-button-tooltip">{label}</span>
    </div>
  );
};