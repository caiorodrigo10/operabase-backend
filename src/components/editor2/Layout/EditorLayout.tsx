import React from 'react';
import { AICodeChat } from '../Chat/AICodeChat';
import { EditorHeader } from '../Header/EditorHeader';
import { usePage } from '../../../contexts/PageProvider';
import { useEditor } from '../../../contexts/EditorContext';
import { JsonCanvas } from '../Canvas/JsonCanvas';

export const EditorLayout: React.FC = () => {
  const [isChatMinimized, setIsChatMinimized] = React.useState(true);
  
  // Hooks do editor
  const { pageJson, isLoading, error, setPageJson } = usePage();
  const { mode, showGrid, selectedBlockId, setMode, toggleGrid, selectBlock } = useEditor();

  // Função para testar o contexto
  const handleTestContext = () => {
    const testPageJson = {
      blocks: [
        {
          id: 'root-container',
          component: {
            name: 'Container',
            options: {}
          },
          responsiveStyles: {
            large: {
              maxWidth: '1200px',
              margin: '0 auto',
              paddingLeft: '40px',
              paddingRight: '40px'
            },
            medium: {
              maxWidth: '100%',
              paddingLeft: '24px',
              paddingRight: '24px'
            },
            small: {
              maxWidth: '100%',
              paddingLeft: '16px',
              paddingRight: '16px'
            }
          },
          children: [
            // Hero Section com Section component
            {
              id: 'hero-section',
              component: {
                name: 'Section',
                options: {
                  backgroundColor: '#1e40af',
                  padding: '60px 0',
                  margin: '0'
                }
              },
              children: [
                {
                  id: 'hero-title',
                  component: {
                    name: 'Text',
                    options: {
                      text: '🚀 Editor2 Builder.io Components'
                    }
                  },
                  styles: {
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }
                },
                {
                  id: 'hero-subtitle',
                  component: {
                    name: 'Text',
                    options: {
                      text: 'Section, Columns, Image, Video, Spacer e Divider funcionando!'
                    }
                  },
                  styles: {
                    fontSize: '18px',
                    color: 'rgba(255,255,255,0.9)',
                    textAlign: 'center',
                    marginBottom: '24px'
                  }
                }
              ]
            },
            // Spacer
            {
              id: 'spacer-1',
              component: {
                name: 'Spacer',
                options: {
                  height: '40px'
                }
              }
            },
            // Columns Demo
            {
              id: 'columns-demo',
              component: {
                name: 'Columns',
                options: {
                  gutterSize: 24,
                  stackColumnsAt: 'tablet',
                  columns: [
                    {
                      blocks: [
                        {
                          id: 'col1-title',
                          component: {
                            name: 'Text',
                            options: { text: 'Coluna 1' }
                          },
                          styles: { fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }
                        },
                        {
                          id: 'col1-desc',
                          component: {
                            name: 'Text',
                            options: { text: 'Componente Section' }
                          }
                        }
                      ]
                    },
                    {
                      blocks: [
                        {
                          id: 'col2-title',
                          component: {
                            name: 'Text',
                            options: { text: 'Coluna 2' }
                          },
                          styles: { fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }
                        },
                        {
                          id: 'col2-desc',
                          component: {
                            name: 'Text',
                            options: { text: 'Sistema Columns' }
                          }
                        }
                      ]
                    },
                    {
                      blocks: [
                        {
                          id: 'col3-title',
                          component: {
                            name: 'Text',
                            options: { text: 'Coluna 3' }
                          },
                          styles: { fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }
                        },
                        {
                          id: 'col3-desc',
                          component: {
                            name: 'Text',
                            options: { text: 'Video, Image, Spacer' }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            },
            // Divider
            {
              id: 'divider-1',
              component: {
                name: 'Divider',
                options: {
                  color: '#e5e7eb',
                  thickness: '2px',
                  margin: '30px 0'
                }
              }
            },
            // Video Demo
            {
              id: 'video-demo',
              component: {
                name: 'Video',
                options: {
                  src: 'https://www.youtube.com/watch?v=u7KQ4ityQeI',
                  type: 'youtube',
                  aspectRatio: '16:9'
                }
              },
              styles: {
                maxWidth: '600px',
                margin: '0 auto'
              }
            }
          ]
        }
      ],
      meta: {
        title: 'Editor2 - Builder.io Components Demo',
        description: 'Demonstração completa dos componentes Builder.io implementados'
      }
    };
    setPageJson(testPageJson);
  };

  return (
    <div className={`editor2-layout ${isChatMinimized ? 'chat-minimized' : ''}`}>
      {/* Header Area */}
      <div className="editor2-header-area">
        <EditorHeader />
      </div>
      
      {/* Left Area - AI Code Chat */}
      <div className="editor2-left-area">
        <AICodeChat onMinimizedChange={setIsChatMinimized} />
      </div>
      
      {/* Toolbar Area - Controles */}
      <div className="editor2-toolbar-area">
        <div className="toolbar-elements flex gap-3 items-center">

          
          {/* Toggle Mode */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Modo:</span>
            <button
              onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                mode === 'edit' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mode === 'edit' ? 'Edição' : 'Preview'}
            </button>
          </div>
          
          {/* Grid Toggle (apenas em modo edição) */}
          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleGrid}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  showGrid 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Grid {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
          
          {/* Info do bloco selecionado */}
          {selectedBlockId && mode === 'edit' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Selecionado:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                {selectedBlockId.slice(0, 8)}...
              </span>
              <button
                onClick={() => selectBlock(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Center Area - JSON Canvas */}
      <div className="editor2-center-area">
        <JsonCanvas />
      </div>
    </div>
  );
};