/**
 * JsonCanvas - Canvas para renderização JSON
 * Área principal onde o JSON é renderizado em componentes visuais
 */

import React from 'react';
import { usePage } from '../../../contexts/PageProvider';
import { BuilderBlock } from './BuilderBlock';
import { ComponentMapProvider } from '../../../contexts/ComponentMapContext';
import { componentMap } from './componentMap';

// Import do contexto de edição (opcional)
let useEditor: any = null;
try {
  const editorModule = require('../../../contexts/EditorContext');
  useEditor = editorModule.useEditor;
} catch (e) {
  // Context não disponível, continuar sem interatividade
}

export const JsonCanvas: React.FC = () => {
  const { pageJson, isLoading, error } = usePage();
  const editor = useEditor ? useEditor() : null;

  // Loading state - evita página vazia ou flicker (Builder.io style)
  if (!pageJson) {
    return (
      <div 
        style={{ 
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '16px',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        Carregando página...
      </div>
    );
  }
  
  // Classes do Canvas - Builder.io style (sem restrições de altura)
  const canvasClasses = [
    'builder-page',
    'min-h-screen', // apenas altura mínima
    'font-sans',
    editor?.mode === 'edit' && 'edit-mode',
    editor?.showGrid && 'show-grid'
  ].filter(Boolean).join(' ');

  // Estado de loading
  if (isLoading) {
    return (
      <div className="json-canvas h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando página...</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="json-canvas h-full flex items-center justify-center bg-red-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro na página</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  // Estado vazio - sem dados (suporte para estrutura ROOT ou blocks)
  const hasContent = pageJson && (
    (pageJson.ROOT && pageJson.ROOT.children && pageJson.ROOT.children.length > 0) ||
    (pageJson.blocks && pageJson.blocks.length > 0)
  );

  if (!hasContent) {
    return (
      <div className="json-canvas h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Canvas em branco</h3>
          <p className="text-gray-600 mb-4">
            Nenhuma página carregada. Use o botão "Testar Contexto" para carregar dados de exemplo.
          </p>
          <div className="text-sm text-gray-500">
            <p>Canvas pronto para renderizar JSON!</p>
          </div>
        </div>
      </div>
    );
  }

  // Determina qual estrutura usar: ROOT ou blocks
  const blocksToRender = pageJson.ROOT 
    ? pageJson.ROOT.children || []
    : pageJson.blocks || [];

  // Renderização principal - Builder.io EXATO pattern
  return (
    <ComponentMapProvider componentMap={componentMap}>
      <div className={canvasClasses} style={{ overflow: 'visible' }}>
        {/* Builder.io container EXATO */}
        <div 
          className="builder-blocks"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          {/* Renderiza children dos blocos */}
          {blocksToRender.map((block: any) => (
            <BuilderBlock 
              key={block.id} 
              block={block}
            />
          ))}
        </div>
      </div>
    </ComponentMapProvider>
  );
};