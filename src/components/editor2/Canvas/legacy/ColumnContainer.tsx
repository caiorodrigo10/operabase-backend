import React from 'react';
import { useEditor2Store, Column } from '../../../stores/editor2Store';
import { ResizeHandle } from './ResizeHandle';
import { TitleWidget } from '../legacy/TitleWidget';

interface ColumnContainerProps {
  column: Column;
  blockId: string;
  isLastColumn: boolean;
  isBlockHovered: boolean;
  isBlockSelected: boolean;
}

export const ColumnContainer: React.FC<ColumnContainerProps> = ({
  column,
  blockId,
  isLastColumn,
  isBlockHovered,
  isBlockSelected,
}) => {
  const { 
    currentPage, 
    hoveredElement,
    selectElement,
    setHoveredElement,
    addWidget,
    isResizing,
    resizingColumnId
  } = useEditor2Store();

  const isSelected = currentPage.selectedElement.type === 'column' && 
                    currentPage.selectedElement.id === column.id;
  const isHovered = hoveredElement.type === 'column' && hoveredElement.id === column.id;
  const isCurrentlyResizing = isResizing && resizingColumnId === column.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement('column', column.id);
  };

  const handleMouseEnter = () => {
    setHoveredElement('column', column.id);
  };

  const handleMouseLeave = () => {
    if (!isCurrentlyResizing) {
      setHoveredElement(null, null);
    }
  };

  const shouldShowUI = isSelected || isHovered || isBlockHovered || isBlockSelected;
  const shouldShowBorder = isSelected || isHovered;

  return (
    <div
      className={`relative transition-all duration-200 ${shouldShowBorder ? 'border-2 border-dashed border-blue-400' : 'border-2 border-transparent'}`}
      style={{ 
        width: `${column.width}%`,
        minHeight: column.minHeight,
        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Column Badge */}
      {shouldShowUI && (
        <div className="absolute -top-3 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded text-nowrap z-20 transition-opacity duration-200">
          ⬛ Column
        </div>
      )}
      
      {/* Column Content Area */}
      <div 
        className="h-full p-4 drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          
          const widgetType = e.dataTransfer.getData('widget-type');
          if (widgetType && addWidget) {
            addWidget(blockId, column.id, widgetType as any);
          }
        }}
      >
        {column.widgets.length === 0 ? (
          <div className="h-full drop-target">
            <div className="drop-placeholder">
              Arraste um widget aqui
            </div>
          </div>
        ) : (
          <div>
            {column.widgets.map((widget) => (
              <div key={widget.id} className="mb-2">
                {widget.type === 'title' ? (
                  <TitleWidget
                    widget={widget as any}
                    columnId={column.id}
                    blockId={blockId}
                  />
                ) : (
                  <div className="p-2 bg-gray-100 rounded text-sm">
                    {widget.type} widget
                  </div>
                )}
              </div>
            ))}
            {/* Drop zone for adding widgets to non-empty columns */}
            <div 
              className="widget-drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('drag-over');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('drag-over');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('drag-over');
                
                const widgetType = e.dataTransfer.getData('widget-type');
                if (widgetType && addWidget) {
                  addWidget(blockId, column.id, widgetType as any);
                }
              }}
            >
              + Adicionar widget
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle - Only show if not the last column */}
      {!isLastColumn && (
        <ResizeHandle
          columnId={column.id}
          blockId={blockId}
          currentWidth={column.width}
          isVisible={shouldShowUI}
          isSelected={isSelected}
        />
      )}
    </div>
  );
};