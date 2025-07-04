# Box Widget: Builder.io Complete Analysis & Implementation Plan

## 🔍 ETAPA 1: PESQUISA BUILDER.IO

### 1.1 Definição do Box Widget

O **Box** no Builder.io é um container básico e flexível que serve como building block fundamental para layouts. É essencialmente um `div` com controles visuais avançados para:

- **Layout**: flexbox, grid, positioning
- **Spacing**: margin, padding com controles visuais
- **Background**: cores, gradientes, imagens
- **Borders**: radius, width, style, colors
- **Sizing**: width, height, min/max dimensions
- **Transform**: rotation, scale, translate

### 1.2 Diferença vs Container/Section

| Componente | Propósito | Características |
|------------|-----------|-----------------|
| **Section** | Seções da página | maxWidth, lazy loading, full-width |
| **Container** | Wrapper de conteúdo | maxWidth centrado, padding lateral |
| **Box** | Building block flexível | Controles visuais completos, sem restrições |

### 1.3 Casos de Uso Principais

1. **Cards e Componentes**: Criar cards, badges, chips
2. **Layout Helpers**: Spacers, separadores, wrappers
3. **Visual Elements**: Backgrounds decorativos, overlays
4. **Responsive Containers**: Containers com breakpoints customizados
5. **Design System**: Elementos base para design system

## 🎛️ ETAPA 2: ANÁLISE DE INPUTS/PROPRIEDADES

### 2.1 Layout Properties
```typescript
interface BoxLayoutProps {
  display?: 'block' | 'flex' | 'inline-block' | 'inline-flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number; // em pixels
}
```

### 2.2 Spacing Properties  
```typescript
interface BoxSpacingProps {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}
```

### 2.3 Visual Properties
```typescript
interface BoxVisualProps {
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
}
```

### 2.4 Sizing Properties
```typescript
interface BoxSizingProps {
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
}
```

## 🎨 ETAPA 3: PADRÕES DE DESIGN

### 3.1 Common Use Cases

#### **Card Component**
```json
{
  "backgroundColor": "#ffffff",
  "borderRadius": 8,
  "boxShadow": "0 4px 12px rgba(0, 0, 0, 0.1)",
  "padding": "24px",
  "display": "flex",
  "flexDirection": "column",
  "gap": 16
}
```

#### **Badge/Chip**
```json
{
  "backgroundColor": "#3b82f6",
  "color": "#ffffff",
  "borderRadius": 20,
  "padding": "8px 16px",
  "display": "inline-flex",
  "alignItems": "center",
  "fontSize": "14px",
  "fontWeight": "500"
}
```

#### **Spacer/Divider**
```json
{
  "width": "100%",
  "height": 1,
  "backgroundColor": "#e5e7eb",
  "margin": "32px 0"
}
```

### 3.2 Responsive Patterns

O Box deve suportar responsive styles como outros componentes:

```json
{
  "responsiveStyles": {
    "large": {
      "display": "flex",
      "flexDirection": "row",
      "gap": 32,
      "padding": "40px"
    },
    "medium": {
      "flexDirection": "column",
      "gap": 24,
      "padding": "32px"
    },
    "small": {
      "padding": "20px",
      "gap": 16
    }
  }
}
```

## 🏗️ ETAPA 4: PLANO DE IMPLEMENTAÇÃO

### 4.1 Component Structure

```typescript
// Box.tsx
interface BoxProps {
  // Layout
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  
  // Spacing  
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  
  // Visual
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  
  // Sizing
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  
  // Content
  children?: React.ReactNode;
}
```

### 4.2 Builder.io Integration

```typescript
export const Box = withBuilder(BoxComponent, {
  name: 'Box',
  canHaveChildren: true,
  inputs: [
    // Layout Section
    {
      name: 'display',
      type: 'text',
      defaultValue: 'block',
      enum: ['block', 'flex', 'inline-block', 'inline-flex', 'grid', 'none']
    },
    {
      name: 'flexDirection',
      type: 'text',
      defaultValue: 'column',
      enum: ['row', 'column', 'row-reverse', 'column-reverse'],
      showIf: 'options.display === "flex" || options.display === "inline-flex"'
    },
    // ... mais inputs
  ],
  defaultStyles: {
    display: 'block',
    position: 'relative'
  }
});
```

### 4.3 CSS Implementation Strategy

O Box deve aplicar estilos via CSS-in-JS para máxima flexibilidade:

```typescript
const boxStyles = {
  // Layout
  display: props.display || 'block',
  flexDirection: props.flexDirection,
  justifyContent: props.justifyContent,
  alignItems: props.alignItems,
  gap: props.gap ? `${props.gap}px` : undefined,
  
  // Spacing
  marginTop: props.marginTop ? `${props.marginTop}px` : undefined,
  paddingTop: props.paddingTop ? `${props.paddingTop}px` : undefined,
  // ... todos os spacing props
  
  // Visual
  backgroundColor: props.backgroundColor,
  borderRadius: props.borderRadius ? `${props.borderRadius}px` : undefined,
  boxShadow: props.boxShadow,
  
  // Sizing
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  // ... todos os sizing props
};
```

## 📝 ETAPA 5: EXEMPLOS DE JSON

### 5.1 Simple Card
```json
{
  "id": "feature-card",
  "@type": "@builder.io/sdk:Element",
  "component": {
    "name": "Box",
    "options": {
      "backgroundColor": "#ffffff",
      "borderRadius": 12,
      "boxShadow": "0 8px 25px rgba(0, 0, 0, 0.1)",
      "padding": 32,
      "display": "flex",
      "flexDirection": "column",
      "gap": 20
    }
  },
  "responsiveStyles": {
    "large": {
      "maxWidth": "350px"
    },
    "small": {
      "padding": "24px"
    }
  },
  "children": [
    {
      "id": "card-icon",
      "@type": "@builder.io/sdk:Element", 
      "component": {
        "name": "Text",
        "options": {
          "text": "🚀",
          "tag": "div"
        }
      },
      "responsiveStyles": {
        "large": {
          "fontSize": "48px",
          "marginBottom": "16px"
        }
      }
    },
    {
      "id": "card-title",
      "@type": "@builder.io/sdk:Element",
      "component": {
        "name": "Text", 
        "options": {
          "text": "Performance",
          "tag": "h3"
        }
      }
    }
  ]
}
```

### 5.2 Responsive Layout Box
```json
{
  "id": "stats-container",
  "@type": "@builder.io/sdk:Element",
  "component": {
    "name": "Box",
    "options": {
      "display": "flex",
      "justifyContent": "space-between",
      "gap": 30
    }
  },
  "responsiveStyles": {
    "large": {
      "flexDirection": "row"
    },
    "medium": {
      "flexDirection": "column",
      "gap": "20px"
    },
    "small": {
      "gap": "16px"
    }
  },
  "children": [
    // Stats items aqui
  ]
}
```

### 5.3 Badge/Chip Box
```json
{
  "id": "premium-badge",
  "@type": "@builder.io/sdk:Element",
  "component": {
    "name": "Box",
    "options": {
      "backgroundColor": "#10b981",
      "borderRadius": 16,
      "paddingTop": 6,
      "paddingBottom": 6,
      "paddingLeft": 12,
      "paddingRight": 12,
      "display": "inline-flex",
      "alignItems": "center"
    }
  },
  "children": [
    {
      "id": "badge-text",
      "@type": "@builder.io/sdk:Element",
      "component": {
        "name": "Text",
        "options": {
          "text": "✨ Premium",
          "tag": "span"
        }
      },
      "responsiveStyles": {
        "large": {
          "color": "#ffffff",
          "fontSize": "12px",
          "fontWeight": "600"
        }
      }
    }
  ]
}
```

## ✅ ETAPA 6: CHECKLIST DE IMPLEMENTAÇÃO

### Phase 1: Core Component
- [ ] Criar `Box.tsx` component
- [ ] Implementar interface `BoxProps`
- [ ] Aplicar estilos CSS-in-JS
- [ ] Suporte a children
- [ ] Responsive styles integration

### Phase 2: Builder.io Integration  
- [ ] Configurar `withBuilder` wrapper
- [ ] Definir inputs para visual editor
- [ ] Implementar defaultStyles
- [ ] Registrar no ComponentMap
- [ ] Testar no RenderBlock

### Phase 3: Testing & Examples
- [ ] Criar JSON examples
- [ ] Testar responsividade
- [ ] Validar casos de uso comuns
- [ ] Integrar ao mockPageJson
- [ ] Documentar patterns

### Phase 4: Optimization
- [ ] Performance testing
- [ ] CSS conflicts resolution
- [ ] Accessibility support
- [ ] Error handling

## 🎯 RESULTADO ESPERADO

O Box widget deve ser o **building block mais flexível** do sistema, permitindo:

1. **Rapidez**: Criar layouts complexos rapidamente
2. **Flexibilidade**: Todos os controles CSS via interface visual
3. **Consistência**: Seguir padrões Builder.io estabelecidos
4. **Responsividade**: Comportamento móvel/desktop configurável
5. **Reutilização**: Base para outros componentes avançados

---

**Status**: 📋 DOCUMENTAÇÃO COMPLETA  
**Próximo**: ETAPA 3 - IMPLEMENTAÇÃO DO COMPONENTE  
**Data**: July 01, 2025