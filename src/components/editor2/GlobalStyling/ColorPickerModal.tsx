import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ColorPickerModalProps {
  color: string;
  onClose: () => void;
  onColorChange: (color: string) => void;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Color conversion utilities
const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  const s = max === 0 ? 0 : diff / max;
  const v = max;
  
  return { h, s, v };
};

const hsvToRgb = (h: number, s: number, v: number): RGB => {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  color,
  onClose,
  onColorChange
}) => {
  const [currentColor, setCurrentColor] = useState(color);
  const [opacity, setOpacity] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'saturation' | 'hue' | 'opacity' | null>(null);
  
  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const opacityRef = useRef<HTMLDivElement>(null);
  
  const rgb = hexToRgb(currentColor);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  
  // Global colors palette
  const globalColors = [
    // Row 1: Current palette
    '#e25041', '#daa331', '#02C39A', '#ffffff',
    // Row 2: Grayscale
    '#000000', '#404040', '#666666', '#999999', '#cccccc', '#ffffff',
    // Row 3: Greens
    '#1a5f3f', '#2d7a5f', '#40947f', '#53af9f', '#66c9bf', '#79e4df',
    // Row 4: Blues
    '#1a3a5f', '#2d537a', '#406c94', '#5385af', '#669ec9', '#79b7e4',
    // Row 5: Warm colors
    '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#ffffff'
  ];

  const handleSaturationClick = (event: React.MouseEvent) => {
    if (!saturationRef.current) return;
    
    const rect = saturationRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const s = Math.max(0, Math.min(1, x / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (y / rect.height)));
    
    const newRgb = hsvToRgb(hsv.h, s, v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setCurrentColor(newHex);
  };

  const handleHueClick = (event: React.MouseEvent) => {
    if (!hueRef.current) return;
    
    const rect = hueRef.current.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const h = Math.max(0, Math.min(360, (y / rect.height) * 360));
    
    const newRgb = hsvToRgb(h, hsv.s, hsv.v);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setCurrentColor(newHex);
  };

  const handleOpacityClick = (event: React.MouseEvent) => {
    if (!opacityRef.current) return;
    
    const rect = opacityRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newOpacity = Math.max(0, Math.min(1, x / rect.width));
    setOpacity(newOpacity);
  };

  const handleColorSelect = (selectedColor: string) => {
    setCurrentColor(selectedColor);
  };

  const handleConfirm = () => {
    onColorChange(currentColor);
  };

  const handleInputChange = (type: 'r' | 'g' | 'b' | 'hex', value: string) => {
    if (type === 'hex') {
      if (/^#[0-9A-F]{6}$/i.test(value)) {
        setCurrentColor(value);
      }
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
        const newRgb = { ...rgb };
        newRgb[type] = numValue;
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setCurrentColor(newHex);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Pure hue color for saturation background
  const pureHue = hsvToRgb(hsv.h, 1, 1);
  const pureHueHex = rgbToHex(pureHue.r, pureHue.g, pureHue.b);

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-gray-700 rounded-lg p-4 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl"
           style={{ zIndex: 10000 }}>
        {/* Main Color Picker Area */}
        <div className="flex gap-3 mb-4">
          {/* Saturation/Value Square */}
          <div className="relative">
            <div
              ref={saturationRef}
              className="w-48 h-32 relative cursor-crosshair rounded"
              style={{
                background: `linear-gradient(to right, white, ${pureHueHex}), linear-gradient(to bottom, transparent, black)`
              }}
              onClick={handleSaturationClick}
            >
              {/* Cursor */}
              <div
                className="absolute w-3 h-3 border-2 border-white rounded-full transform -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Hue Slider */}
          <div className="relative">
            <div
              ref={hueRef}
              className="w-4 h-32 cursor-pointer rounded"
              style={{
                background: 'linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
              onClick={handleHueClick}
            >
              {/* Cursor */}
              <div
                className="absolute w-4 h-0.5 border border-white bg-white transform -translate-y-0.25 pointer-events-none"
                style={{
                  top: `${(hsv.h / 360) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Opacity Slider */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs w-12">Opacity</span>
            <div className="flex-1 relative">
              <div
                ref={opacityRef}
                className="h-4 relative cursor-pointer rounded"
                style={{
                  backgroundImage: `linear-gradient(to right, transparent, ${currentColor}), linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                  backgroundSize: '100% 100%, 6px 6px, 6px 6px, 6px 6px, 6px 6px',
                  backgroundPosition: '0 0, 0 0, 0 3px, 3px -3px, -3px 0px'
                }}
                onClick={handleOpacityClick}
              >
                {/* Cursor */}
                <div
                  className="absolute w-0.5 h-4 border border-white bg-white transform -translate-x-0.25 pointer-events-none"
                  style={{
                    left: `${opacity * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Color Info Panel */}
        <div className="mb-4">
          {/* RGB/Hex Inputs - Horizontal Layout */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <div>
              <label className="text-white text-xs block mb-1">R</label>
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.r}
                onChange={(e) => handleInputChange('r', e.target.value)}
                className="w-full bg-gray-600 text-white text-xs p-1.5 rounded"
              />
            </div>
            <div>
              <label className="text-white text-xs block mb-1">G</label>
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.g}
                onChange={(e) => handleInputChange('g', e.target.value)}
                className="w-full bg-gray-600 text-white text-xs p-1.5 rounded"
              />
            </div>
            <div>
              <label className="text-white text-xs block mb-1">B</label>
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.b}
                onChange={(e) => handleInputChange('b', e.target.value)}
                className="w-full bg-gray-600 text-white text-xs p-1.5 rounded"
              />
            </div>
            <div>
              <label className="text-white text-xs block mb-1">A</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full bg-gray-600 text-white text-xs p-1.5 rounded"
              />
            </div>
            <div>
              <label className="text-white text-xs block mb-1">#</label>
              <input
                type="text"
                value={currentColor.replace('#', '')}
                onChange={(e) => handleInputChange('hex', '#' + e.target.value)}
                className="w-full bg-gray-600 text-white text-xs p-1.5 rounded uppercase"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Global Colors */}
        <div className="mb-4">
          <h3 className="text-white text-xs mb-2">Global Colors</h3>
          <div className="grid grid-cols-6 gap-1.5">
            {globalColors.map((globalColor, index) => (
              <button
                key={index}
                className="w-8 h-8 rounded-full border border-gray-500 hover:border-white transition-colors"
                style={{ backgroundColor: globalColor }}
                onClick={() => handleColorSelect(globalColor)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-300 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};