# Craft.js - Análise Completa 360° para Implementação V1

## 📋 Visão Geral do Framework

### Core Concepts
Craft.js é um framework React para criação de page builders que mantém estado interno através de **Nodes** que representam elementos React. Cada elemento na área editável é gerenciado por um Node correspondente.

### Estrutura Fundamental
```
Editor Context → Frame → Nodes → User Components
```

## 🏗️ Arquitetura Principal

### 1. Editor Context (`<Editor />`)
**Propósito**: Cria o contexto que armazena o estado do editor
**Props Essenciais**:
- `resolver`: Map de componentes disponíveis `{Container, Text, Button, Video}`
- `enabled`: boolean para ativar/desativar funcionalidades
- `indicator`: configuração de cores para drop indicators
- `onNodesChange`: callback quando Nodes mudam (útil para salvar JSON)

**Exemplo de Setup**:
```jsx
<Editor resolver={{Text, Button, Container, Video}}>
  <Frame>
    <Element is={Container} canvas>
      <Text text="Hello World" />
    </Element>
  </Frame>
</Editor>
```

### 2. Frame Component (`<Frame />`)
**Propósito**: Define a área editável do page builder
**Props**:
- `children`: Elementos React para tela inicial
- `data`: SerializedNodes ou JSON para carregar estado

**Importante**: Props são memoizadas - mudanças após render inicial não têm efeito. Use `actions.deserialize()` para carregar novos JSONs.

### 3. Element Component (`<Element />`)
**Propósito**: Define configuração manual de Nodes
**Props Essenciais**:
- `is`: Tipo do elemento (HTML tag ou React Component)
- `canvas`: boolean - torna Node droppable
- `id`: obrigatório quando usado dentro de User Component
- `custom`: propriedades customizadas do Node

## 🎯 Tipos de Nodes

### Node Padrão
- **Não draggable**: por padrão
- **Não droppable**: por padrão
- Representa elementos simples

### Canvas Node
- **Droppable**: aceita outros elementos
- **Filho de Canvas = Draggable**: elementos dentro tornam-se arrastáveis
- Criado com `<Element canvas>`

### Linked Nodes
- Nodes definidos dentro de User Components com ID arbitrário
- Conectados ao Node pai via `linkedNodes`
- Obrigatório usar prop `id`

## 🧩 User Components

### Estrutura Básica
```jsx
const Text = ({text, fontSize}) => {
  const { connectors: {connect, drag}, setProp, isSelected } = useNode((node) => ({
    isSelected: node.events.selected
  }));

  return (
    <span 
      ref={ref => connect(drag(ref))} 
      style={{fontSize}}
      contentEditable={isSelected}
      onKeyUp={(e) => setProp(props => props.text = e.target.innerText)}
    >
      {text}
    </span>
  );
};
```

### Propriedade craft (Configuração)
```jsx
Text.craft = {
  props: {
    text: "Default text",
    fontSize: 16
  },
  rules: {
    canDrag: (node) => true,
    canDrop: (target, current) => true,
    canMoveIn: (incoming, current) => true,
    canMoveOut: (outgoing, current) => true
  },
  related: {
    toolbar: TextToolbar // componente para settings
  }
};
```

## 🔗 Hooks Principais

### useNode() - Para User Components
```jsx
const {
  id,                    // ID do Node
  connectors: {          // Conectores DOM
    connect,             // Define DOM do componente
    drag                 // Define DOM arrastável
  },
  actions: {             // Ações do Node
    setProp,             // Atualiza props
    setCustom,           // Atualiza propriedades custom
    setHidden            // Esconde/mostra
  },
  // ... dados coletados
} = useNode((node) => ({
  isSelected: node.events.selected,
  isHovered: node.events.hovered
}));
```

### useEditor() - Para Editor Global
```jsx
const {
  actions: {             // Ações globais
    add,                 // Adicionar Node
    delete,              // Deletar Node
    move,                // Mover Node
    deserialize,         // Carregar JSON
    selectNode           // Selecionar Node
  },
  query: {               // Consultas
    getSerializedNodes,  // Obter JSON
    serialize,           // JSON string
    node                 // NodeHelpers
  },
  connectors: {          // Conectores globais
    create,              // Criar ao arrastar
    drag,                // Arrastar existente
    select,              // Selecionar
    hover                // Hover
  }
} = useEditor((state) => ({
  selectedNodeId: state.events.selected
}));
```

## 📊 Node Structure (Estado Interno)

### Node Object
```typescript
{
  id: "node-xyz",
  data: {
    type: Text,                    // Componente ou tag HTML
    props: {text: "Hello"},        // Props atuais
    name: "Text",                  // Nome do componente
    displayName: "Text",           // Nome amigável
    isCanvas: false,               // É Canvas?
    parent: "parent-id",           // ID do pai
    nodes: ["child1", "child2"],   // IDs dos filhos
    linkedNodes: {                 // Linked nodes
      "header": "linked-id"
    },
    custom: {},                    // Propriedades customizadas
    hidden: false                  // Oculto?
  },
  events: {
    selected: false,               // Selecionado?
    hovered: false,                // Hover?
    dragged: false                 // Sendo arrastado?
  },
  dom: HTMLElement,                // Elemento DOM
  rules: {                         // Regras de drag/drop
    canDrag: Function,
    canDrop: Function,
    canMoveIn: Function,
    canMoveOut: Function
  },
  related: {                       // Componentes relacionados
    toolbar: ToolbarComponent
  }
}
```

### NodeTree (Para Serialização)
```typescript
{
  rootNodeId: "node-a",
  nodes: {
    "node-a": Node,
    "node-b": Node,
    "node-c": Node
  }
}
```

## 🔄 Serialização e Persistência

### Salvar Estado
```jsx
const { query } = useEditor();

// Obter objeto SerializedNodes
const serializedNodes = query.getSerializedNodes();

// Obter JSON string
const jsonString = query.serialize();

// Salvar no servidor
axios.post('/api/save', { data: jsonString });
```

### Carregar Estado
```jsx
const { actions } = useEditor();

// Carregar de JSON
actions.deserialize(jsonString);

// Ou usar prop data no Frame
<Frame data={jsonString}>
```

## 🎮 Connectors (Interação DOM)

### User Component Connectors
```jsx
const { connectors: {connect, drag} } = useNode();

// Conectar elemento raiz + tornar arrastável
<div ref={ref => connect(drag(ref))}>

// Separar conectores
<div ref={connect}>
  <button ref={drag}>Drag Handle</button>
</div>
```

### Editor Connectors
```jsx
const { connectors: {create, select, hover} } = useEditor();

// Criar novo elemento ao arrastar
<button ref={ref => create(ref, <Text text="New" />)}>
  Drag to create
</button>

// Selecionar Node ao clicar
<div ref={ref => select(ref, nodeId)}>
  Click to select
</div>
```

## 🛠️ Actions (Manipulação de Estado)

### Node Actions
```jsx
const { actions: {setProp, setCustom} } = useNode();

// Atualizar props
setProp(props => {
  props.text = "New text";
  props.fontSize = 18;
});

// Atualizar custom properties
setCustom(custom => {
  custom.highlighted = true;
});
```

### Editor Actions
```jsx
const { actions } = useEditor();

// Adicionar Node
const nodeTree = query.parseReactElement(<Text />).toNodeTree();
actions.addNodeTree(nodeTree);

// Mover Node
actions.move(sourceId, targetId, index);

// Deletar Node
actions.delete(nodeId);
```

## 🔍 Query Methods (Consultas)

### NodeHelpers
```jsx
const { query } = useEditor();
const helpers = query.node(nodeId);

// Verificações
helpers.isRoot()           // É root?
helpers.isCanvas()         // É canvas?
helpers.isDraggable()      // Pode arrastar?
helpers.isDroppable(target) // Pode dropar?

// Navegação
helpers.descendants()      // Filhos recursivos
helpers.ancestors()        // Pais recursivos
helpers.childNodes()       // Filhos diretos
helpers.linkedNodes()      // Linked nodes

// Conversão
helpers.toSerializedNode() // SerializedNode
helpers.toNodeTree()       // NodeTree
```

## 📱 Componentes Auxiliares

### Layers Panel (@craftjs/layers)
```jsx
import {Layers} from "@craftjs/layers";

<Editor>
  <Frame>...</Frame>
  <Layers expandRootOnLoad={true} />
</Editor>
```

### Custom Layer Component
```jsx
const CustomLayer = () => {
  const { connectors: {layer, drag}, expanded } = useLayer();
  
  return (
    <div ref={layer}>
      <div ref={drag}>Layer Name</div>
      {expanded && <div>Children</div>}
    </div>
  );
};
```

## 🎨 Related Components (Toolbar/Settings)

### Definição
```jsx
const TextToolbar = () => {
  const { fontSize, setProp } = useNode((node) => ({
    fontSize: node.data.props.fontSize
  }));

  return (
    <input 
      value={fontSize}
      onChange={e => setProp(props => props.fontSize = e.target.value)}
    />
  );
};

Text.craft = {
  related: {
    toolbar: TextToolbar
  }
};
```

### Uso no Editor
```jsx
const Toolbar = () => {
  const { selectedNodeId, toolbarComponent } = useEditor((state) => ({
    selectedNodeId: state.events.selected,
    toolbarComponent: state.events.selected && 
      state.nodes[state.events.selected].related.toolbar
  }));

  return toolbarComponent ? 
    React.createElement(toolbarComponent) : null;
};
```

## 🚀 Implementação V1 - Plano de Ação

### 1. Setup Base
- Configurar `<Editor resolver={...}>` no CanvasContainer
- Importar componentes existentes do Craft: Container, Text, Button, Video
- Manter layout do Editor2 (sidebars, header)

### 2. Canvas Adaptation
- Substituir CanvasContainer interno por `<Frame>`
- Adicionar componentes Craft.js como children iniciais
- Configurar Canvas root com `<Element canvas>`

### 3. Widgets Panel Integration
- Conectar botões do WidgetsPanel aos connectors do Craft
- Usar `create()` connector para drag-to-create
- Manter interface visual atual

### 4. JSON Integration
- Implementar serialização/deserialização no AICodeChat
- Permitir carregar JSONs da AI via `actions.deserialize()`
- Salvar estado atual via `query.serialize()`

### 5. Global Styling Preparation
- Preparar base para tokens semânticos nos craft.props
- Configurar related components para settings
- Manter GlobalStylingSidebar para futura integração

## ✅ Benefícios da Abordagem

1. **Sistema Robusto**: Craft.js já tem serialização, drag-and-drop e state management
2. **Interface Preservada**: Mantemos sidebars e layout do Editor2
3. **JSON Ready**: Sistema nativo de serialização para AI integration
4. **Extensível**: Base sólida para futuras melhorias (tokens, grid system)
5. **Componentes Existentes**: Aproveita Container, Text, Button, Video já criados

## 🎯 V1 Goals
- ✅ Interface Editor2 mantida
- ✅ Canvas com Craft.js engine
- ✅ Widgets funcionais (sem drag-and-drop perfeito)
- ✅ JSON serialization/deserialization
- ✅ Base para configurações globais futuras

Esta análise fornece toda informação necessária para implementar nossa V1 híbrida, combinando a interface limpa do Editor2 com a robustez técnica do Craft.js.