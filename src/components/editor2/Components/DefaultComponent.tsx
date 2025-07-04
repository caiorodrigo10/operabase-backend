/**
 * DefaultComponent - Componente de fallback
 * Exibido quando um componente não é encontrado no mapeamento
 */

import React from 'react';
import { DefaultComponentProps } from '@/types/editor2-types';

export const DefaultComponent: React.FC<DefaultComponentProps> = ({ 
  name, 
  children 
}) => {
  return (
    <div style={{ 
      padding: 20, 
      border: '1px dashed red', 
      background: '#ffecec',
      borderRadius: '4px',
      margin: '8px 0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: children ? '12px' : '0'
      }}>
        <span>⚠️</span>
        <span>
          Componente <strong>{name}</strong> não encontrado.
        </span>
      </div>
      
      {children && (
        <div style={{
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 0, 0, 0.2)'
        }}>
          <small style={{ color: '#666', display: 'block', marginBottom: '8px' }}>
            Conteúdo children do componente:
          </small>
          {children}
        </div>
      )}
    </div>
  );
};