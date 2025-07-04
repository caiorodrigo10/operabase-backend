# Plano: AI Dev Agent para Landing Page Builder

## Visão Geral
Criar um agente de IA que possa interpretar prompts em linguagem natural e executar modificações em tempo real no landing page builder, utilizando o conhecimento das funções do Craft.js e a estrutura JSON do editor.

## Objetivos
- Interpretar prompts em linguagem natural sobre modificações na página
- Executar alterações no JSON do builder automaticamente
- Atualizar preview em tempo real sem salvar no backend
- Utilizar integração existente com GPT/OpenAI
- Funcionar como um MCP (Model Context Protocol) agent

## Análise da Arquitetura Atual

### Componentes Disponíveis no Builder
- **Container**: Layout base com flex, padding, margin, background
- **Text**: Elementos de texto com formatação
- **CraftButton**: Botões customizáveis com estilos
- **Video**: Componentes de vídeo
- **LandingCard**: Cards personalizados
- **HeroSection**: Seções hero
- **VideoComponent**: Componentes de vídeo avançados

### Estrutura JSON do Craft.js
```json
{
  "ROOT": {
    "type": "Container",
    "props": {
      "width": "800px",
      "height": "auto",
      "background": { "r": 255, "g": 255, "b": 255, "a": 1 },
      "padding": ["40", "40", "40", "40"]
    },
    "nodes": ["node1", "node2"]
  },
  "node1": {
    "type": "Text",
    "props": {
      "text": "Conteúdo do texto",
      "fontSize": "16",
      "color": { "r": 0, "g": 0, "b": 0, "a": 1 }
    }
  }
}
```

## Requisitos Técnicos

### 1. Sistema de Conhecimento do Builder
- [ ] Documentar todas as props disponíveis para cada componente
- [ ] Criar mapeamento de funcionalidades em linguagem natural
- [ ] Definir schema de transformações possíveis

### 2. Processamento de Linguagem Natural
- [ ] Integração com OpenAI GPT para interpretação de prompts
- [ ] Sistema de parsing para identificar:
  - Componente alvo (texto, botão, container, etc.)
  - Ação desejada (mudar cor, adicionar elemento, reposicionar)
  - Parâmetros específicos (valores, posições, estilos)

### 3. Engine de Transformação JSON
- [ ] Função para aplicar mudanças no JSON do Craft.js
- [ ] Validação de estrutura para evitar quebras
- [ ] Sistema de rollback para desfazer alterações

### 4. Interface de Feedback
- [ ] Preview em tempo real das alterações
- [ ] Indicadores visuais de elementos sendo modificados
- [ ] Sistema de confirmação/cancelamento

## Implementação - Passo a Passo

### Fase 1: Preparação Base (30-45 min)

#### 1.1 Criar Knowledge Base do Builder
```typescript
// builder-knowledge.ts
export const BUILDER_COMPONENTS = {
  Container: {
    description: "Layout container with flex properties",
    props: {
      width: { type: "string", example: "100%" },
      height: { type: "string", example: "auto" },
      background: { type: "color", example: { r: 255, g: 255, b: 255, a: 1 } },
      padding: { type: "array", example: ["20", "20", "20", "20"] },
      margin: { type: "array", example: ["0", "0", "0", "0"] },
      flexDirection: { type: "string", options: ["row", "column"] }
    },
    naturalLanguage: [
      "container", "section", "div", "layout", "wrapper"
    ]
  },
  Text: {
    description: "Text element with formatting",
    props: {
      text: { type: "string", example: "Sample text" },
      fontSize: { type: "string", example: "16" },
      color: { type: "color", example: { r: 0, g: 0, b: 0, a: 1 } },
      textAlign: { type: "string", options: ["left", "center", "right"] }
    },
    naturalLanguage: [
      "text", "title", "heading", "paragraph", "label"
    ]
  }
  // ... outros componentes
};
```

#### 1.2 Sistema de Prompt Engineering
```typescript
// ai-dev-prompt.ts
export const SYSTEM_PROMPT = `
Você é um AI Dev Agent especializado em editar landing pages usando Craft.js.

COMPONENTES DISPONÍVEIS:
${JSON.stringify(BUILDER_COMPONENTS, null, 2)}

INSTRUÇÕES:
1. Analise o prompt do usuário e identifique:
   - Qual elemento modificar
   - Que alteração fazer
   - Valores específicos

2. Retorne um JSON com as transformações:
{
  "action": "update|add|remove",
  "target": "nodeId ou 'new'",
  "component": "Container|Text|CraftButton|etc",
  "props": { /* propriedades a alterar */ },
  "reasoning": "Explicação da alteração"
}

EXEMPLOS:
- "Mude o texto do título para azul" → Alterar color do componente Text
- "Adicione um botão verde" → Criar novo CraftButton com background verde
- "Centralize o container" → Alterar textAlign do Container
`;
```

### Fase 2: Core AI Engine (45-60 min)

#### 2.1 Serviço de IA
```typescript
// ai-dev-service.ts
export class AIDevService {
  async processPrompt(prompt: string, currentJSON: any): Promise<BuilderAction> {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `
          PROMPT: ${prompt}
          CURRENT_STATE: ${JSON.stringify(currentJSON, null, 2)}
          
          Analise e retorne a transformação necessária.
        `}
      ],
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

#### 2.2 Engine de Transformação
```typescript
// builder-transformer.ts
export class BuilderTransformer {
  applyAction(currentJSON: any, action: BuilderAction): any {
    const newJSON = JSON.parse(JSON.stringify(currentJSON));
    
    switch (action.action) {
      case 'update':
        if (newJSON[action.target]) {
          newJSON[action.target].props = {
            ...newJSON[action.target].props,
            ...action.props
          };
        }
        break;
        
      case 'add':
        const newNodeId = `node_${Date.now()}`;
        newJSON[newNodeId] = {
          type: action.component,
          props: action.props
        };
        // Adicionar ao parent apropriado
        break;
        
      case 'remove':
        delete newJSON[action.target];
        break;
    }
    
    return newJSON;
  }
}
```

### Fase 3: Integração com Editor (30 min)

#### 3.1 Hook para AI Dev
```typescript
// useAIDevEditor.ts
export const useAIDevEditor = () => {
  const { query } = useEditor();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processAICommand = async (prompt: string) => {
    setIsProcessing(true);
    
    try {
      // 1. Obter JSON atual do editor
      const currentJSON = query.serialize();
      
      // 2. Processar com IA
      const action = await aiDevService.processPrompt(prompt, currentJSON);
      
      // 3. Aplicar transformação
      const newJSON = builderTransformer.applyAction(currentJSON, action);
      
      // 4. Atualizar editor
      query.deserialize(newJSON);
      
      return { success: true, action };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };
  
  return { processAICommand, isProcessing };
};
```

#### 3.2 Atualização do AI Code Chat
```typescript
// Integrar no AICodeChat.tsx
const { processAICommand, isProcessing } = useAIDevEditor();

const handleSendMessage = async () => {
  if (!inputValue.trim()) return;
  
  // Adicionar mensagem do usuário
  const userMessage = { role: 'user', content: inputValue };
  setMessages(prev => [...prev, userMessage]);
  
  // Processar comando AI
  const result = await processAICommand(inputValue);
  
  // Adicionar resposta
  const aiMessage = {
    role: 'assistant',
    content: result.success 
      ? `Alteração aplicada: ${result.action.reasoning}`
      : `Erro: ${result.error}`
  };
  setMessages(prev => [...prev, aiMessage]);
  
  setInputValue('');
};
```

## Fluxo de Funcionamento

1. **Usuário digita prompt**: "Mude o título para azul e centralize"
2. **AI processa**: Identifica Text component, color e textAlign
3. **Transformação**: Aplica mudanças no JSON do Craft.js
4. **Preview atualiza**: Editor reflete alterações imediatamente
5. **Feedback**: Chat confirma ação realizada

## Checklist de Implementação

### Preparação
- [ ] Mapear todos os componentes e props disponíveis
- [ ] Criar knowledge base estruturada
- [ ] Definir prompt engineering otimizado

### Core Engine
- [ ] Implementar AIDevService com OpenAI
- [ ] Criar BuilderTransformer para manipular JSON
- [ ] Desenvolver sistema de validação

### Integração
- [ ] Hook useAIDevEditor para conectar IA ao editor
- [ ] Atualizar AICodeChat para usar novo sistema
- [ ] Implementar feedback visual de alterações

### Testes
- [ ] Testar comandos básicos (cores, textos, posicionamento)
- [ ] Validar adição/remoção de elementos
- [ ] Verificar estabilidade do JSON

## Tecnologias Necessárias

- **OpenAI API**: Para processamento de linguagem natural
- **Craft.js Query API**: Para manipular editor
- **TypeScript**: Para tipagem forte
- **React Hooks**: Para state management

## Limitações Iniciais

- Apenas modificações no frontend (sem persistência)
- Comandos simples por vez
- Componentes existentes apenas
- Sem preview em tempo real durante digitação

## Próximos Passos após Aprovação

1. Implementar knowledge base
2. Criar serviço de IA básico
3. Desenvolver transformer
4. Integrar com chat existente
5. Testes e refinamento

---

**Este plano permite criar um MVP funcional em 2-3 horas, demonstrando a viabilidade da tese de um AI Dev Agent para o builder.**