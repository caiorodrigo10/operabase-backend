import React, { useState } from 'react';
import { ToolButton } from './ToolButton';
import { Grid3X3, Palette, Settings } from 'lucide-react';
import { WidgetsPanel } from '../Widgets/WidgetsPanel';
import { GlobalStylingSidebar } from '../GlobalStyling/GlobalStylingSidebar';

export const VerticalToolbar: React.FC = () => {
  const [activeButton, setActiveButton] = useState<string>('widgets');
  const [isWidgetsPanelOpen, setIsWidgetsPanelOpen] = useState<boolean>(false);
  const [isGlobalStylingOpen, setIsGlobalStylingOpen] = useState<boolean>(false);

  const handleButtonClick = (buttonId: string, label: string) => {
    setActiveButton(buttonId);
    
    // Close all panels first
    setIsWidgetsPanelOpen(false);
    setIsGlobalStylingOpen(false);
    
    if (buttonId === 'widgets') {
      setIsWidgetsPanelOpen(true);
    } else if (buttonId === 'styles') {
      setIsGlobalStylingOpen(true);
    } else {
      console.log(`Opening ${label.toLowerCase()} panel`);
    }
  };

  return (
    <>
      <div className="vertical-toolbar">
        <ToolButton
          icon={<Grid3X3 size={20} />}
          label="Widgets"
          onClick={() => handleButtonClick('widgets', 'Widgets')}
          isActive={activeButton === 'widgets'}
        />
        
        <ToolButton
          icon={<Palette size={20} />}
          label="Estilo Global"
          onClick={() => handleButtonClick('styles', 'Global Styles')}
          isActive={activeButton === 'styles'}
        />
        
        <ToolButton
          icon={<Settings size={20} />}
          label="Configurações"
          onClick={() => handleButtonClick('settings', 'Settings')}
          isActive={activeButton === 'settings'}
        />
      </div>
      
      <WidgetsPanel 
        isOpen={isWidgetsPanelOpen} 
        onClose={() => setIsWidgetsPanelOpen(false)} 
      />
      
      <GlobalStylingSidebar 
        isOpen={isGlobalStylingOpen} 
        onClose={() => setIsGlobalStylingOpen(false)} 
      />
    </>
  );
};