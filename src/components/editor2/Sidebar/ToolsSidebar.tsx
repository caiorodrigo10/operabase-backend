import React from 'react';

interface ToolIconProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolIcon: React.FC<ToolIconProps> = ({ 
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

export const ToolsSidebar: React.FC = () => {
  const tools = [
    { id: 'widgets', icon: '🧩', label: 'Widgets' },
    { id: 'design', icon: '🎨', label: 'Design' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
    { id: 'pages', icon: '📄', label: 'Pages' },
  ];

  return (
    <div className="editor2-sidebar">
      <div className="editor2-sidebar-tools">
        {tools.map((tool) => (
          <ToolIcon 
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            isActive={false}
            onClick={() => {
              // Future functionality
            }}
          />
        ))}
      </div>
    </div>
  );
};