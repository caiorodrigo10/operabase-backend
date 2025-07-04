/**
 * Masonry Widget - Layout Pinterest-style
 * Implementação seguindo padrão Stack Widget que funciona + Builder.io
 */

import React from 'react';
import { BuilderElement } from '../../../types/editor2-types';
import { BuilderBlock } from './Canvas/BuilderBlock';

export interface MasonryProps {
  id: string;
  blocks?: BuilderElement[];
  columns?: number;
  columnGap?: number;
  rowGap?: number;
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  context?: any;
}

export function Masonry({
  id,
  blocks = [],
  columns = 3,
  columnGap = 20,
  rowGap = 20,
  breakpoints = {
    mobile: 1,
    tablet: 2,
    desktop: 3
  },
  context
}: MasonryProps) {

  console.log(`🧱 MASONRY - Builder.io Pattern:`, {
    blockId: id,
    componentName: 'Masonry',
    blocksCount: blocks.length,
    columns,
    columnGap,
    rowGap,
    breakpoints,
    blocksDetails: blocks.map(block => ({
      id: block.id,
      componentName: block.component.name,
      hasComponent: !!block.component,
      componentOptions: block.component.options
    }))
  });
  
  // SEGUIR PADRÃO STACK WIDGET: CSS-in-JS inline
  const finalStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${rowGap}px ${columnGap}px`,
    width: '100%',
    gridAutoRows: 'min-content',
    alignItems: 'start'
  };

  console.log(`🧱 Masonry Builder.io Pattern:`, {
    id,
    columns,
    columnGap,
    rowGap,
    breakpoints,
    blocksCount: blocks.length,
    blocksValid: blocks.every(block => block.id && block.component),
    stylesApplied: finalStyles
  });

  return (
    <div
      id={id}
      className="builder-masonry"
      style={finalStyles}
    >
      {blocks.map((block, index) => {
        console.log(`🔗 Masonry rendering block ${index}:`, {
          blockId: block.id,
          componentName: block.component.name,
          hasComponent: !!block.component,
          blockValid: !!(block.id && block.component)
        });
        
        return (
          <BuilderBlock 
            key={block.id} 
            block={block}
            context={context}
          />
        );
      })}
    </div>
  );
}