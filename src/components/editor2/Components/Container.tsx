/**
 * Container - Componente para centralizar conteúdo
 * Aplica maxWidth e margin: 0 auto conforme Builder.io
 */

import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface ContainerProps extends BlockComponentProps {
  maxWidth?: string;
  margin?: string;
  padding?: string;
}

export const Container: React.FC<ContainerProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Container-specific props from Builder.io
  maxWidth = '1200px',
  margin = '0 auto',
  padding,
  ...props
}) => {
  // Debug logs para Container
  console.log('📦 Container component:', { 
    id, 
    maxWidth, 
    margin,
    padding,
    responsiveStyles: Object.keys(responsiveStyles || {})
  });

  // ✅ Builder.io pattern: Container centralização completa
  const containerStyles = {
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth, // Garantir string
    margin: margin || '0 auto', // Centralização horizontal padrão
    width: '100%', // Ocupa largura disponível
    textAlign: 'center', // Centralização do texto (herança para filhos)
    padding,
    ...styles, // Builder.io styles têm precedência
    ...props.style // style final do RenderBlock
  };

  // Aplicar estilos responsivos conforme Builder.io
  const getResponsiveStyles = () => {
    if (typeof window === 'undefined') return containerStyles;
    
    const width = window.innerWidth;
    if (width >= 1024 && responsiveStyles.large) {
      return { ...containerStyles, ...responsiveStyles.large };
    } else if (width >= 768 && responsiveStyles.medium) {
      return { ...containerStyles, ...responsiveStyles.medium };
    } else if (width < 768 && responsiveStyles.small) {
      return { ...containerStyles, ...responsiveStyles.small };
    }
    
    return containerStyles;
  };

  const finalStyles = getResponsiveStyles();

  // Remover propriedades undefined para DOM limpo
  const cleanStyles = Object.fromEntries(
    Object.entries(finalStyles).filter(([_, value]) => value !== undefined)
  );

  return (
    <div
      id={id}
      className={`editor2-container ${className}`.trim()}
      style={cleanStyles}
      {...props}
    >
      {children}
    </div>
  );
};