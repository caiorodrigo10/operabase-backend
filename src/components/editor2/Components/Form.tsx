/**
 * Form Component - Builder.io Style
 * Permite criar formulários com campos configuráveis
 */

import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface FormField {
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  name: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  options?: string[]; // Para select
}

interface FormProps extends BlockComponentProps {
  fields?: FormField[];
  action?: string;
  method?: 'GET' | 'POST';
  submitText?: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: string;
  gap?: string;
}

export const Form: React.FC<FormProps> = ({
  id,
  fields = [],
  action = '#',
  method = 'POST',
  submitText = 'Enviar',
  backgroundColor = 'transparent',
  padding = '24px',
  borderRadius = '8px',
  gap = '16px',
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
    display: 'flex',
    flexDirection: 'column' as const,
    gap
  };

  const getResponsiveClasses = () => {
    return 'editor2-form';
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

  const renderField = (field: FormField, index: number) => {
    const fieldProps = {
      name: field.name,
      placeholder: field.placeholder,
      required: field.required,
      className: 'editor2-form-field',
      style: {
        padding: '12px 16px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '16px',
        width: '100%',
        boxSizing: 'border-box' as const
      }
    };

    switch (field.type) {
      case 'textarea':
        return (
          <div key={index} className="editor2-form-group">
            {field.label && (
              <label className="editor2-form-label" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                {field.label}
              </label>
            )}
            <textarea {...fieldProps} rows={4} />
          </div>
        );

      case 'select':
        return (
          <div key={index} className="editor2-form-group">
            {field.label && (
              <label className="editor2-form-label" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                {field.label}
              </label>
            )}
            <select {...fieldProps}>
              <option value="">{field.placeholder || 'Selecione...'}</option>
              {field.options?.map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={index} className="editor2-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              {...fieldProps}
              style={{ width: 'auto', margin: 0 }}
            />
            {field.label && (
              <label className="editor2-form-label" style={{ margin: 0, fontWeight: '500', color: '#374151' }}>
                {field.label}
              </label>
            )}
          </div>
        );

      default:
        return (
          <div key={index} className="editor2-form-group">
            {field.label && (
              <label className="editor2-form-label" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                {field.label}
              </label>
            )}
            <input type={field.type} {...fieldProps} />
          </div>
        );
    }
  };

  return (
    <form
      id={id}
      action={action}
      method={method}
      className={`${getResponsiveClasses()} ${className}`.trim()}
      style={finalStyles}
      {...props}
    >
      {fields.map((field, index) => renderField(field, index))}
      
      {submitText && (
        <button
          type="submit"
          className="editor2-form-submit"
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
          }}
        >
          {submitText}
        </button>
      )}
    </form>
  );
};