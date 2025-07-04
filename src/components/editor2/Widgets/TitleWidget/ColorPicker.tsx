import React from 'react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  currentColor, 
  onColorChange, 
  onClose 
}) => {
  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#CCFF00', '#66FF00',
    '#00FF00', '#00FF66', '#00FFCC', '#00FFFF', '#00CCFF', '#0066FF',
    '#0000FF', '#6600FF', '#CC00FF', '#FF00FF', '#FF00CC', '#FF0066',
    '#8B4513', '#D2691E', '#DEB887', '#F4A460', '#CD853F', '#A0522D',
    '#2F4F4F', '#696969', '#708090', '#778899', '#B0C4DE', '#E6E6FA',
  ];

  return (
    <div className="dropdown-menu color-picker">
      <div className="color-grid">
        {colors.map((color) => (
          <button
            key={color}
            className={`color-swatch ${currentColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>
      
      <div className="custom-color-section">
        <label className="custom-color-label">
          Cor personalizada:
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="custom-color-input"
          />
        </label>
      </div>
      
      <div className="color-input-section">
        <input
          type="text"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-text-input"
          placeholder="#000000"
        />
      </div>
    </div>
  );
};