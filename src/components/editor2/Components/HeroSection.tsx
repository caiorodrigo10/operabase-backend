/**
 * HeroSection - Componente base para seção hero
 * Renderiza título, subtítulo e children (botões, etc)
 */

import React from 'react';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  title = 'Título padrão',
  subtitle,
  buttonText,
  children,
  style
}) => {
  return (
    <section 
      className="hero-section py-16 px-4 text-center bg-gradient-to-b from-blue-50 to-white"
      style={style}
    >
      <div className="max-w-4xl mx-auto">
        {/* Título */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          {title}
        </h1>
        
        {/* Subtítulo */}
        {subtitle && (
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        
        {/* Children (botões, etc) */}
        {children && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {children}
          </div>
        )}
        
        {/* Botão padrão se não há children */}
        {!children && buttonText && (
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
            {buttonText}
          </button>
        )}
      </div>
    </section>
  );
};