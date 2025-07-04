import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface FontEditorModalProps {
  isOpen: boolean;
  elementType: string;
  initialValues: {
    fontFamily: string;
    fontSize: string;
    letterSpacing: string;
    lineHeight: string;
    color: string;
  };
  onClose: () => void;
  onSave: (values: any) => void;
}

export const FontEditorModal: React.FC<FontEditorModalProps> = ({
  isOpen,
  elementType,
  initialValues,
  onClose,
  onSave
}) => {
  const [fontFamily, setFontFamily] = useState(initialValues.fontFamily);
  const [fontSize, setFontSize] = useState(parseInt(initialValues.fontSize.replace('px', '')));
  const [letterSpacing, setLetterSpacing] = useState(
    initialValues.letterSpacing === '0px' ? 'normal' : initialValues.letterSpacing
  );
  const [lineHeight, setLineHeight] = useState(parseFloat(initialValues.lineHeight));
  const [textColor, setTextColor] = useState(initialValues.color);
  const [showFontDropdown, setShowFontDropdown] = useState(false);

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Inter',
    'Poppins'
  ];

  useEffect(() => {
    if (isOpen) {
      setFontFamily(initialValues.fontFamily);
      setFontSize(parseInt(initialValues.fontSize.replace('px', '')));
      setLetterSpacing(initialValues.letterSpacing === '0px' ? 'normal' : initialValues.letterSpacing);
      setLineHeight(parseFloat(initialValues.lineHeight));
      setTextColor(initialValues.color);
    }
  }, [isOpen, initialValues]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    onSave({
      fontFamily,
      fontSize: `${fontSize}px`,
      letterSpacing: letterSpacing === 'normal' ? '0px' : letterSpacing,
      lineHeight: lineHeight.toString(),
      color: textColor
    });
    onClose();
  };

  const handleReset = () => {
    setFontFamily('Arial');
    setFontSize(16);
    setLetterSpacing('normal');
    setLineHeight(1.5);
    setTextColor('#000000');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
        {/* Font Family Selector */}
        <div className="mb-6">
          <div className="relative">
            <button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
            >
              <span className="text-gray-900">{fontFamily}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showFontDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {fontFamilies.map((font) => (
                  <button
                    key={font}
                    onClick={() => {
                      setFontFamily(font);
                      setShowFontDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Tamanho da Fonte</label>
            <span className="text-sm text-blue-500 font-medium">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="8"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((fontSize - 8) / (72 - 8)) * 100}%, #e5e7eb ${((fontSize - 8) / (72 - 8)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        {/* Letter Spacing */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Espaçamento de Letras</label>
            <span className="text-sm text-blue-500 font-medium">{letterSpacing}</span>
          </div>
          <input
            type="range"
            min="-2"
            max="10"
            step="0.1"
            value={letterSpacing === 'normal' ? 0 : parseFloat(letterSpacing.replace('px', ''))}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setLetterSpacing(value === 0 ? 'normal' : `${value}px`);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Line Height */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Altura da Linha</label>
            <span className="text-sm text-blue-500 font-medium">{lineHeight}</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((lineHeight - 0.8) / (3 - 0.8)) * 100}%, #e5e7eb ${((lineHeight - 0.8) / (3 - 0.8)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        {/* Text Color */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
              style={{ backgroundColor: textColor }}
              onClick={() => {
                // TODO: Open color picker
                console.log('Open color picker');
              }}
            />
            <label className="text-sm font-medium text-gray-700">Cor do Texto</label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Redefinir Padrão
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};