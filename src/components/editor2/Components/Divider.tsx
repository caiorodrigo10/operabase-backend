import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface DividerProps extends BlockComponentProps {
  color?: string;
  thickness?: string;
  margin?: string;
  width?: string;
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
}

export const Divider: React.FC<DividerProps> = ({
  id,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Divider-specific props
  color = '#e0e0e0',
  thickness = '1px',
  margin = '24px 0',
  width = '100%',
  style: borderStyle = 'solid',
  ...props
}) => {
  // Combinar estilos base
  const combinedStyles = {
    width,
    height: thickness,
    backgroundColor: borderStyle === 'solid' ? color : 'transparent',
    border: borderStyle !== 'solid' ? `${thickness} ${borderStyle} ${color}` : 'none',
    margin,
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
    <hr
      id={id}
      className={`editor2-divider ${className}`.trim()}
      style={finalStyles}
      {...props}
    />
  );
};

// Metadata para o Editor2
Divider.displayName = 'Divider';