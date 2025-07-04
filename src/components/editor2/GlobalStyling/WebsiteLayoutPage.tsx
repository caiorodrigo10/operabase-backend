import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useEditor2Store } from '../../../stores/editor2Store';

interface WebsiteLayoutPageProps {
  onBack: () => void;
}

interface LayoutSettings {
  gridWidth: number;
  layoutStyle: 'full-width' | 'boxed';
}

const defaultSettings: LayoutSettings = {
  gridWidth: 1100,
  layoutStyle: 'full-width'
};

export const WebsiteLayoutPage: React.FC<WebsiteLayoutPageProps> = ({ onBack }) => {
  const { globalSettings, updateGlobalSettings } = useEditor2Store();
  const [settings, setSettings] = useState<LayoutSettings>(globalSettings);
  const [originalSettings] = useState<LayoutSettings>(globalSettings);

  // Update settings when global settings change
  useEffect(() => {
    setSettings(globalSettings);
  }, [globalSettings]);

  const handleCancel = () => {
    setSettings(originalSettings);
    updateGlobalSettings(originalSettings);
    onBack();
  };

  const handleConfirm = () => {
    updateGlobalSettings(settings);
    onBack();
  };

  const handleGridWidthChange = (value: number) => {
    const newSettings = {
      ...settings,
      gridWidth: value
    };
    setSettings(newSettings);
    // Update global settings in real-time for preview
    updateGlobalSettings(newSettings);
  };

  const handleLayoutStyleChange = (style: 'full-width' | 'boxed') => {
    const newSettings = {
      ...settings,
      layoutStyle: style
    };
    setSettings(newSettings);
    // Update global settings in real-time for preview
    updateGlobalSettings(newSettings);
  };

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Global Styling
          </button>
          
          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Layout do Site</h1>
          <p className="text-gray-600">
            Isso afetará todas as páginas e sua aparência de layout.
          </p>
        </div>

        {/* Grid Width Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-gray-900">Largura do Grid</h3>
            <span className="text-blue-500 font-medium">{settings.gridWidth}px</span>
          </div>
          
          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="800"
              max="1400"
              step="50"
              value={settings.gridWidth}
              onChange={(e) => handleGridWidthChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((settings.gridWidth - 800) / (1400 - 800)) * 100}%, #e5e7eb ${((settings.gridWidth - 800) / (1400 - 800)) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>

        {/* Layout Style Section */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-gray-900 mb-2">Estilo do Layout</h3>
          <p className="text-gray-600 text-sm mb-4">
            Isso afetará todas as páginas do site
          </p>
          
          {/* Layout Options */}
          <div className="space-y-2">
            {/* Full Width Option */}
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                settings.layoutStyle === 'full-width' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleLayoutStyleChange('full-width')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Largura Total</span>
                {settings.layoutStyle === 'full-width' && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>

            {/* Boxed Option */}
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                settings.layoutStyle === 'boxed' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleLayoutStyleChange('boxed')}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Encaixotado</span>
                {settings.layoutStyle === 'boxed' && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
        <button
          onClick={handleCancel}
          className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
};