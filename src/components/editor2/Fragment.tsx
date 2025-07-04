/**
 * Fragment Widget - Wrapper Invisível para Agrupamento
 * Baseado na arquitetura Builder.io para agrupamento lógico sem impacto visual
 */

import React from 'react';
import { RenderBlock } from './Canvas/RenderBlock';

interface FragmentProps {
  id: string;
  logicalGroup?: string;
  renderAs?: 'div' | 'span' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main' | 'nav';
  className?: string;
  ariaLabel?: string;
  conditionalRender?: boolean;
  children?: any[];
  responsiveStyles?: any;
}

export function Fragment({
  id,
  logicalGroup = 'default',
  renderAs = 'div',
  className = '',
  ariaLabel,
  conditionalRender = true,
  children = [],
  responsiveStyles = {}
}: FragmentProps) {
  
  // Fragment não renderiza se conditionalRender for false
  if (!conditionalRender) {
    console.log('🔍 Fragment conditional render disabled:', { id, logicalGroup });
    return null;
  }

  // Estilos mínimos - Fragment deve ser invisível por padrão
  const baseStyles: React.CSSProperties = {
    // Sem estilos visuais - wrapper transparente
    display: 'contents', // CSS display: contents remove o wrapper do layout
    ...responsiveStyles?.large
  };

  // Para casos específicos onde o wrapper precisa existir no DOM
  const wrapperStyles: React.CSSProperties = renderAs !== 'div' ? {
    all: 'inherit', // Herda todos os estilos do pai
    ...responsiveStyles?.large
  } : baseStyles;

  const Component = renderAs as keyof JSX.IntrinsicElements;

  console.log('👻 Fragment component:', {
    id,
    logicalGroup,
    renderAs,
    className,
    ariaLabel,
    conditionalRender,
    childrenCount: children?.length || 0,
    displayType: baseStyles.display
  });

  return (
    <Component
      id={id}
      className={`builder-fragment ${className}`.trim()}
      style={wrapperStyles}
      aria-label={ariaLabel}
      data-logical-group={logicalGroup}
      data-fragment-id={id}
    >
      {children?.map((child, index) => (
        <RenderBlock key={child.id || `fragment-child-${index}`} block={child} />
      ))}
    </Component>
  );
}

// Registrar propriedades para Builder.io compatibility
Fragment.builderOptions = {
  name: 'Fragment',
  inputs: [
    {
      name: 'logicalGroup',
      type: 'text',
      defaultValue: 'default',
      helperText: 'Nome lógico do grupo para organização (analytics, SEO, etc.)'
    },
    {
      name: 'renderAs',
      type: 'text',
      enum: ['div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav'],
      defaultValue: 'div',
      helperText: 'Elemento HTML semântico para renderização'
    },
    {
      name: 'className',
      type: 'text',
      defaultValue: '',
      helperText: 'Classes CSS customizadas (opcional)'
    },
    {
      name: 'ariaLabel',
      type: 'text',
      helperText: 'Label de acessibilidade para leitores de tela'
    },
    {
      name: 'conditionalRender',
      type: 'boolean',
      defaultValue: true,
      helperText: 'Controla se o Fragment e filhos devem ser renderizados'
    }
  ],
  defaultChildren: [
    {
      '@type': '@builder.io/sdk:Element',
      component: {
        name: 'Text',
        options: {
          text: 'Conteúdo agrupado no Fragment'
        }
      }
    },
    {
      '@type': '@builder.io/sdk:Element',
      component: {
        name: 'Text',
        options: {
          text: 'Múltiplos elementos organizados logicamente'
        }
      }
    }
  ],
  noWrap: true, // Indica que é um wrapper invisível
  canHaveChildren: true,
  isInlineChild: false
};