import React, { useState } from 'react';
import { useEditor2Store, Block } from '../../../stores/editor2Store';
import { ColumnContainer } from './ColumnContainer';

interface BlockContainerProps {
  block: Block;
}

export const BlockContainer: React.FC<BlockContainerProps> = ({ block }) => {
  const { 
    currentPage, 
    globalSettings,
    hoveredElement,
    selectElement,
    setHoveredElement,
    addColumn,
    setColumnCount
  } = useEditor2Store();
  
  const [showColumnOptions, setShowColumnOptions] = useState(false);

  const isSelected = currentPage.selectedElement.type === 'block' && 
                    currentPage.selectedElement.id === block.id;
  const isHovered = hoveredElement.type === 'block' && hoveredElement.id === block.id;

  // Check if any child column is selected or hovered
  const hasSelectedColumn = block.columns.some(col => 
    currentPage.selectedElement.type === 'column' && currentPage.selectedElement.id === col.id
  );
  const hasHoveredColumn = block.columns.some(col => 
    hoveredElement.type === 'column' && hoveredElement.id === col.id
  );

  const shouldShowUI = isSelected || isHovered || hasSelectedColumn || hasHoveredColumn;

  const handleClick = (e: React.MouseEvent) => {
    // Only select block if clicking on the block itself, not on columns
    if (e.target === e.currentTarget) {
      selectElement('block', block.id);
    }
  };

  const handleMouseEnter = () => {
    setHoveredElement('block', block.id);
  };

  const handleMouseLeave = () => {
    setHoveredElement(null, null);
  };

  const handleAddColumn = (e: React.MouseEvent) => {
    e.stopPropagation();
    addColumn(block.id);
  };

  const handleColumnOptionClick = (targetColumns: number) => {
    setColumnCount(block.id, targetColumns);
    setShowColumnOptions(false);
  };

  return (
    <div className="relative">
      {/* Block Badge - Outside top left */}
      {shouldShowUI && (
        <div className="absolute -top-8 left-2 bg-gray-700 text-white text-xs px-2 py-1 rounded z-30 transition-opacity duration-200">
          ⚙️ Bloco
        </div>
      )}



      {/* Block Container */}
      <div
        className={`relative bg-white transition-all duration-200 ${
          isSelected 
            ? 'border-2 border-dashed border-blue-500' 
            : shouldShowUI 
            ? 'border-2 border-dashed border-blue-300' 
            : ''
        }`}
        style={{
          padding: block.style.padding,
          margin: '0',
          backgroundColor: block.style.backgroundColor,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Column Counter - Inside block, top center */}
        {shouldShowUI && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
            <div className="relative">
              {/* Compact Column Counter */}
              <div className="flex rounded-full overflow-hidden shadow-sm">
                {/* Left side - Column count */}
                <div className="bg-blue-500 text-white px-2 py-1 text-xs font-medium flex items-center gap-1">
                  <div className="w-4 h-4 bg-white text-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {block.columns.length}
                  </div>
                  Column{block.columns.length !== 1 ? 's' : ''}
                </div>
                
                {/* Right side - Add button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnOptions(!showColumnOptions);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 transition-colors duration-200 flex items-center justify-center"
                >
                  <span className="text-sm font-bold">+</span>
                </button>
              </div>

              {/* Column Options Dropdown */}
              {showColumnOptions && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64">
                  <h3 className="text-gray-700 font-medium mb-2 text-center text-sm">Split the content into columns</h3>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColumnOptionClick(num);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-200 ${
                          num === block.columns.length 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Columns Container - Full width block with centered content */}
        <div className="w-full flex justify-center relative">
          {/* Boundary indicators based on global grid width */}
          {shouldShowUI && (
            <>
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-300 opacity-50 z-10" 
                style={{ marginLeft: `-${globalSettings.gridWidth / 2}px` }} 
              />
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-300 opacity-50 z-10" 
                style={{ marginLeft: `${globalSettings.gridWidth / 2}px` }} 
              />
            </>
          )}
          
          <div 
            className="flex min-h-[200px] w-full relative" 
            style={{ maxWidth: `${globalSettings.gridWidth}px` }}
            data-block-id={block.id}
          >
            {block.columns.map((column, index) => (
              <ColumnContainer
                key={column.id}
                column={column}
                blockId={block.id}
                isLastColumn={index === block.columns.length - 1}
                isBlockHovered={isHovered}
                isBlockSelected={isSelected}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {showColumnOptions && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowColumnOptions(false)}
        />
      )}
    </div>
  );
};