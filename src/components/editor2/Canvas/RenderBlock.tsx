/**
 * RenderBlock - Sistema de renderização recursiva
 * Renderiza blocos JSON em componentes React com suporte a estilos
 */

import React from 'react';
import { useComponentMapSafe } from '../../../contexts/ComponentMapContext';
import { Container } from '../Components/Container';
import { HeroSection } from '../Components/HeroSection';
import { Text } from '../Components/Text';
import { Button } from '../Components/Button';
import { Section } from '../Components/Section';
import { Columns } from '../Components/Columns';
import { Image } from '../Components/Image';
import { Video } from '../Components/Video';
import { Spacer } from '../Components/Spacer';
import { Divider } from '../Components/Divider';
import { Form } from '../Components/Form';
import { Testimonial } from '../Components/Testimonial';
import { DefaultComponent } from '../Components/DefaultComponent';
import { Box } from '../Box';
import { Stack } from '../Stack';
import { Masonry } from '../MasonryFixed';
import { Fragment } from '../Fragment';

// Import do contexto de edição (opcional para não quebrar se não tiver)
let useEditor: any = null;
try {
  const editorModule = require('../../../contexts/EditorContext');
  useEditor = editorModule.useEditor;
} catch (e) {
  // Context não disponível, continuar sem interatividade
}

// Mapeamento interno de componentes
const internalComponentMap: any = {
  Container,
  HeroSection,
  Text,
  Button,
  Section,
  Columns,
  Image,
  Video,
  Spacer,
  Form,
  Testimonial,
  Divider,
  Box,
  Stack,
  Masonry,
  Fragment,
  DefaultComponent
};

// Sistema de breakpoints Builder.io style
const BREAKPOINTS = {
  large: 1024, // desktop
  medium: 768, // tablet  
  small: 0    // mobile
};

// Função para calcular estilos responsivos (Builder.io style)
function calculateResponsiveStyles(responsiveStyles?: any): React.CSSProperties {
  if (!responsiveStyles) return {};
  
  // Detectar breakpoint atual
  const getCurrentBreakpoint = () => {
    if (typeof window === 'undefined') return 'large';
    const width = window.innerWidth;
    if (width >= BREAKPOINTS.large) return 'large';
    if (width >= BREAKPOINTS.medium) return 'medium';
    return 'small';
  };
  
  const currentBreakpoint = getCurrentBreakpoint();
  
  // Combinar estilos: large como base, sobrescrever com medium/small conforme breakpoint
  return {
    ...responsiveStyles.large,
    ...(currentBreakpoint === 'medium' ? responsiveStyles.medium : {}),
    ...(currentBreakpoint === 'small' ? responsiveStyles.small : {})
  };
}

// Definindo interface simplificada aqui mesmo
interface RenderBlockProps {
  block: any;
}

export const RenderBlock: React.FC<RenderBlockProps> = ({ 
  block
}) => {
  // Usar ComponentMapContext (Builder.io pattern)
  const contextComponentMap = useComponentMapSafe();
  
  // Verificação de segurança do bloco
  if (!block) {
    console.warn('RenderBlock: block is null or undefined');
    return null;
  }
  
  if (!block.component) {
    console.warn('RenderBlock: block.component is null or undefined for block:', block);
    return null;
  }
  
  if (!block.component.name) {
    console.warn('RenderBlock: block.component.name is null or undefined for block:', block);
    return null;
  }
  
  // Usar componentMap do contexto ou fallback para o interno
  const activeComponentMap = contextComponentMap || internalComponentMap;
  
  // Tentar usar contexto de edição se disponível
  const editor = useEditor ? useEditor() : null;
  
  // Obter componente do mapeamento
  const Component = activeComponentMap[block.component.name];
  
  // Debug específico para Stack e Masonry
  if (block.component.name === 'Stack' || block.component.name === 'Masonry') {
    console.log(`🚨 COMPONENT MAP DEBUG ${block.component.name}:`, {
      componentName: block.component.name,
      componentFound: !!Component,
      availableComponents: Object.keys(activeComponentMap),
      stackAvailable: !!activeComponentMap.Stack,
      masonryAvailable: !!activeComponentMap.Masonry,
      blockId: block.id,
      blockHasChildren: !!block.children?.length
    });
  }

  // Debug GERAL para todos os componentes Stack
  if (block.component.name === 'Stack') {
    console.log('🎯 STACK ESPECÍFICO DEBUG:', {
      blockId: block.id,
      componentExists: !!Component,
      stackImported: !!Stack,
      stackInMap: !!activeComponentMap.Stack,
      willRenderStack: !!Component,
      blockStructure: block
    });
  }
  
  // Estados de interação (apenas se editor context disponível)
  const isSelected = editor ? editor.selectedBlockId === block.id : false;
  const isHovered = editor ? editor.hoveredBlockId === block.id : false;
  const inEditMode = editor ? editor.mode === 'edit' : false;
  
  // Se componente não existe, usar DefaultComponent
  if (!Component) {
    console.error(`❌ COMPONENT NOT FOUND: ${block.component.name}`, {
      availableComponents: Object.keys(activeComponentMap),
      blockId: block.id
    });
    return (
      <DefaultComponent name={block.component.name}>
        {block.children?.map((child) => (
          <RenderBlock 
            key={child.id} 
            block={child}
          />
        ))}
      </DefaultComponent>
    );
  }

  // Sistema de precedência Builder.io: responsiveStyles > styles > options
  const combinedStyles: React.CSSProperties = {
    // 1. Estilos base do bloco (menor precedência)
    ...(block.styles || {}),
    // 2. Estilos responsivos (maior precedência)
    ...(calculateResponsiveStyles(block.responsiveStyles))
  };

  // Debug para entender passagem de props
  console.log('🔧 RenderBlock debug:', {
    componentName: block.component.name,
    blockId: block.id,
    options: block.component.options,
    styles: block.styles,
    responsiveStyles: Object.keys(block.responsiveStyles || {}),
    hasChildren: !!block.children?.length
  });

  // Log específico para Columns
  if (block.component.name === 'Columns') {
    console.log('🏗️ COLUMNS DETECTED:', {
      id: block.id,
      columns: block.component.options?.columns?.length || 0,
      gutterSize: block.component.options?.gutterSize,
      firstColumnBlocks: block.component.options?.columns?.[0]?.blocks?.length || 0
    });
  }

  // Builder.io pattern: todos os styles vão direto no componente
  // (não há mais separação de wrapper vs component styles)

  // Preparar props baseado no tipo de componente
  const componentProps = (() => {
    const baseProps = {
      id: block.id,
      ...block.component.options,
      className: '',
      styles: combinedStyles, // Builder.io pattern: estilos direto no componente
      responsiveStyles: block.responsiveStyles || {}
    };

    // Para componentes específicos que precisam de tratamento especial
    if (block.component.name === 'Container') {
      return {
        ...baseProps,
        style: block.styles
      };
    }

    // Para componente Columns, passar função renderBlock
    if (block.component.name === 'Columns') {
      return {
        ...baseProps,
        style: combinedStyles,
        renderBlock: (childBlock: any) => (
          <RenderBlock 
            key={childBlock.id} 
            block={childBlock}
          />
        )
      };
    }

    // Para Stack e Masonry, passar children processados como prop
    if (block.component.name === 'Stack' || block.component.name === 'Masonry') {
      console.log(`🔍 ${block.component.name} CHILDREN DEBUG:`, {
        blockId: block.id,
        childrenExists: !!block.children,
        childrenLength: block.children?.length || 0,
        children: block.children,
        firstChild: block.children?.[0],
        childrenValid: block.children?.every(child => child && child.id && child.component)
      });
      
      return {
        ...baseProps,
        style: combinedStyles,
        children: block.children || [], // ⭐ CORREÇÃO CRÍTICA: passar children para Stack/Masonry
        componentMap: activeComponentMap // ⭐ NOVA CORREÇÃO: passar componentMap
      };
    }
    
    // Para outros componentes, usar estilos combinados
    return {
      ...baseProps,
      style: combinedStyles
    };
  })();

  // Debug children antes de renderizar
  if (block.children && block.children.length > 0 && (block.component?.name === 'Stack' || block.component?.name === 'Masonry')) {
    console.log(`🎯 DEBUGGING ${block.component.name} children:`, {
      blockId: block.id,
      componentName: block.component.name,
      childrenCount: block.children.length,
      childrenDetails: block.children.map(child => ({
        id: child.id,
        componentName: child.component?.name,
        hasComponent: !!child.component,
        componentOptions: child.component?.options
      }))
    });
  }

  // Renderizar children recursivamente
  const children = block.children?.map((child) => (
    <RenderBlock 
      key={child.id} 
      block={child}
    />
  ));

  // Handlers de interação (apenas se editor context disponível)
  const handleClick = (e: React.MouseEvent) => {
    if (editor && inEditMode) {
      e.stopPropagation();
      editor.selectBlock(block.id);
    }
  };

  const handleMouseEnter = () => {
    if (editor && inEditMode) {
      editor.setHoveredBlock(block.id);
    }
  };

  const handleMouseLeave = () => {
    if (editor && inEditMode) {
      editor.setHoveredBlock(null);
    }
  };

  // Classes CSS para interação
  const interactiveClasses = inEditMode ? [
    'editor2-block',
    isSelected && 'selected',
    isHovered && 'hovered'
  ].filter(Boolean).join(' ') : '';

  // Componentes que aplicam styles direto (sem wrapper) - Builder.io pattern
  const directStyleComponents = ['Section'];
  
  // Se não estiver em modo edição - Builder.io EXATO pattern
  if (!inEditMode) {
    // Builder.io: TODOS os componentes rendem direto (sem wrapper)
    return (
      <Component 
        {...componentProps}
        style={combinedStyles} // Styles direto no componente
        key={block.id}
      >
        {children}
      </Component>
    );
  }

  // Renderizar componente com wrapper interativo para modo edição
  return (
    <div
      className={`builder-block ${interactiveClasses}`}
      style={wrapperStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-block-id={block.id}
      data-block-type={block.component.name}
    >
      {/* Label do bloco (aparece quando selecionado/hover) */}
      <div className="editor2-block-label">
        {block.component.name}
      </div>
      
      {/* Componente real */}
      <Component 
        {...componentProps}
        key={block.id}
      >
        {children}
      </Component>
    </div>
  );
};

// Hook auxiliar para renderizar múltiplos blocos
export function useRenderBlocks(blocks: any[]) {
  return React.useMemo(() => {
    return blocks.map((block) => (
      <RenderBlock 
        key={block.id} 
        block={block}
      />
    ));
  }, [blocks]);
}

// Função auxiliar para renderizar array de blocos
export function renderBlocks(blocks: any[]) {
  return blocks.map((block) => (
    <RenderBlock 
      key={block.id} 
      block={block}
    />
  ));
}