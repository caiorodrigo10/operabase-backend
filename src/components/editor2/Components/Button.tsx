/**
 * Button - Componente base para botões
 * Renderiza botão com suporte a estilos e variantes
 */

import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface ButtonProps extends BlockComponentProps {
  text?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  padding?: string;
  border?: string;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Button-specific props from Builder.io
  text = 'Botão',
  variant = 'primary',
  backgroundColor,
  color,
  borderRadius = '6px',
  padding = '12px 24px',
  border = 'none',
  onClick,
  ...props
}) => {
  // Debug logs para Button
  console.log('🔘 Button component:', { 
    id, 
    text, 
    variant,
    backgroundColor,
    color,
    styles: Object.keys(styles || {})
  });

  // Estilos por variante conforme Builder.io
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: backgroundColor || '#0070f3',
          color: color || '#ffffff',
          border: 'none'
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: color || '#0070f3',
          border: `1px solid ${backgroundColor || '#0070f3'}`
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: color || '#333333',
          border: '1px solid #cccccc'
        };
      default:
        return {};
    }
  };

  // Combinar estilos Builder.io
  const buttonStyles = {
    ...getVariantStyles(),
    borderRadius,
    padding,
    cursor: 'pointer',
    display: 'inline-block',
    fontSize: '16px',
    width: 'auto', // Builder.io default - NÃO ocupar largura total
    fontWeight: '500',
    textAlign: 'center' as const,
    textDecoration: 'none',
    outline: 'none',
    ...styles, // Builder.io styles têm precedência
    ...props.style // style final do RenderBlock
  };

  // Aplicar estilos responsivos se necessário
  const getResponsiveStyles = () => {
    if (typeof window === 'undefined') return buttonStyles;
    
    const width = window.innerWidth;
    if (width >= 1024 && responsiveStyles.large) {
      return { ...buttonStyles, ...responsiveStyles.large };
    } else if (width >= 768 && responsiveStyles.medium) {
      return { ...buttonStyles, ...responsiveStyles.medium };
    } else if (width < 768 && responsiveStyles.small) {
      return { ...buttonStyles, ...responsiveStyles.small };
    }
    
    return buttonStyles;
  };

  const finalStyles = getResponsiveStyles();

  // Remover propriedades undefined para DOM limpo
  const cleanStyles = Object.fromEntries(
    Object.entries(finalStyles).filter(([_, value]) => value !== undefined)
  );

  return (
    <button 
      id={id}
      className={`editor2-button ${className}`.trim()}
      style={cleanStyles}
      onClick={onClick}
      {...props}
    >
      {children || text}
    </button>
  );
};