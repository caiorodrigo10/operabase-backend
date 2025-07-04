import React from 'react';

interface FontSelectorProps {
  currentFont: string;
  onFontChange: (font: string) => void;
  onClose: () => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({ 
  currentFont, 
  onFontChange, 
  onClose 
}) => {
  const fonts = [
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif', style: 'italic' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Hammersmith One', value: 'Hammersmith One, sans-serif', weight: 'bold' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Lucida Grande', value: 'Lucida Grande, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
  ];

  return (
    <div className="dropdown-menu font-selector">
      {fonts.map((font) => (
        <button
          key={font.value}
          className={`dropdown-item font-item ${currentFont === font.value ? 'active' : ''}`}
          onClick={() => onFontChange(font.value)}
          style={{ 
            fontFamily: font.value,
            fontStyle: font.style || 'normal',
            fontWeight: font.weight || 'normal'
          }}
        >
          {font.name}
        </button>
      ))}
    </div>
  );
};