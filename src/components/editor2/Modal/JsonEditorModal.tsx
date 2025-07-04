import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Download, Upload } from 'lucide-react';
import { usePage } from '../../../contexts/PageProvider';

interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (json: any) => void;
}

export const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Get page context
  const { pageJson, savePageJson, resetToDefault } = usePage();

  useEffect(() => {
    if (isOpen && pageJson) {
      // Load current page JSON from context
      setJsonContent(JSON.stringify(pageJson, null, 2));
      setError('');
    }
  }, [isOpen, pageJson]);

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    setError('');
    
    // Validate JSON in real-time
    try {
      JSON.parse(value);
    } catch (e) {
      setError('JSON inválido: ' + (e as Error).message);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const parsedJson = JSON.parse(jsonContent);
      
      // Save using PageProvider (Builder.io style auto-save)
      const success = savePageJson(parsedJson);
      
      if (success) {
        // Call save callback
        onSave(parsedJson);
        console.log('✅ JSON saved successfully via PageProvider');
        onClose();
      } else {
        setError('Erro ao salvar JSON no PageProvider');
      }
    } catch (e) {
      setError('Erro ao salvar: ' + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    console.log('📋 JSON copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page-builder.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 JSON downloaded');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          // Validate uploaded JSON
          const parsed = JSON.parse(content);
          setJsonContent(JSON.stringify(parsed, null, 2));
          setError('');
          console.log('📤 JSON uploaded successfully');
        } catch (error) {
          setError('Arquivo JSON inválido');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    resetToDefault();
    if (pageJson) {
      setJsonContent(JSON.stringify(pageJson, null, 2));
    }
    setError('');
    console.log('🔄 JSON reset to default template via PageProvider');
  };

  if (!isOpen) return null;

  return (
    <div className="json-editor-overlay">
      <div className="json-editor-modal">
        {/* Header */}
        <div className="json-editor-header">
          <h2>Editor JSON - Builder.io Style</h2>
          <button 
            className="close-button"
            onClick={onClose}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="json-editor-toolbar">
          <div className="toolbar-left">
            <button 
              className="toolbar-button"
              onClick={handleCopy}
              title="Copiar JSON"
            >
              <Copy size={16} />
              Copiar
            </button>
            
            <button 
              className="toolbar-button"
              onClick={handleDownload}
              title="Download JSON"
            >
              <Download size={16} />
              Download
            </button>
            
            <label className="toolbar-button" title="Upload JSON">
              <Upload size={16} />
              Upload
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="toolbar-right">
            <button 
              className="toolbar-button secondary"
              onClick={handleReset}
              title="Resetar para template padrão"
            >
              Resetar
            </button>
            
            <button 
              className={`toolbar-button primary ${isSaving ? 'saving' : ''}`}
              onClick={handleSave}
              disabled={isSaving || !!error}
              title="Salvar alterações"
            >
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="json-editor-error">
            ⚠️ {error}
          </div>
        )}

        {/* JSON Editor */}
        <div className="json-editor-content">
          <textarea
            className="json-textarea"
            value={jsonContent}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder="Cole seu JSON aqui..."
            spellCheck={false}
          />
        </div>

        {/* Footer Info */}
        <div className="json-editor-footer">
          <span className="footer-info">
            💡 Este JSON usa a estrutura Builder.io oficial com elementos, componentes e responsiveStyles
          </span>
        </div>
      </div>
    </div>
  );
};