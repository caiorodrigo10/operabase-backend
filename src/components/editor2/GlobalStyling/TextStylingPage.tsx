import React, { useState } from 'react';
import { ArrowLeft, Monitor, Smartphone, Edit3 } from 'lucide-react';
import { FontEditorModal } from './FontEditorModal';

interface TextStylingPageProps {
  onBack: () => void;
}

interface EditButtonProps {
  onClick: () => void;
}

const EditButton: React.FC<EditButtonProps> = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded font-medium text-xs transition-all opacity-0 group-hover:opacity-100 ml-4 flex items-center gap-1"
  >
    <Edit3 size={12} />
    Editar
  </button>
);

interface TypographyStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
}

interface TypographyState {
  paragraph: TypographyStyle;
  headings: {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    h5: TypographyStyle;
    h6: TypographyStyle;
  };
  quote: TypographyStyle;
}

const defaultTypography: TypographyState = {
  paragraph: {
    fontFamily: 'Arial',
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '1.5',
    letterSpacing: '0px',
    color: '#374151'
  },
  headings: {
    h1: {
      fontFamily: 'Arial',
      fontSize: '48px',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '0px',
      color: '#111827'
    },
    h2: {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '0px',
      color: '#111827'
    },
    h3: {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontWeight: '500',
      lineHeight: '1.3',
      letterSpacing: '0px',
      color: '#111827'
    },
    h4: {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontWeight: '500',
      lineHeight: '1.4',
      letterSpacing: '0px',
      color: '#111827'
    },
    h5: {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontWeight: '500',
      lineHeight: '1.4',
      letterSpacing: '0px',
      color: '#111827'
    },
    h6: {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontWeight: '500',
      lineHeight: '1.4',
      letterSpacing: '0px',
      color: '#111827'
    }
  },
  quote: {
    fontFamily: 'Arial',
    fontSize: '18px',
    fontWeight: '400',
    lineHeight: '1.6',
    letterSpacing: '0px',
    color: '#6B7280'
  }
};

export const TextStylingPage: React.FC<TextStylingPageProps> = ({ onBack }) => {
  const [currentDevice, setCurrentDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [typography, setTypography] = useState<TypographyState>(defaultTypography);
  const [originalTypography] = useState<TypographyState>(defaultTypography);
  const [isFontEditorOpen, setIsFontEditorOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<string>('');

  const getPreviewSizes = (device: 'desktop' | 'mobile') => {
    if (device === 'mobile') {
      return {
        h1: 'text-4xl',
        h2: 'text-3xl',
        h3: 'text-2xl',
        h4: 'text-xl',
        h5: 'text-lg',
        h6: 'text-base',
        paragraph: 'text-sm',
        quote: 'text-base'
      };
    }
    return {
      h1: 'text-5xl',
      h2: 'text-4xl',
      h3: 'text-3xl',
      h4: 'text-2xl',
      h5: 'text-xl',
      h6: 'text-lg',
      paragraph: 'text-base',
      quote: 'text-lg'
    };
  };

  const previewSizes = getPreviewSizes(currentDevice);

  const handleCancel = () => {
    setTypography(originalTypography);
    onBack();
  };

  const handleConfirm = () => {
    // TODO: Save typography settings to global state
    console.log('Saving typography settings:', typography);
    onBack();
  };

  const handleElementClick = (elementType: string) => {
    setEditingElement(elementType);
    setIsFontEditorOpen(true);
  };

  const handleFontSave = (values: any) => {
    setTypography(prev => {
      const newTypography = { ...prev };
      
      if (editingElement === 'paragraph') {
        newTypography.paragraph = { ...newTypography.paragraph, ...values };
      } else if (editingElement === 'quote') {
        newTypography.quote = { ...newTypography.quote, ...values };
      } else if (editingElement.startsWith('h')) {
        const headingLevel = editingElement as keyof typeof newTypography.headings;
        newTypography.headings[headingLevel] = { ...newTypography.headings[headingLevel], ...values };
      }
      
      return newTypography;
    });
  };

  const getCurrentElementValues = () => {
    if (editingElement === 'paragraph') {
      return typography.paragraph;
    } else if (editingElement === 'quote') {
      return typography.quote;
    } else if (editingElement.startsWith('h')) {
      const headingLevel = editingElement as keyof typeof typography.headings;
      return typography.headings[headingLevel];
    }
    return typography.paragraph;
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
          
          {/* Title and Device Toggle */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Estilo de Texto</h1>
            
            {/* Device Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentDevice('desktop')}
                className={`p-2 rounded transition-colors ${
                  currentDevice === 'desktop'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDevice('mobile')}
                className={`p-2 rounded transition-colors ${
                  currentDevice === 'mobile'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Typography Sections */}
        <div className="space-y-8">
          {/* Paragraph Section */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              PARÁGRAFO
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div 
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.paragraph.fontFamily,
                  fontSize: typography.paragraph.fontSize,
                  fontWeight: typography.paragraph.fontWeight,
                  lineHeight: typography.paragraph.lineHeight,
                  letterSpacing: typography.paragraph.letterSpacing,
                  color: typography.paragraph.color
                }}
              >
                {typography.paragraph.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('paragraph')} />
            </div>
          </div>

          {/* Heading 1 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 1
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h1.fontFamily,
                  fontSize: typography.headings.h1.fontSize,
                  fontWeight: typography.headings.h1.fontWeight,
                  lineHeight: typography.headings.h1.lineHeight,
                  letterSpacing: typography.headings.h1.letterSpacing,
                  color: typography.headings.h1.color
                }}
              >
                {typography.headings.h1.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h1')} />
            </div>
          </div>

          {/* Heading 2 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 2
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h2.fontFamily,
                  fontSize: typography.headings.h2.fontSize,
                  fontWeight: typography.headings.h2.fontWeight,
                  lineHeight: typography.headings.h2.lineHeight,
                  letterSpacing: typography.headings.h2.letterSpacing,
                  color: typography.headings.h2.color
                }}
              >
                {typography.headings.h2.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h2')} />
            </div>
          </div>

          {/* Heading 3 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 3
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h3.fontFamily,
                  fontSize: typography.headings.h3.fontSize,
                  fontWeight: typography.headings.h3.fontWeight,
                  lineHeight: typography.headings.h3.lineHeight,
                  letterSpacing: typography.headings.h3.letterSpacing,
                  color: typography.headings.h3.color
                }}
              >
                {typography.headings.h3.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h3')} />
            </div>
          </div>

          {/* Heading 4 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 4
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h4.fontFamily,
                  fontSize: typography.headings.h4.fontSize,
                  fontWeight: typography.headings.h4.fontWeight,
                  lineHeight: typography.headings.h4.lineHeight,
                  letterSpacing: typography.headings.h4.letterSpacing,
                  color: typography.headings.h4.color
                }}
              >
                {typography.headings.h4.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h4')} />
            </div>
          </div>

          {/* Heading 5 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 5
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h5.fontFamily,
                  fontSize: typography.headings.h5.fontSize,
                  fontWeight: typography.headings.h5.fontWeight,
                  lineHeight: typography.headings.h5.lineHeight,
                  letterSpacing: typography.headings.h5.letterSpacing,
                  color: typography.headings.h5.color
                }}
              >
                {typography.headings.h5.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h5')} />
            </div>
          </div>

          {/* Heading 6 */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              TÍTULO 6
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="text-gray-900"
                style={{ 
                  fontFamily: typography.headings.h6.fontFamily,
                  fontSize: typography.headings.h6.fontSize,
                  fontWeight: typography.headings.h6.fontWeight,
                  lineHeight: typography.headings.h6.lineHeight,
                  letterSpacing: typography.headings.h6.letterSpacing,
                  color: typography.headings.h6.color
                }}
              >
                {typography.headings.h6.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('h6')} />
            </div>
          </div>

          {/* Quote Section */}
          <div className="mb-8 group">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              CITAÇÃO
            </h3>
            <div 
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div
                className="italic border-l-4 border-gray-300 pl-4"
                style={{ 
                  fontFamily: typography.quote.fontFamily,
                  fontSize: typography.quote.fontSize,
                  fontWeight: typography.quote.fontWeight,
                  lineHeight: typography.quote.lineHeight,
                  letterSpacing: typography.quote.letterSpacing,
                  color: typography.quote.color
                }}
              >
                {typography.quote.fontFamily}
              </div>
              <EditButton onClick={() => handleElementClick('quote')} />
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

      {/* Font Editor Modal */}
      <FontEditorModal
        isOpen={isFontEditorOpen}
        elementType={editingElement}
        initialValues={getCurrentElementValues()}
        onClose={() => setIsFontEditorOpen(false)}
        onSave={handleFontSave}
      />
    </div>
  );
};