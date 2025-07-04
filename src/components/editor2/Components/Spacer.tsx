import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface SpacerProps extends BlockComponentProps {
  height?: string;
}

export const Spacer: React.FC<SpacerProps> = ({
  id,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Spacer-specific props
  height = '32px',
  ...props
}) => {
  // Combinar estilos base
  const combinedStyles = {
    height,
    width: '100%',
    display: 'block',
    ...styles,
  };

  // Aplicar estilos responsivos
  const getResponsiveStyles = () => {
    if (typeof window === 'undefined') return combinedStyles;
    
    const viewportWidth = window.innerWidth;
    if (viewportWidth >= 1024 && responsiveStyles.large) {
      return { ...combinedStyles, ...responsiveStyles.large };
    } else if (viewportWidth >= 768 && responsiveStyles.medium) {
      return { ...combinedStyles, ...responsiveStyles.medium };
    } else if (viewportWidth < 768 && responsiveStyles.small) {
      return { ...combinedStyles, ...responsiveStyles.small };
    }
    
    return combinedStyles;
  };

  const finalStyles = getResponsiveStyles();

  return (
    <div
      id={id}
      className={`editor2-spacer ${className}`.trim()}
      style={finalStyles}
      {...props}
    />
  );
};

// Metadata para o Editor2
Spacer.displayName = 'Spacer';