/**
 * BuilderBlock.tsx - Builder.io Pattern Implementation
 * Baseado no padrão oficial Builder.io para renderização de elementos
 */

import React from 'react';
import { BuilderElement } from '../../../../types/editor2-types';
import { componentMap } from './componentMap';

export interface BuilderBlockProps {
  block: BuilderElement;
  context?: any;
}

/**
 * BuilderBlock - Componente que segue o padrão Builder.io
 * Renderiza elementos Builder.io com suporte a components que processam blocks vs children
 */
export function BuilderBlock({ block, context }: BuilderBlockProps) {
  
  console.log(`🔧 BuilderBlock rendering:`, {
    componentName: block.component.name,
    blockId: block.id,
    hasChildren: !!block.children,
    childrenCount: block.children?.length || 0,
    options: block.component.options
  });

  // Obter componente do mapa
  const Component = componentMap[block.component.name];
  
  if (!Component) {
    console.error(`❌ Component not found in componentMap: ${block.component.name}`);
    const DefaultComponent = componentMap['DefaultComponent'];
    
    if (DefaultComponent) {
      return <DefaultComponent name={block.component.name} id={block.id} />;
    }
    
    return (
      <div 
        id={block.id}
        style={{ 
          background: 'red', 
          color: 'white', 
          padding: '10px',
          border: '2px solid #ff0000'
        }}
      >
        Missing Component: {block.component.name}
      </div>
    );
  }

  // Componentes que processam children como blocks data (padrão Builder.io)
  const BLOCKS_COMPONENTS = ['Stack', 'Masonry', 'Fragment'];
  
  // Componentes especiais que precisam de tratamento diferente
  const SPECIAL_COMPONENTS = ['Columns', 'Box'];
  
  if (BLOCKS_COMPONENTS.includes(block.component.name)) {
    console.log(`📦 Rendering blocks component: ${block.component.name}`, {
      blocksCount: block.children?.length || 0,
      blocks: block.children?.map(child => ({ id: child.id, component: child.component.name }))
    });
    
    return (
      <Component
        {...block.component.options}
        id={block.id}
        blocks={block.children || []} // ✅ Passar como blocks data
        context={context}
      />
    );
  }

  // Tratamento especial para Columns (seguindo padrão Builder.io oficial)
  if (block.component.name === 'Columns') {
    console.log(`🏗️ Rendering Columns with Builder.io pattern:`, {
      childrenCount: block.children?.length || 0,
      hasColumnsConfig: !!block.component.options.columns,
      columnsConfig: block.component.options.columns
    });
    
    // Converter children em estrutura columns[].blocks conforme Builder.io
    const columnsConfig = block.component.options.columns || [];
    const columnsData = columnsConfig.map((colConfig: any, index: number) => ({
      ...colConfig,
      blocks: block.children?.filter((child: any, childIndex: number) => {
        // Distribuir children entre as colunas baseado no índice
        return childIndex % columnsConfig.length === index;
      }) || []
    }));
    
    console.log(`📊 Columns data conversion:`, {
      originalChildren: block.children?.length || 0,
      columnsCount: columnsData.length,
      columnsData: columnsData.map((col: any) => ({ 
        width: col.width, 
        blocksCount: col.blocks.length 
      }))
    });
    
    return (
      <Component
        {...block.component.options}
        id={block.id}
        columns={columnsData} // ✅ Estrutura Builder.io oficial: columns[].blocks
        context={context}
      />
    );
  }

  // Tratamento especial para Box
  if (block.component.name === 'Box') {
    console.log(`📦 Rendering Box component:`, {
      childrenCount: block.children?.length || 0,
      children: block.children?.map((child: any) => ({ id: child.id, component: child.component.name }))
    });
    
    return (
      <Component
        {...block.component.options}
        id={block.id}
        blocks={block.children || []} // Box suporta blocks
        context={context}
      />
    );
  }

  // Componentes tradicionais que usam children React (Section, Container, etc.)
  console.log(`⚛️ Rendering React children component: ${block.component.name}`, {
    childrenCount: block.children?.length || 0,
    hasResponsiveStyles: !!block.responsiveStyles?.large
  });

  // APLICAR PADRÃO STACK: Responsive styles + component options
  const responsiveStyles = block.responsiveStyles?.large || {};
  const componentStyle = block.component.options.style || {};
  
  // Seguir padrão Stack Widget que funciona
  const finalStyle: React.CSSProperties = {
    ...responsiveStyles,
    ...componentStyle
  };

  console.log(`🎨 Applying styles for ${block.component.name}:`, {
    responsiveStyles,
    componentStyle,
    finalStyle
  });

  return (
    <Component 
      {...block.component.options} 
      id={block.id}
      style={finalStyle}
      context={context}
    >
      {block.children?.map((child: any) => (
        <BuilderBlock 
          key={child.id} 
          block={child} 
          context={context}
        />
      ))}
    </Component>
  );
}

/**
 * BuilderBlocks - Renderiza array de blocks (padrão Builder.io)
 */
export interface BuilderBlocksProps {
  blocks: BuilderElement[];
  context?: any;
}

export function BuilderBlocks({ blocks, context }: BuilderBlocksProps) {
  return (
    <>
      {blocks.map(block => (
        <BuilderBlock 
          key={block.id} 
          block={block} 
          context={context}
        />
      ))}
    </>
  );
}

/**
 * Hook para renderizar múltiplos blocks
 */
export function useRenderBlocks(blocks: BuilderElement[], context?: any) {
  return React.useMemo(() => {
    return blocks.map((block) => (
      <BuilderBlock 
        key={block.id} 
        block={block} 
        context={context}
      />
    ));
  }, [blocks, context]);
}

/**
 * Função utilitária para renderizar blocks
 */
export function renderBlocks(blocks: BuilderElement[], context?: any) {
  return blocks.map((block) => (
    <BuilderBlock 
      key={block.id} 
      block={block} 
      context={context}
    />
  ));
}