/**
 * Columns Component - Builder.io Official Pattern
 * Baseado exatamente no examples/builder-io-reference/Columns.tsx
 */

import React from 'react';
import { BuilderElement } from '../../../types/editor2-types';
import { BuilderBlock } from './Canvas/BuilderBlock';

export interface ColumnsProps {
  id?: string;
  columns?: Array<{
    blocks: BuilderElement[];
    width?: number;
    link?: string;
  }>;
  gutterSize?: number;
  stackColumnsAt?: 'never' | 'tablet' | 'mobile';
  reverseColumnsWhenStacked?: boolean;
  context?: any;
}

export function Columns({
  id,
  columns = [],
  gutterSize = 20,
  stackColumnsAt = 'tablet',
  reverseColumnsWhenStacked = false,
  context
}: ColumnsProps) {

  console.log(`🏗️ Columns Builder.io Pattern:`, {
    blockId: id,
    columnsCount: columns.length,
    gutterSize,
    stackColumnsAt,
    reverseColumnsWhenStacked,
    columnsDetails: columns.map((col, index) => ({
      index,
      width: col.width || 100 / columns.length,
      blocksCount: col.blocks?.length || 0,
      hasLink: !!col.link
    }))
  });

  // Método exato do Builder.io (linha 77-78)
  const getWidth = (index: number) => {
    return (columns[index] && columns[index].width) || 100 / columns.length;
  };

  // Método exato do Builder.io (linha 81-87)
  const getColumnWidth = (index: number) => {
    const width = getWidth(index);
    const subtractWidth = gutterSize * (columns.length - 1) * (width / 100);
    return `calc(${width}% - ${subtractWidth}px)`;
  };

  // Breakpoints (seguir Builder.io pattern)
  const breakpointSizes = {
    small: { max: 640 },
    medium: { max: 991 },
    large: { min: 992 }
  };

  // CSS-in-JS exato do Builder.io (linha 101-114)
  const columnsStyle: React.CSSProperties = {
    display: 'flex',
    height: '100%',
    // Media query aplicada via CSS-in-JS quando necessário
    ...(stackColumnsAt !== 'never' && {
      [`@media (max-width: ${
        stackColumnsAt !== 'tablet'
          ? breakpointSizes.small.max
          : breakpointSizes.medium.max
      }px)`]: {
        flexDirection: reverseColumnsWhenStacked ? 'column-reverse' : 'column',
        alignItems: 'stretch',
      },
    }),
  };

  // DOM CSS Override (seguir Stack Widget pattern que funciona)
  React.useEffect(() => {
    if (id) {
      const element = document.getElementById(id);
      if (element) {
        // Forçar CSS-in-JS igual Stack Widget
        element.style.setProperty('display', 'flex', 'important');
        element.style.setProperty('height', '100%', 'important');
        console.log(`🔧 DOM CSS override applied for Columns ${id}`);
      }
    }
  }, [id]);

  return (
    <div
      id={id}
      className="builder-columns"
      style={columnsStyle}
    >
      {columns.map((col, index) => {
        // CSS-in-JS para cada coluna (linha 128-148)
        const columnStyle: React.CSSProperties = {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          lineHeight: 'normal',
          width: getColumnWidth(index),
          marginLeft: index === 0 ? 0 : gutterSize,
          // Media query para empilhamento
          ...(stackColumnsAt !== 'never' && {
            [`@media (max-width: ${
              stackColumnsAt !== 'tablet'
                ? breakpointSizes.small.max
                : breakpointSizes.medium.max
            }px)`]: {
              width: '100%',
              marginLeft: 0,
            },
          }),
        };

        console.log(`📊 Column ${index} rendering:`, {
          width: getWidth(index),
          calculatedWidth: getColumnWidth(index),
          marginLeft: index === 0 ? 0 : gutterSize,
          blocksCount: col.blocks?.length || 0,
          hasLink: !!col.link
        });

        // Wrapper de coluna (linha 122-159)
        const ColumnWrapper = col.link ? 'a' : 'div';
        
        return (
          <React.Fragment key={index}>
            <ColumnWrapper
              className="builder-column"
              {...(col.link ? { href: col.link } : {})}
              style={columnStyle}
            >
              {/* Renderizar blocks da coluna (linha 150-157) */}
              {col.blocks?.map((block) => {
                console.log(`🔗 Rendering block in column ${index}:`, {
                  blockId: block.id,
                  componentName: block.component.name
                });
                
                return (
                  <BuilderBlock
                    key={block.id}
                    block={block}
                    context={context}
                  />
                );
              })}
            </ColumnWrapper>
          </React.Fragment>
        );
      })}
    </div>
  );
}