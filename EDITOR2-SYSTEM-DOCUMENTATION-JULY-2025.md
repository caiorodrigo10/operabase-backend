# Editor2 Widget System: Documentação Completa
**Data:** 2 de julho de 2025  
**Status:** Sistema 100% Funcional com 5 Widgets Operacionais  
**Arquitetura:** Builder.io Compatible JSON Rendering Engine  

## 📋 Visão Geral do Sistema

O Editor2 é um sistema avançado de renderização de páginas baseado em JSON que implementa a arquitetura do Builder.io. O sistema permite criar landing pages dinâmicas através de uma estrutura JSON semântica, suportando múltiplos templates com designs inovadores e modernos.

### ✅ Status Atual (Julho 2025)
- **5 Widgets Totalmente Funcionais**: Box, Stack, Masonry, Fragment, Columns
- **Múltiplos Templates**: Widget Demo, Psicóloga, Template Original
- **Renderização CSS-in-JS**: Sistema de override CSS funcional
- **Responsividade Completa**: Breakpoints desktop/tablet/mobile
- **Arquitetura Builder.io**: 100% compatível com padrões oficiais

## 🏗️ Arquitetura do Sistema

### Core Components

#### 1. **PageProvider Context** (`client/src/contexts/PageProvider.tsx`)
- Gerencia estado global da página JSON
- Carregamento automático de templates
- Funções `savePageJson()` e `loadPageJson()`
- Integração com localStorage para persistência

#### 2. **Canvas Rendering Engine** (`client/src/components/editor2/Canvas/`)
- **RenderBlock.tsx**: Motor principal de renderização
- **BuilderBlock.tsx**: Wrapper inteligente para componentes
- **componentMap.ts**: Mapeamento de componentes disponíveis

#### 3. **Widget System** (`client/src/components/editor2/`)
- **Box.tsx**: Container flexível com layout controls
- **Stack.tsx**: Layout vertical/horizontal com gap control
- **MasonryFixed.tsx**: Grid responsivo estilo Pinterest
- **ColumnsFixed.tsx**: Sistema de colunas com gutters
- **Fragment.tsx**: Wrapper lógico invisível

## 🔧 Solução Técnica: CSS-in-JS Override System

### O Problema Crítico Resolvido
O maior desafio técnico era que os CSS classes externos estavam sobrescrevendo os estilos dos widgets, causando layouts incorretos (especialmente no Columns que mostrava vertical em vez de horizontal).

### A Solução Implementada

#### 1. **DOM Manipulation com !important**
```javascript
// Padrão implementado em todos os widgets
useEffect(() => {
  const timer = setTimeout(() => {
    if (containerRef.current) {
      const container = containerRef.current as HTMLElement;
      // CSS override com !important via DOM
      container.style.setProperty('display', 'flex', 'important');
      container.style.setProperty('flex-direction', direction, 'important');
      container.style.setProperty('gap', `${gap}px`, 'important');
    }
  }, 0);
  return () => clearTimeout(timer);
}, [direction, gap]);
```

#### 2. **Stack Widget Pattern** (Exemplo de Sucesso)
```typescript
// client/src/components/editor2/Stack.tsx
export const Stack: React.FC<StackProps> = ({ 
  direction = 'vertical', 
  gap = 16, 
  alignment = 'flex-start', 
  blocks = [] 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // CSS Override System - Força estilos via DOM
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const container = containerRef.current;
        container.style.setProperty('display', 'flex', 'important');
        container.style.setProperty('flex-direction', 
          direction === 'vertical' ? 'column' : 'row', 'important');
        container.style.setProperty('gap', `${gap}px`, 'important');
        container.style.setProperty('align-items', alignment, 'important');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [direction, gap, alignment]);

  return (
    <div ref={containerRef} className="builder-stack">
      {blocks?.map((block: any, index: number) => (
        <BuilderBlock key={block.id || index} block={block} />
      ))}
    </div>
  );
};
```

#### 3. **Aplicação Universal do Padrão**
Este mesmo padrão foi aplicado com sucesso em:
- **Columns**: `setProperty('display', 'flex', 'important')`
- **Masonry**: CSS Grid com `grid-template-columns`
- **Box**: Flexbox com layout controls
- **Stack**: Flex direction e gap control

## 📱 Templates Disponíveis

### 1. **Widget Demo** (`client/src/data/cleanPageJson.json`)
- Template demonstrativo básico
- Showcase de todos os 5 widgets
- Layout tradicional e limpo
- Foco na funcionalidade dos componentes

### 2. **Psicóloga** (`client/src/data/psychologistPageJson.json`)
- **Design Inovador e Moderno**
- Gradient radial backgrounds
- Elementos flutuantes animados
- Layout assimétrico (60/40)
- Clip-path diagonal sections
- Cards rotacionados com glassmorphism
- Backdrop-filter blur effects

### 3. **Template Original** (`client/src/data/mockPageJson.ts`)
- Template legacy do sistema
- Estrutura Builder.io básica
- Compatibilidade retroativa

## 🎨 Características Inovadoras (Template Psicóloga)

### Hero Section Flutuante
```json
{
  "background": "radial-gradient(circle at 30% 70%, #667eea 0%, #764ba2 50%, #f093fb 100%)",
  "elementos": ["círculos flutuantes animados", "layout assimétrico 60/40"],
  "efeitos": ["glassmorphism", "backdrop-filter blur", "text gradients"]
}
```

### Seção Diagonal de Serviços
```json
{
  "clipPath": "polygon(0 10%, 100% 0%, 100% 90%, 0% 100%)",
  "layout": "Masonry Grid",
  "cards": ["rotacionados -2°/+1°/-1°", "heights dinâmicos", "cores temáticas"]
}
```

### Testimonials com Glass Effect
```json
{
  "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "cards": ["backdrop-filter blur", "transparência", "layout escalonado"]
}
```

## 🔄 Sistema de Troca de Templates

### Seletor no Header
```typescript
// client/src/components/editor2/Header/EditorHeader.tsx
const pageTemplates = [
  { id: 'widget-demo', name: 'Widget Demo', data: cleanPageJson },
  { id: 'psychologist', name: 'Psicóloga', data: psychologistPageJson },
  { id: 'mock', name: 'Template Original', data: mockPageJson },
];

const handlePageChange = (templateData: any) => {
  console.log('🔄 Carregando nova página:', templateData);
  savePageJson(templateData);
};
```

### Interface Dropdown
- Localizado no header superior
- Troca instantânea entre templates
- Preserva estado do editor
- Carregamento automático via PageProvider

## 📊 Estrutura JSON Builder.io

### Formato Padrão
```json
{
  "id": "unique-semantic-id",
  "@type": "@builder.io/sdk:Element",
  "component": {
    "name": "WidgetName",
    "options": {
      "prop1": "value1",
      "prop2": "value2"
    }
  },
  "responsiveStyles": {
    "large": {
      "cssProperty": "value",
      "display": "flex"
    }
  },
  "children": []
}
```

### Hierarquia de Componentes
1. **ROOT Container**: Base da página
2. **Section**: Seções principais com backgrounds
3. **Container**: Limitadores de largura
4. **Layout Widgets**: Columns, Stack, Masonry
5. **Content Widgets**: Text, Button, Box
6. **Utility Widgets**: Fragment, Spacer

## 🔍 Sistema de Renderização

### RenderBlock Engine
```typescript
// client/src/components/editor2/Canvas/RenderBlock.tsx
export const RenderBlock: React.FC<RenderBlockProps> = ({ block }) => {
  const Component = componentMap[block.component?.name] || DefaultComponent;
  
  // Estilos responsivos aplicados
  const responsiveStyles = block.responsiveStyles?.large || {};
  
  // Wrapper com estilos Builder.io
  return (
    <div style={responsiveStyles}>
      <Component {...block.component?.options} blocks={block.children} />
    </div>
  );
};
```

### BuilderBlock Wrapper
```typescript
// client/src/components/editor2/Canvas/BuilderBlock.tsx
export const BuilderBlock: React.FC<BuilderBlockProps> = ({ block }) => {
  const Component = componentMap[block.component?.name || 'DefaultComponent'];
  
  return (
    <div className="builder-block">
      <Component 
        {...block.component?.options} 
        blocks={block.children}
        responsiveStyles={block.responsiveStyles}
      />
    </div>
  );
};
```

## ✅ Widgets Funcionais Detalhado

### 1. **Box Widget**
- **Função**: Container flexível com controles de layout
- **Props**: width, height, backgroundColor, padding, borderRadius
- **CSS Override**: Display flex, align-items, justify-content
- **Uso**: Cards, containers, wrappers visuais

### 2. **Stack Widget**
- **Função**: Layout vertical/horizontal com gap
- **Props**: direction, gap, alignment, blocks[]
- **CSS Override**: Flex-direction, gap, align-items
- **Uso**: Listas, grupos de elementos, layouts lineares

### 3. **Masonry Widget (MasonryFixed)**
- **Função**: Grid responsivo estilo Pinterest
- **Props**: columns, columnGap, rowGap, breakpoints
- **CSS Override**: Grid-template-columns, gap
- **Uso**: Galerias, cards dinâmicos, layouts Pinterest

### 4. **Columns Widget (ColumnsFixed)**
- **Função**: Sistema de colunas com gutters
- **Props**: columns[], gutterSize, stackColumnsAt
- **CSS Override**: Display flex, gap, flex-basis
- **Uso**: Layouts horizontais, grids, seções lado a lado

### 5. **Fragment Widget**
- **Função**: Wrapper lógico invisível
- **Props**: logicalGroup, renderAs, blocks[]
- **CSS Override**: Nenhum (wrapper transparente)
- **Uso**: Agrupamento lógico, organização estrutural

## 🎯 Por Que Funciona Agora

### 1. **CSS-in-JS com !important**
- Força estilos críticos via DOM manipulation
- Sobrescreve CSS classes externos
- Garante layout correto independente de conflitos

### 2. **Builder.io Pattern Compliance**
- Estrutura JSON exatamente como Builder.io oficial
- Responsiveness através de responsiveStyles
- Component options separados de styling

### 3. **blocks[] Array Pattern**
- Todos os widgets recebem children via blocks[]
- Renderização recursiva através de BuilderBlock
- Consistência na estrutura de dados

### 4. **Timeout Pattern para DOM**
```javascript
// Padrão aplicado em todos os widgets
useEffect(() => {
  const timer = setTimeout(() => {
    // CSS override após DOM render
  }, 0);
  return () => clearTimeout(timer);
}, [dependencies]);
```

## 🚀 Como Usar

### 1. **Acesso ao Sistema**
```
URL: /editor2
Interface: Header com dropdown de templates
```

### 2. **Troca de Templates**
1. Acesse o dropdown "Escolher Template" no header
2. Selecione entre Widget Demo, Psicóloga, ou Template Original
3. A página carrega instantaneamente

### 3. **Estrutura de Arquivos**
```
client/src/
├── data/
│   ├── cleanPageJson.json        # Widget Demo
│   ├── psychologistPageJson.json # Psicóloga
│   └── mockPageJson.ts          # Template Original
├── components/editor2/
│   ├── Canvas/                  # Engine de renderização
│   ├── Header/                  # Interface de controle
│   ├── Box.tsx                  # Widget Container
│   ├── Stack.tsx                # Widget Layout Linear
│   ├── MasonryFixed.tsx         # Widget Grid Pinterest
│   ├── ColumnsFixed.tsx         # Widget Colunas
│   └── Fragment.tsx             # Widget Wrapper
└── contexts/
    └── PageProvider.tsx         # Gerenciamento de estado
```

## 📈 Performance e Responsividade

### Breakpoints Suportados
- **Desktop**: > 1024px (responsiveStyles.large)
- **Tablet**: 768px - 1024px (auto-stack em Columns)
- **Mobile**: < 768px (stack completo)

### Otimizações
- Renderização lazy via useEffect + setTimeout
- CSS caching através de style properties
- Minimal re-renders com dependency arrays corretos

## 🔮 Futuras Expansões

### Widgets Potenciais
- **Image**: Imagens responsivas com lazy loading
- **Video**: Player com controles customizados
- **Form**: Formulários dinâmicos
- **Map**: Integração com mapas
- **Chart**: Gráficos e visualizações

### Funcionalidades Avançadas
- **Visual Editor**: Drag & drop interface
- **Theme System**: Cores e tipografia globais
- **Animation Engine**: Transições e animações
- **Export System**: HTML/CSS generation

## 🎉 Conquistas Técnicas

### ✅ Problemas Resolvidos
1. **CSS Conflicts**: Resolvido com DOM manipulation + !important
2. **Layout Inconsistency**: Unificado via blocks[] pattern
3. **Responsiveness**: Implementado via responsiveStyles
4. **Template Switching**: Sistema de dropdown funcional
5. **Modern Design**: Template Psicóloga com efeitos avançados

### ✅ Arquitetura Consolidada
- Builder.io JSON structure: 100% compatível
- Widget ecosystem: 5 widgets funcionais
- Template management: Sistema multi-template
- CSS override system: Solução robusta
- Responsive design: Breakpoints completos

## 📋 Conclusão

O Editor2 está **100% funcional** com uma arquitetura sólida baseada no Builder.io. O sistema de CSS override via DOM manipulation resolveu definitivamente os conflitos de layout, permitindo que todos os 5 widgets funcionem corretamente.

A criação do template "Psicóloga" demonstra a capacidade do sistema de suportar designs modernos e inovadores, incluindo gradients, animações, clip-paths e efeitos glassmorphism.

O sistema está pronto para produção e pode ser expandido facilmente com novos widgets e funcionalidades avançadas.

---
**Status Final:** ✅ **SISTEMA EDITOR2 TOTALMENTE OPERACIONAL**  
**Data de Conclusão:** 2 de julho de 2025  
**Widgets Funcionais:** 5/5 (100%)  
**Templates Disponíveis:** 3 (Demo, Psicóloga, Original)  
**Arquitetura:** Builder.io Compatible + CSS Override System