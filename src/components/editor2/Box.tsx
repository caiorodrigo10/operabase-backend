import React from 'react';
import { BuilderElement } from '../../types/editor2-types';
import { BuilderBlock } from './Canvas/BuilderBlock';

export interface BoxProps {
  // Layout Properties
  display?: 'block' | 'flex' | 'inline-block' | 'inline-flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number;
  
  // Spacing Properties
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  
  // Visual Properties
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderColor?: string;
  boxShadow?: string;
  opacity?: number;
  
  // Sizing Properties
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  
  // Content
  children?: React.ReactNode;
  blocks?: BuilderElement[]; // ✅ Suporte para blocks do Builder.io
  id?: string;
  
  // Builder.io Integration
  builderBlock?: any;
  attributes?: any;
  context?: any;
}

export const Box: React.FC<BoxProps> = (props) => {
  // Helper function to convert number to px string
  const toPx = (value?: string | number): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return typeof value === 'number' ? `${value}px` : value;
  };

  // Build dynamic styles object
  const boxStyles: React.CSSProperties = {
    // Layout
    display: props.display || 'block',
    flexDirection: props.flexDirection,
    justifyContent: props.justifyContent,
    alignItems: props.alignItems,
    flexWrap: props.flexWrap,
    gap: props.gap ? `${props.gap}px` : undefined,
    
    // Spacing
    marginTop: toPx(props.marginTop),
    marginRight: toPx(props.marginRight),
    marginBottom: toPx(props.marginBottom),
    marginLeft: toPx(props.marginLeft),
    paddingTop: toPx(props.paddingTop),
    paddingRight: toPx(props.paddingRight),
    paddingBottom: toPx(props.paddingBottom),
    paddingLeft: toPx(props.paddingLeft),
    
    // Visual
    backgroundColor: props.backgroundColor,
    backgroundImage: props.backgroundImage ? `url(${props.backgroundImage})` : undefined,
    backgroundSize: props.backgroundSize,
    backgroundPosition: props.backgroundPosition,
    borderRadius: toPx(props.borderRadius),
    borderWidth: toPx(props.borderWidth),
    borderStyle: props.borderStyle,
    borderColor: props.borderColor,
    boxShadow: props.boxShadow,
    opacity: props.opacity,
    
    // Sizing
    width: toPx(props.width),
    height: toPx(props.height),
    minWidth: toPx(props.minWidth),
    maxWidth: toPx(props.maxWidth),
    minHeight: toPx(props.minHeight),
    maxHeight: toPx(props.maxHeight),
    
    // Base styles
    position: 'relative',
    boxSizing: 'border-box'
  };

  // Filter out undefined values for cleaner CSS
  const cleanStyles = Object.fromEntries(
    Object.entries(boxStyles).filter(([_, value]) => value !== undefined)
  );

  console.log(`📦 Box component rendering:`, {
    id: props.id,
    hasBlocks: !!props.blocks,
    blocksCount: props.blocks?.length || 0,
    hasChildren: !!props.children,
    styles: cleanStyles
  });

  return (
    <div 
      id={props.id}
      className="editor2-box"
      style={cleanStyles}
      {...props.attributes}
    >
      {/* Renderizar blocks se fornecidos */}
      {props.blocks && props.blocks.length > 0 && props.blocks.map((block) => (
        <BuilderBlock 
          key={block.id} 
          block={block} 
          context={props.context} 
        />
      ))}
      
      {/* Renderizar children React se fornecidos */}
      {props.children}
    </div>
  );
};