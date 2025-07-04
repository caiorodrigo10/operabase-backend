/**
 * EditorContext - Context para estado de edição
 * Gerencia seleção de blocos, hover, modo edição vs preview
 */

import React, { createContext, useContext, useState } from 'react';

interface EditorState {
  // Seleção de blocos
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  
  // Modo do editor
  mode: 'edit' | 'preview';
  showGrid: boolean;
  
  // Funcionalidades futuras
  isCollapsed: Record<string, boolean>;
}

interface EditorActions {
  // Seleção
  selectBlock: (blockId: string | null) => void;
  setHoveredBlock: (blockId: string | null) => void;
  
  // Modo
  setMode: (mode: 'edit' | 'preview') => void;
  toggleGrid: () => void;
  
  // Collapse
  toggleCollapse: (blockId: string) => void;
  isBlockCollapsed: (blockId: string) => boolean;
}

type EditorContextType = EditorState & EditorActions;

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EditorState>({
    selectedBlockId: null,
    hoveredBlockId: null,
    mode: 'edit',
    showGrid: false,
    isCollapsed: {}
  });

  const selectBlock = (blockId: string | null) => {
    setState(prev => ({ ...prev, selectedBlockId: blockId }));
  };

  const setHoveredBlock = (blockId: string | null) => {
    setState(prev => ({ ...prev, hoveredBlockId: blockId }));
  };

  const setMode = (mode: 'edit' | 'preview') => {
    setState(prev => ({ ...prev, mode }));
  };

  const toggleGrid = () => {
    setState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  };

  const toggleCollapse = (blockId: string) => {
    setState(prev => ({
      ...prev,
      isCollapsed: {
        ...prev.isCollapsed,
        [blockId]: !prev.isCollapsed[blockId]
      }
    }));
  };

  const isBlockCollapsed = (blockId: string): boolean => {
    return state.isCollapsed[blockId] || false;
  };

  const contextValue: EditorContextType = {
    ...state,
    selectBlock,
    setHoveredBlock,
    setMode,
    toggleGrid,
    toggleCollapse,
    isBlockCollapsed
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};