import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface ImageProps extends BlockComponentProps {
  src?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  borderRadius?: string;
  width?: string;
  height?: string;
  link?: string;
  lazyLoad?: boolean;
  aspectRatio?: string;
}

export const Image: React.FC<ImageProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Image-specific props
  src,
  alt = '',
  objectFit = 'cover',
  borderRadius,
  width = '100%',
  height = 'auto',
  link,
  lazyLoad = true,
  aspectRatio,
  ...props
}) => {
  // Combinar estilos base
  const combinedStyles = {
    width,
    height,
    objectFit,
    borderRadius,
    aspectRatio,
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

  const imageElement = (
    <img
      id={id}
      src={src}
      alt={alt}
      className={`editor2-image ${className}`.trim()}
      style={finalStyles}
      loading={lazyLoad ? 'lazy' : 'eager'}
      {...props}
    />
  );

  // Envolver com link se fornecido
  if (link) {
    return (
      <a href={link} className="editor2-image-link">
        {imageElement}
      </a>
    );
  }

  return imageElement;
};

// Metadata para o Editor2
Image.displayName = 'Image';