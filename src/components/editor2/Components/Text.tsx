/**
 * Text - Componente base para texto
 * Renderiza texto simples com suporte a estilos
 */

import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface TextProps extends BlockComponentProps {
  text?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: string;
  letterSpacing?: string;
  textDecoration?: string;
  fontFamily?: string;
}

export const Text: React.FC<TextProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Text-specific props from Builder.io
  text = '',
  tag = 'p',
  color,
  fontSize,
  fontWeight,
  textAlign,
  lineHeight,
  letterSpacing,
  textDecoration,
  fontFamily,
  ...props
}) => {
  // Debug logs para Text
  console.log('📝 Text component rendered:', { 
    id, 
    text: text.slice(0, 30) + '...', 
    tag, 
    stylesReceived: styles,
    finalStyle: props.style
  });

  // Combinar estilos das props com styles inline
  const combinedStyles = {
    color,
    fontSize,
    fontWeight,
    textAlign,
    lineHeight,
    letterSpacing,
    textDecoration,
    fontFamily,
    ...styles, // Builder.io styles têm precedência
    ...props.style // style final do RenderBlock
  };

  // Aplicar estilos responsivos se necessário
  const getResponsiveStyles = () => {
    if (typeof window === 'undefined') return combinedStyles;
    
    const width = window.innerWidth;
    if (width >= 1024 && responsiveStyles.large) {
      return { ...combinedStyles, ...responsiveStyles.large };
    } else if (width >= 768 && responsiveStyles.medium) {
      return { ...combinedStyles, ...responsiveStyles.medium };
    } else if (width < 768 && responsiveStyles.small) {
      return { ...combinedStyles, ...responsiveStyles.small };
    }
    
    return combinedStyles;
  };

  const finalStyles = getResponsiveStyles();

  // Remover propriedades undefined para DOM limpo
  const cleanStyles = Object.fromEntries(
    Object.entries(finalStyles).filter(([_, value]) => value !== undefined)
  );

  const Tag = tag as keyof JSX.IntrinsicElements;

  return (
    <Tag
      id={id}
      className={`editor2-text ${className}`.trim()}
      style={cleanStyles}
      {...props}
    >
      {children || text}
    </Tag>
  );
};