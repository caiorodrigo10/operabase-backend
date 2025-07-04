import React from 'react';
import { ColumnsProps } from '../../../../types/editor2-types';
import { BuilderBlock } from '../Canvas/BuilderBlock';

interface ColumnConfig {
  blocks: any[];
  width?: string;
  flex?: string;
}

export const Columns: React.FC<ColumnsProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Builder.io options
  columns = [],
  gutterSize = 32,
  stackColumnsAt = 'tablet',
  reverseColumnsWhenStacked = false,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  renderBlock,
  ...props
}) => {
  // Debug log para Columns com breakpoint detection
  const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  console.log('📦 Columns component:', { 
    id, 
    columnsCount: columns.length,
    gutterSize,
    stackColumnsAt,
    windowWidth: currentWidth,
    isDesktop: currentWidth >= 992,
    shouldStack: (stackColumnsAt === 'tablet' && currentWidth <= 991) || (stackColumnsAt === 'mobile' && currentWidth <= 640),
    styles: Object.keys(styles || {}),
    hasColumns: columns.length > 0,
    firstColumnBlocks: columns[0]?.blocks?.length || 0
  });
  // Gerar classes CSS baseado nas configurações + detecção de tela
  const getResponsiveClasses = () => {
    const classes = ['editor2-columns'];
    const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    
    // ✅ Builder.io Logic: Só aplicar classes de empilhamento quando necessário
    if (stackColumnsAt === 'tablet' && currentWidth <= 991) {
      classes.push('columns-stack-tablet');
    } else if (stackColumnsAt === 'mobile' && currentWidth <= 640) {
      classes.push('columns-stack-mobile');
    }
    
    // Só aplicar reverse se realmente empilhando
    if (reverseColumnsWhenStacked && 
        ((stackColumnsAt === 'tablet' && currentWidth <= 991) || 
         (stackColumnsAt === 'mobile' && currentWidth <= 640))) {
      classes.push('columns-reverse-stacked');
    }
    
    return classes.join(' ');
  };

  // Método Builder.io EXATO (baseado no código real lines 77-88)
  const getWidth = (index: number) => {
    return (columns[index] && columns[index].width) || 100 / columns.length;
  };

  const getColumnWidth = (index: number) => {
    const width = getWidth(index);
    const subtractWidth = gutterSize * (columns.length - 1) * (width / 100);
    
    return `calc(${width}% - ${subtractWidth}px)`;
  };

  // Determinar se deve empilhar colunas baseado na largura da tela (Builder.io pattern)
  const shouldStack = typeof window !== 'undefined' ? 
    (stackColumnsAt === 'tablet' && window.innerWidth <= 991) || 
    (stackColumnsAt === 'mobile' && window.innerWidth <= 640) : false;

  // BUILDER.IO EXATO: CSS-in-JS com !important inline (force override TOTAL)
  const finalContainerStyles: React.CSSProperties = {
    display: 'flex', // Força display flex SEMPRE
    height: '100%',
    ...styles,
    
    // Aplicar stacking quando necessário (Builder.io pattern)
    ...(shouldStack && {
      flexDirection: reverseColumnsWhenStacked ? 'column-reverse' : 'column',
      alignItems: 'stretch',
    }),
    
    // FORÇA FINAL: Se não está stacking, força row
    ...(!shouldStack && {
      flexDirection: 'row',
    }),
  };

  // SOLUÇÃO DEFINITIVA: CSS inline com !important via cssText
  const forceFlexCSS = `
    display: flex !important;
    flex-direction: ${shouldStack ? (reverseColumnsWhenStacked ? 'column-reverse' : 'column') : 'row'} !important;
  `;

  // Debug para identificar problema com blocos null
  if (columns.length > 0) {
    console.log('🏗️ Columns component received:', { id, columns: columns.length, firstColumn: columns[0] });
  }

  // Builder.io Pattern: Aplicar flex layout via DOM para override completo

  // DETECTIVE MODE + FORCE CSS: Inspecionar e corrigir CSS computado após render
  React.useEffect(() => {
    console.log('🔥 useEffect EXECUTADO para container:', id);
    
    // Dar tempo para o DOM renderizar completamente
    setTimeout(() => {
      const container = document.getElementById(id);
      console.log('🔍 Container encontrado:', !!container, container);
      
      if (container) {
        // FORÇA CSS com !important via DOM
        container.style.setProperty('display', 'flex', 'important');
        container.style.setProperty('flex-direction', shouldStack ? (reverseColumnsWhenStacked ? 'column-reverse' : 'column') : 'row', 'important');
        console.log('🚀 FORCED CSS APPLIED:', id, 'display: flex !important, flex-direction:', shouldStack ? 'column' : 'row');
        
        const computedStyles = window.getComputedStyle(container);
        console.log('🕵️ CSS COMPUTADO REAL (DOM):', {
          id,
          className: container.className,
          display: computedStyles.display,
          flexDirection: computedStyles.flexDirection,
          width: computedStyles.width,
          height: computedStyles.height,
          justifyContent: computedStyles.justifyContent,
          alignItems: computedStyles.alignItems,
          flexWrap: computedStyles.flexWrap,
          gap: computedStyles.gap
        });
        
        // Verificar filhos (colunas)
        const children = Array.from(container.children);
        console.log(`📊 TOTAL DE COLUNAS NO DOM: ${children.length}`);
        
        children.forEach((child, index) => {
          const childStyles = window.getComputedStyle(child);
          console.log(`🔍 COLUNA ${index + 1}/${children.length} CSS COMPUTADO:`, {
            className: child.className,
            display: childStyles.display,
            flexDirection: childStyles.flexDirection,
            width: childStyles.width,
            marginLeft: childStyles.marginLeft,
            flexShrink: childStyles.flexShrink,
            float: childStyles.float,
            position: childStyles.position,
            offsetWidth: child.offsetWidth,
            offsetHeight: child.offsetHeight
          });
        });
      } else {
        console.error('❌ Container não encontrado no DOM:', id);
      }
    }, 100);
  }, [id]);

  return (
    <div
      id={id}
      className="builder-columns"
      style={finalContainerStyles}
      {...props}
    >
      {columns.map((column, index) => {
        const columnWidth = getColumnWidth(index);
        
        // Builder.io EXATO: width em vez de flex
        const columnStyles: React.CSSProperties = {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          lineHeight: 'normal',
          width: columnWidth,  // ← WIDTH, não flex
          marginLeft: index === 0 ? 0 : gutterSize,  // ← NUMBER, não string
          
          // Responsive stacking
          ...(shouldStack && {
            width: '100%',
            marginLeft: 0,
          }),
        };

        console.log(`🔹 Column ${index + 1}/${columns.length} (Builder.io pattern):`, {
          width: columnWidth,
          marginLeft: columnStyles.marginLeft,
          useWidth: true, // não flex
          shouldStack,
          childrenAvailable: children?.length || 0
        });

        return (
          <div
            key={index}
            className="builder-column"
            style={columnStyles}
          >
            {/* Builder.io blocks wrapper */}
            <div className="builder-blocks" style={{ flexGrow: 1 }}>
              {/* Renderizar child específico para esta coluna */}
              {children && children[index] && (
                <BuilderBlock 
                  key={children[index].id} 
                  block={children[index]}
                />
              )}
            </div>
          </div>
        );
      })}
      
      {/* Fallback para children (compatibilidade) */}
      {!columns.length && children}
    </div>
  );
};

// Metadata para o Editor2
Columns.displayName = 'Columns';