import React, { useState } from 'react';
import { TitleWidgetData } from './TitleWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  X, 
  Palette, 
  Type,
  Wand2,
  ChevronDown
} from 'lucide-react';

interface TitleToolbarProps {
  widget: TitleWidgetData;
  position: { top: number; left: number };
  onStyleChange: (style: Partial<TitleWidgetData['style']>) => void;
  onLevelChange: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  onClose: () => void;
}

export const TitleToolbar: React.FC<TitleToolbarProps> = ({
  widget,
  position,
  onStyleChange,
  onLevelChange,
  onClose
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Predefined title styles based on reference images
  const titlePresets = {
    'titulo-1': {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 48,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.5,
      color: '#1a1a1a'
    },
    'titulo-2': {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 36,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.3,
      color: '#1a1a1a'
    },
    'titulo-3': {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#1a1a1a'
    },
  };

  const applyTitlePreset = (presetKey: keyof typeof titlePresets) => {
    const preset = titlePresets[presetKey];
    onStyleChange(preset);
  };

  const toggleBold = () => {
    const currentWeight = widget.style.fontWeight;
    const newWeight = currentWeight === 'bold' || currentWeight === '700' ? 'normal' : 'bold';
    onStyleChange({ fontWeight: newWeight });
  };

  const toggleItalic = () => {
    const isItalic = widget.style.fontStyle === 'italic';
    onStyleChange({ fontStyle: isItalic ? 'normal' : 'italic' });
  };

  const toggleUnderline = () => {
    const isUnderlined = widget.style.textDecoration === 'underline';
    onStyleChange({ textDecoration: isUnderlined ? 'none' : 'underline' });
  };

  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    onStyleChange({ textAlign: align });
  };

  const fontFamilies = [
    { label: 'Inter (Default)', value: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { label: 'Arial', value: '"Arial", sans-serif' },
    { label: 'Helvetica', value: '"Helvetica Neue", "Helvetica", sans-serif' },
    { label: 'Georgia', value: '"Georgia", serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
  ];

  return (
    <div 
      className="fixed z-50 bg-white border rounded-lg shadow-xl p-3 flex flex-wrap items-center gap-2"
      style={{ 
        top: position.top, 
        left: position.left,
        minWidth: '500px',
        maxWidth: '600px'
      }}
    >
      {/* Close button */}
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>

      {/* Magic Wand - Title Presets */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Wand2 className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48">
          <div className="space-y-2">
            <p className="text-sm font-medium">Estilos de Título</p>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-left"
              onClick={() => applyTitlePreset('titulo-1')}
            >
              <span style={{ fontSize: '18px', fontWeight: '700' }}>Título 1</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-left"
              onClick={() => applyTitlePreset('titulo-2')}
            >
              <span style={{ fontSize: '16px', fontWeight: '600' }}>Título 2</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-left"
              onClick={() => applyTitlePreset('titulo-3')}
            >
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Título 3</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Title level selector */}
      <Select value={widget.content.level.toString()} onValueChange={(value) => onLevelChange(Number(value) as any)}>
        <SelectTrigger className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">H1</SelectItem>
          <SelectItem value="2">H2</SelectItem>
          <SelectItem value="3">H3</SelectItem>
          <SelectItem value="4">H4</SelectItem>
          <SelectItem value="5">H5</SelectItem>
          <SelectItem value="6">H6</SelectItem>
        </SelectContent>
      </Select>

      {/* Formatting buttons */}
      <div className="flex border-l pl-2">
        <Button 
          variant={widget.style.fontWeight === 'bold' || widget.style.fontWeight === '700' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={toggleBold}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={widget.style.fontStyle === 'italic' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={toggleItalic}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button 
          variant={widget.style.textDecoration === 'underline' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={toggleUnderline}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      {/* Alignment buttons */}
      <div className="flex border-l pl-2">
        <Button 
          variant={widget.style.textAlign === 'left' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setAlignment('left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant={widget.style.textAlign === 'center' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setAlignment('center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button 
          variant={widget.style.textAlign === 'right' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setAlignment('right')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button 
          variant={widget.style.textAlign === 'justify' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setAlignment('justify')}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-1 border-l pl-2">
        <Type className="h-4 w-4" />
        <Input
          type="number"
          value={widget.style.fontSize}
          onChange={(e) => onStyleChange({ fontSize: Number(e.target.value) })}
          className="w-16 h-8"
          min="8"
          max="200"
        />
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1 border-l pl-2">
        <Palette className="h-4 w-4" />
        <Input
          type="color"
          value={widget.style.color}
          onChange={(e) => onStyleChange({ color: e.target.value })}
          className="w-10 h-8 p-1 cursor-pointer"
        />
      </div>

      {/* Advanced Controls Toggle */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="border-l pl-2"
      >
        Avançado
        <ChevronDown className={`h-3 w-3 ml-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </Button>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="w-full border-t pt-2 mt-2 flex flex-wrap gap-2">
          {/* Font Family */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Fonte:</span>
            <Select 
              value={widget.style.fontFamily} 
              onValueChange={(value) => onStyleChange({ fontFamily: value })}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Alt. Linha:</span>
            <Input
              type="number"
              value={widget.style.lineHeight}
              onChange={(e) => onStyleChange({ lineHeight: Number(e.target.value) })}
              className="w-16 h-8"
              min="0.5"
              max="3"
              step="0.1"
            />
          </div>

          {/* Letter Spacing */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Espaçamento:</span>
            <Input
              type="number"
              value={widget.style.letterSpacing}
              onChange={(e) => onStyleChange({ letterSpacing: Number(e.target.value) })}
              className="w-16 h-8"
              min="-5"
              max="10"
              step="0.1"
            />
          </div>

          {/* Background Color */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Fundo:</span>
            <Input
              type="color"
              value={widget.style.backgroundColor}
              onChange={(e) => onStyleChange({ backgroundColor: e.target.value })}
              className="w-10 h-8 p-1 cursor-pointer"
            />
          </div>

          {/* Text Transform */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Transform:</span>
            <Select 
              value={widget.style.textTransform} 
              onValueChange={(value) => onStyleChange({ textTransform: value as any })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Normal</SelectItem>
                <SelectItem value="uppercase">MAIÚSCULA</SelectItem>
                <SelectItem value="lowercase">minúscula</SelectItem>
                <SelectItem value="capitalize">Primeira Maiúscula</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};