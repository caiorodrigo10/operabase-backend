import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ColorPickerModal } from './ColorPickerModal';

interface ColorPalettePageProps {
  onBack: () => void;
}

interface ColorCircleProps {
  color: string;
  size?: 'small' | 'large';
  onClick?: () => void;
  className?: string;
}

const ColorCircle: React.FC<ColorCircleProps> = ({ 
  color, 
  size = 'large', 
  onClick,
  className = '' 
}) => {
  // All circles now use the same size for minimalist design
  const sizeClass = 'w-8 h-8';
  const borderClass = color === '#ffffff' || color === '#FFFFFF' ? 'border-gray-300' : 'border-gray-200';
  
  return (
    <div
      className={`${sizeClass} rounded-full cursor-pointer border-2 ${borderClass} hover:scale-105 transition-transform ${className}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
};

interface ColorItemProps {
  color: string;
  hex: string;
  onClick?: () => void;
}

const ColorItem: React.FC<ColorItemProps> = ({ color, hex, onClick }) => {
  return (
    <div className="flex flex-col items-center">
      <ColorCircle color={color} onClick={onClick} />
      <span className="text-xs text-gray-600 mt-1">{hex}</span>
    </div>
  );
};

export const ColorPalettePage: React.FC<ColorPalettePageProps> = ({ onBack }) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [editingColorType, setEditingColorType] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState('#e25041');

  // Estado das cores globais (mockado por enquanto)
  const [colors, setColors] = useState({
    primary: '#e25041',
    secondary: ['#2a2d30', '#daa331', '#02C39A', '#ebedf1'],
    background: '#ffffff',
    mainText: '#3e3e3e'
  });

  const handleColorClick = (colorType: string, color: string) => {
    setEditingColorType(colorType);
    setCurrentColor(color);
    setIsColorPickerOpen(true);
  };

  const handleColorUpdate = (newColor: string) => {
    if (editingColorType === 'primary') {
      setColors(prev => ({ ...prev, primary: newColor }));
    } else if (editingColorType === 'background') {
      setColors(prev => ({ ...prev, background: newColor }));
    } else if (editingColorType === 'mainText') {
      setColors(prev => ({ ...prev, mainText: newColor }));
    } else if (editingColorType?.startsWith('secondary-')) {
      const index = parseInt(editingColorType.split('-')[1]);
      setColors(prev => {
        const newSecondary = [...prev.secondary];
        newSecondary[index] = newColor;
        return { ...prev, secondary: newSecondary };
      });
    }
    setIsColorPickerOpen(false);
    setEditingColorType(null);
  };

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Global Styling
          </button>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Paleta de Cores</h1>
          <p className="text-gray-500 text-sm">
            Alterar as cores globais afetará todos os lugares onde você as usou em suas páginas.
          </p>
        </div>

        {/* Primary Color */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cor Primária</h2>
          <p className="text-sm text-gray-500 mb-4">Usada como cor do tema em todos os lugares principais</p>
          <div className="flex items-center gap-3">
            <ColorCircle 
              color={colors.primary} 
              onClick={() => handleColorClick('primary', colors.primary)}
            />
            <span className="text-sm font-mono text-gray-700">{colors.primary}</span>
          </div>
        </div>

        {/* Secondary Colors */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            CORES SECUNDÁRIAS
          </h2>
          <div className="flex gap-4">
            {colors.secondary.map((color, index) => (
              <ColorItem
                key={index}
                color={color}
                hex={color}
                onClick={() => handleColorClick(`secondary-${index}`, color)}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cor de Fundo</h2>
          <p className="text-sm text-gray-500 mb-4">A cor principal para todas as páginas</p>
          <div className="flex items-center gap-3">
            <ColorCircle 
              color={colors.background} 
              onClick={() => handleColorClick('background', colors.background)}
            />
            <span className="text-sm font-mono text-gray-700">{colors.background}</span>
          </div>
        </div>

        {/* Main Text Color */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cor do Texto Principal</h2>
          <p className="text-sm text-gray-500 mb-4">Usada para portfólio, títulos de blog, etc.</p>
          <div className="flex items-center gap-3">
            <ColorCircle 
              color={colors.mainText} 
              onClick={() => handleColorClick('mainText', colors.mainText)}
            />
            <span className="text-sm font-mono text-gray-700">{colors.mainText}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
            Confirmar
          </button>
        </div>
      </div>

      {/* Color Picker Modal */}
      {isColorPickerOpen && (
        <ColorPickerModal
          color={currentColor}
          onClose={() => setIsColorPickerOpen(false)}
          onColorChange={handleColorUpdate}
        />
      )}
    </div>
  );
};