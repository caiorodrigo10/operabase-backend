# Editor2 - Tipos e Interfaces TypeScript

## Definições de Tipos Necessárias

### 1. Tipos Base do Sistema JSON

```typescript
// shared/types/editor2.ts

export interface ComponentOptions {
  [key: string]: any;
}

export interface Component {
  name: string;
  options: ComponentOptions;
}

export interface Block {
  id: string;
  component: Component;
  styles?: Record<string, any>;
  responsiveStyles?: {
    large?: Record<string, any>;
    medium?: Record<string, any>;
    small?: Record<string, any>;
  };
  children?: Block[];
}

export interface PageJSON {
  id: string;
  component: Component;
  children?: Block[];
  meta?: {
    title?: string;
    description?: string;
    version?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
```

### 2. Context Provider Types

```typescript
// client/src/contexts/PageProvider.tsx

export interface PageContextType {
  pageJson: PageJSON | null;
  setPageJson: (json: PageJSON | null) => void;
  isLoading: boolean;
  error: string | null;
}

export interface PageProviderProps {
  children: React.ReactNode;
  initialJson?: PageJSON | null;
}
```

### 3. Componentes Base Props

```typescript
// client/src/components/editor2/Components/types.ts

export interface HeroSectionProps {
  title?: string;
  buttonText?: string;
  subtitle?: string;
  backgroundImage?: string;
  children?: React.ReactNode;
}

export interface TextProps {
  text?: string;
  fontSize?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
}

export interface ButtonProps {
  text?: string;
  onClick?: () => void;
  color?: string;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
}
```

### 4. RenderBlock Types

```typescript
// client/src/components/editor2/Canvas/RenderBlock.tsx

export interface RenderBlockProps {
  block: Block;
  depth?: number;
  parentId?: string;
}

export interface ComponentMapType {
  [componentName: string]: React.ComponentType<any>;
}
```

### 5. Estados de Erro e Loading

```typescript
// client/src/types/editor2-states.ts

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorBoundary?: boolean;
}

export interface CanvasState {
  isEmpty: boolean;
  hasValidJson: boolean;
  renderCount: number;
}
```

## Estruturas de Dados Esperadas

### JSON Exemplo Completo (Tipado)

```typescript
const examplePageJson: PageJSON = {
  id: "root",
  component: {
    name: "HeroSection",
    options: {
      title: "Transforme sua clínica digital",
      buttonText: "Comece agora",
      subtitle: "Com tecnologia e IA"
    }
  },
  children: [
    {
      id: "text1",
      component: {
        name: "Text",
        options: {
          text: "Com tecnologia e IA, crie sua landing em minutos",
          fontSize: "18px",
          textAlign: "center"
        }
      },
      styles: {
        marginTop: "20px",
        marginBottom: "15px"
      }
    },
    {
      id: "button1",
      component: {
        name: "Button",
        options: {
          text: "Quero começar",
          backgroundColor: "#4f46e5",
          size: "large"
        }
      }
    }
  ],
  meta: {
    title: "Landing Page Exemplo",
    version: "1.0.0",
    createdAt: new Date().toISOString()
  }
};
```

### ComponentMap Tipado

```typescript
import { ComponentMapType } from './types';
import { HeroSection } from '../Components/HeroSection';
import { Text } from '../Components/Text';
import { Button } from '../Components/Button';

export const componentMap: ComponentMapType = {
  HeroSection,
  Text,
  Button,
  // Futuras adições...
};

// Função helper tipada
export function getComponent(name: string): React.ComponentType<any> {
  return componentMap[name] || DefaultComponent;
}
```

## Validação de Tipos (Opcional - Fase 2)

### Schema Validation com Zod

```typescript
// utils/validation/pageJsonSchema.ts

import { z } from 'zod';

const ComponentSchema = z.object({
  name: z.string().min(1),
  options: z.record(z.any())
});

const BlockSchema: z.ZodType<Block> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    component: ComponentSchema,
    styles: z.record(z.any()).optional(),
    responsiveStyles: z.object({
      large: z.record(z.any()).optional(),
      medium: z.record(z.any()).optional(),
      small: z.record(z.any()).optional()
    }).optional(),
    children: z.array(BlockSchema).optional()
  })
);

export const PageJSONSchema = z.object({
  id: z.string().min(1),
  component: ComponentSchema,
  children: z.array(BlockSchema).optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    version: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  }).optional()
});

// Helper function
export function validatePageJSON(data: unknown): PageJSON {
  return PageJSONSchema.parse(data);
}
```

## Utilização nos Componentes

### Exemplo de uso tipado no RenderBlock

```typescript
// RenderBlock.tsx
function RenderBlock({ block, depth = 0 }: RenderBlockProps) {
  const Component = getComponent(block.component.name);
  
  const handleRenderError = (error: Error) => {
    console.error(`Erro ao renderizar componente ${block.component.name}:`, error);
  };
  
  return (
    <ErrorBoundary onError={handleRenderError}>
      <Component {...block.component.options}>
        {block.children?.map((child: Block) => (
          <RenderBlock 
            key={child.id} 
            block={child} 
            depth={depth + 1}
            parentId={block.id}
          />
        ))}
      </Component>
    </ErrorBoundary>
  );
}
```

## Arquivos a Criar

1. `shared/types/editor2.ts` - Tipos base
2. `client/src/types/editor2-states.ts` - Estados específicos
3. `client/src/components/editor2/Components/types.ts` - Props dos componentes
4. `client/src/utils/validation/pageJsonSchema.ts` - Validação (opcional)

## Benefícios da Tipagem

1. **Autocompletar**: IntelliSense completo no desenvolvimento
2. **Detecção de Erros**: Erros detectados em compile-time
3. **Documentação**: Tipos servem como documentação viva
4. **Refatoração Segura**: Changes podem ser validados automaticamente
5. **Escalabilidade**: Fácil adição de novos componentes e propriedades