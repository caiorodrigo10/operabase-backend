/**
 * Testimonial Component - Builder.io Style
 * Componente para exibir depoimentos com autor, texto, rating e avatar
 */

import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface TestimonialProps extends BlockComponentProps {
  author?: string;
  text?: string;
  rating?: number;
  avatar?: string;
  position?: string;
  company?: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export const Testimonial: React.FC<TestimonialProps> = ({
  id,
  author = 'Nome do Cliente',
  text = 'Este é um depoimento incrível sobre o produto ou serviço.',
  rating = 5,
  avatar,
  position,
  company,
  backgroundColor = 'white',
  padding = '32px',
  borderRadius = '12px',
  textAlign = 'center',
  styles = {},
  responsiveStyles = {},
  className = '',
  ...props
}) => {
  // Combinar estilos base com customizações
  const baseStyles = {
    backgroundColor,
    padding,
    borderRadius,
    textAlign,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px'
  };

  const getResponsiveClasses = () => {
    return 'editor2-testimonial';
  };

  const getResponsiveStyles = () => {
    const combinedStyles = { ...baseStyles, ...styles };
    
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

  // Renderizar estrelas do rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= rating ? '#fbbf24' : '#d1d5db',
            fontSize: '20px'
          }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div
      id={id}
      className={`${getResponsiveClasses()} ${className}`.trim()}
      style={finalStyles}
      {...props}
    >
      {/* Rating */}
      {rating > 0 && (
        <div className="testimonial-rating" style={{ display: 'flex', gap: '2px' }}>
          {renderStars()}
        </div>
      )}

      {/* Texto do depoimento */}
      <blockquote
        className="testimonial-text"
        style={{
          fontSize: '18px',
          lineHeight: '1.6',
          fontStyle: 'italic',
          color: '#374151',
          margin: 0,
          textAlign: textAlign
        }}
      >
        "{text}"
      </blockquote>

      {/* Informações do autor */}
      <div
        className="testimonial-author"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '8px'
        }}
      >
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={author}
            className="testimonial-avatar"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover' as const,
              border: '2px solid #e5e7eb'
            }}
          />
        ) : (
          <div
            className="testimonial-avatar-fallback"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            {author.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome e posição */}
        <div className="testimonial-author-info" style={{ textAlign: 'left' }}>
          <div
            className="testimonial-author-name"
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}
          >
            {author}
          </div>
          
          {(position || company) && (
            <div
              className="testimonial-author-position"
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}
            >
              {position && company ? `${position}, ${company}` : position || company}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};