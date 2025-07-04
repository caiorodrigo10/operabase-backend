import React from 'react';
import { X, Type, AlignLeft, Square, Container, Minus, Image, Play } from 'lucide-react';
import { WidgetItem } from './WidgetItem';

interface WidgetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WidgetsPanel: React.FC<WidgetsPanelProps> = ({ isOpen, onClose }) => {
  const widgets = [
    { icon: <Type size={32} />, label: 'TÍTULO', isAvailable: true, widgetType: 'title' },
    { icon: <AlignLeft size={32} />, label: 'TEXTO', isAvailable: false },
    { icon: <Square size={32} />, label: 'BOTÃO', isAvailable: false },
    { icon: <Container size={32} />, label: 'CONTAINER', isAvailable: false },
    { icon: <Minus size={32} />, label: 'ESPAÇO', isAvailable: false },
    { icon: <Image size={32} />, label: 'IMAGEM', isAvailable: false },
    { icon: <Play size={32} />, label: 'VÍDEO', isAvailable: false }
  ];



  const handleWidgetClick = (label: string, isAvailable: boolean) => {
    if (isAvailable) {
      console.log(`Widget ${label} clicked - Available`);
    } else {
      console.log(`Widget ${label} clicked - Em Breve`);
    }
  };

  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <>      
      {/* Panel */}
      <div className={`widgets-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="widgets-panel-header">
          <h2 className="widgets-panel-title">Add Widget</h2>
          <button 
            className="widgets-panel-close"
            onClick={onClose}
            aria-label="Fechar painel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Widgets Grid */}
        <div className="widgets-grid">
          {widgets.map((widget, index) => (
            <WidgetItem
              key={index}
              icon={widget.icon}
              label={widget.label}
              isAvailable={widget.isAvailable || false}
              draggable={widget.isAvailable || false}
              onClick={() => handleWidgetClick(widget.label, widget.isAvailable || false)}
              onDragStart={(e) => {
                if (widget.widgetType) {
                  e.dataTransfer.setData('widget-type', widget.widgetType);
                  console.log(`Dragging ${widget.label} widget`);
                }
              }}
              onDragEnd={() => {
                console.log('Drag ended');
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};