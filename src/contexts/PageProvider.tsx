/**
 * PageProvider - Context API para Editor2
 * Gerencia estado global da página JSON e operações relacionadas
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PageJSON, PageContextType } from '@/../shared/editor2-types';
import { mockPageJson } from '@/data/mockPageJson';
import cleanPageJson from '@/data/cleanPageJson.json';
import psychologistPageJson from '@/data/psychologistPageJson.json';

// Criação do Context
const PageContext = createContext<PageContextType | undefined>(undefined);

// Props do Provider
interface PageProviderProps {
  children: ReactNode;
}

// Provider Component
export function PageProvider({ children }: PageProviderProps) {
  // Estado principal da página JSON
  const [pageJson, setPageJson] = useState<PageJSON | null>(null);
  
  // Estado de loading
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Função auxiliar para limpar erro ao setar nova página
  const handleSetPageJson = (newPageJson: PageJSON | null) => {
    setError(null); // Limpa erro ao carregar nova página
    setPageJson(newPageJson);
  };

  // Função auxiliar para limpar estados
  const handleSetError = (newError: string | null) => {
    if (newError) {
      setIsLoading(false); // Para loading ao encontrar erro
    }
    setError(newError);
  };

  // Função para salvar JSON no localStorage (Builder.io style auto-save)
  const savePageJson = (newPageJson: PageJSON) => {
    try {
      localStorage.setItem('editor2-page-json', JSON.stringify(newPageJson, null, 2));
      setPageJson(newPageJson);
      setError(null);
      console.log('✅ PageProvider: JSON saved to localStorage');
      return true;
    } catch (error) {
      console.error('❌ PageProvider: Error saving JSON:', error);
      setError('Erro ao salvar JSON');
      return false;
    }
  };

  // Função para resetar ao template padrão
  const resetToDefault = () => {
    localStorage.removeItem('editor2-page-json');
    setPageJson(mockPageJson as PageJSON);
    setError(null);
    console.log('🔄 PageProvider: Reset to default template');
  };

  // Efeito para carregar JSON do localStorage ou usar padrão (Builder.io style)
  useEffect(() => {
    console.log('🚀 PageProvider: Carregando página automaticamente...');
    
    try {
      // Tentar carregar do localStorage primeiro
      const savedJson = localStorage.getItem('editor2-page-json');
      console.log('🔍 PageProvider DEBUG:', {
        savedJsonExists: !!savedJson,
        savedJsonLength: savedJson?.length || 0,
        savedJsonPreview: savedJson?.substring(0, 100) + '...'
      });
      
      if (savedJson) {
        const parsedJson = JSON.parse(savedJson);
        setPageJson(parsedJson);
        console.log('📄 PageProvider: Loaded from localStorage', parsedJson);
      } else {
        // Se não tem JSON salvo, usar template padrão
        setPageJson(mockPageJson as PageJSON);
        console.log('📄 PageProvider: Using default template');
      }
    } catch (error) {
      console.error('❌ PageProvider: Error loading from localStorage:', error);
      setPageJson(mockPageJson as PageJSON);
      setError('Erro ao carregar JSON');
    }
  }, []);

  // Valor do contexto
  const contextValue: PageContextType = {
    pageJson,
    setPageJson: handleSetPageJson,
    savePageJson,
    resetToDefault,
    isLoading,
    setIsLoading,
    error,
    setError: handleSetError,
  };

  return (
    <PageContext.Provider value={contextValue}>
      {children}
    </PageContext.Provider>
  );
}

// Hook customizado para usar o contexto
export function usePage(): PageContextType {
  const context = useContext(PageContext);
  
  if (context === undefined) {
    throw new Error('usePage deve ser usado dentro de um PageProvider');
  }
  
  return context;
}

// Hook auxiliar para verificar se tem dados
export function useHasPageData(): boolean {
  const { pageJson } = usePage();
  return pageJson !== null && pageJson.blocks.length > 0;
}

// Hook auxiliar para obter meta dados
export function usePageMeta() {
  const { pageJson } = usePage();
  return pageJson?.meta || null;
}