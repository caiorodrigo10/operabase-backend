/**
 * Stack Widget - Layout Vertical/Horizontal
 * Implementação seguindo padrão Builder.io com blocks
 */

import React from 'react';
import { StackProps } from '../../../types/editor2-types';
import { BuilderBlock } from './Canvas/BuilderBlock';

export function Stack({
  id,
  blocks = [],
  direction = 'horizontal',
  spacing = 16,
  alignItems = 'center',
  justifyContent = 'flex-start',
  wrap = false,
  reverseOrder = false
}: StackProps) {
  console.log(`🎯 STACK - Builder.io Pattern:`, {
    blockId: id,
    componentName: 'Stack',
    blocksCount: blocks.length,
    direction,
    spacing,
    blocksDetails: blocks.map(block => ({
      id: block.id,
      componentName: block.component.name,
      hasComponent: !!block.component,
      componentOptions: block.component.options
    }))
  });

  // Configuração dos estilos flex
  const flexDirection = direction === 'horizontal' ? 'row' : 'column';
  const flexWrap = wrap ? 'wrap' : 'nowrap';
  
  const finalStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: reverseOrder 
      ? (direction === 'horizontal' ? 'row-reverse' : 'column-reverse')
      : flexDirection,
    gap: `${spacing}px`,
    alignItems,
    justifyContent,
    flexWrap,
    width: '100%'
  };

  console.log(`📚 Stack Builder.io Pattern:`, {
    id,
    direction,
    spacing,
    alignItems,
    justifyContent,
    wrap,
    reverseOrder,
    blocksCount: blocks.length,
    blocksValid: blocks.every(block => block.id && block.component),
    stylesApplied: finalStyles
  });

  return (
    <div
      id={id}
      className="builder-stack"
      style={finalStyles}
    >
      {blocks.map((block, index) => {
        console.log(`🔗 Stack rendering block ${index}:`, {
          blockId: block.id,
          componentName: block.component.name,
          hasComponent: !!block.component,
          blockValid: !!(block.id && block.component)
        });
        
        return (
          <BuilderBlock 
            key={block.id} 
            block={block}
          />
        );
      })}
    </div>
  );
}