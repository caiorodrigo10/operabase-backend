import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface SectionProps extends BlockComponentProps {
  padding?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  maxWidth?: string;
  margin?: string;
  borderRadius?: string;
  boxShadow?: string;
  minHeight?: string;
  style?: React.CSSProperties; // ✅ Style do RenderBlock
}

export const Section: React.FC<SectionProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  style = {}, // ✅ Aceitar style do RenderBlock
  // Section-specific props
  padding = '40px 0',
  backgroundColor,
  backgroundImage,
  maxWidth = '1200px',
  margin = '0 auto',
  borderRadius,
  boxShadow,
  minHeight,
  ...props
}) => {
  // Debug logs para Section
  console.log('🎨 Section component:', { 
    id, 
    backgroundColor, 
    padding, 
    styles: Object.keys(styles || {}),
    responsiveStyles: Object.keys(responsiveStyles || {})
  });
  // Calcular estilos responsivos (Builder.io style)
  const calculateResponsiveStyles = () => {
    if (!responsiveStyles) return {};
    
    const getCurrentBreakpoint = () => {
      if (typeof window === 'undefined') return 'large';
      const width = window.innerWidth;
      if (width >= 1024) return 'large';
      if (width >= 768) return 'medium';
      return 'small';
    };
    
    const currentBreakpoint = getCurrentBreakpoint();
    
    return {
      ...responsiveStyles.large,
      ...(currentBreakpoint === 'medium' ? responsiveStyles.medium : {}),
      ...(currentBreakpoint === 'small' ? responsiveStyles.small : {})
    };
  };

  // ✅ Builder.io pattern: Section apenas background/padding - SEM CENTRALIZAÇÃO
  const sectionStyles = {
    // Propriedades básicas Builder.io
    width: '100%', // Section ocupa toda largura
    margin: 0, // Sections coladas
    // Background e espaçamento
    backgroundColor,
    padding,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: backgroundImage ? 'cover' : undefined,
    backgroundPosition: backgroundImage ? 'center' : undefined,
    backgroundRepeat: backgroundImage ? 'no-repeat' : undefined,
    // Propriedades visuais opcionais
    borderRadius,
    boxShadow,
    minHeight,
    // Sobrescrever com styles e responsiveStyles
    ...styles,
    ...calculateResponsiveStyles()
  };

  // ✅ Builder.io pattern: style do RenderBlock tem precedência máxima
  const finalStyles = {
    ...sectionStyles,
    ...calculateResponsiveStyles(), // Responsividade calculada
    ...style // Style do RenderBlock sobrescreve tudo
  };

  return (
    <section
      id={id}
      className={`editor2-section ${className}`.trim()}
      style={finalStyles}
      {...props}
    >
      {/* ✅ Builder.io pattern: Container component faz toda centralização */}
      {children}
    </section>
  );
};

// Metadata para o Editor2
Section.displayName = 'Section';