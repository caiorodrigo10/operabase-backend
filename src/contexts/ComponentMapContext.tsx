import React, { createContext, useContext, ReactNode } from 'react';

// Definindo o tipo do ComponentMap
interface ComponentMapContextType {
  [key: string]: React.ComponentType<any>;
}

// Criando o Context
const ComponentMapContext = createContext<ComponentMapContextType | null>(null);

// Provider Component
interface ComponentMapProviderProps {
  children: ReactNode;
  componentMap: ComponentMapContextType;
}

export function ComponentMapProvider({ children, componentMap }: ComponentMapProviderProps) {
  return (
    <ComponentMapContext.Provider value={componentMap}>
      {children}
    </ComponentMapContext.Provider>
  );
}

// Hook customizado para usar o ComponentMap
export function useComponentMap(): ComponentMapContextType {
  const context = useContext(ComponentMapContext);
  
  if (!context) {
    throw new Error('useComponentMap must be used within a ComponentMapProvider');
  }
  
  return context;
}

// Hook seguro que retorna componentMap vazio se não estiver dentro do provider
export function useComponentMapSafe() {
  const context = useContext(ComponentMapContext);
  
  if (!context) {
    console.warn('useComponentMapSafe: No ComponentMapProvider found, returning empty componentMap');
    return {};
  }
  
  return context.componentMap || {};
}