# Editor2 - Análise Completa do Sistema de Save/Preview

## Estado Atual da Estrutura

### 1. Sistema de Salvamento
**Problemas Identificados:**
- Editor2 usa sistema híbrido confuso entre Craft.js e legacy system
- Função `serializeToJSON()` retorna estrutura legacy incompatível com preview
- `handleSave()` usa transformação semântica correta, mas `handlePreview()` usa sistema legacy
- Preview não consegue renderizar JSON do Craft.js porque usa estrutura legacy

**Fluxo Atual Problemático:**
```
handlePreview() → serializeToJSON() → JSON Legacy → localStorage → Preview Page → Não Renderiza
```

### 2. Sistema de Preview
**Estado Atual:**
- Página `/preview/editor2` existe mas usa estrutura legacy
- Preview procura por estrutura Editor2Store em vez de Craft.js
- Componentes de preview não são compatíveis com widgets Craft.js

### 3. Endpoints do Servidor
**Funcionais:**
- `POST /api/save-page-json` - Salva JSON em arquivo
- `GET /api/load-page-json/:pageId` - Carrega JSON de arquivo

## Plano de Correção Completa

### ETAPA 1: Corrigir Sistema de Preview
**Objetivo:** Fazer preview funcionar com JSON semântico do Craft.js

#### 1.1 Criar Preview Específico para Craft.js
```typescript
// Nova página: /preview/craft/:pageId
const CraftPreviewPage = () => {
  // Carrega JSON semântico salvo
  // Renderiza usando Frame do Craft.js
  // Sem editor (enabled=false), apenas visualização
}
```

#### 1.2 Modificar handlePreview() 
```typescript
const handlePreview = async () => {
  // Use Craft.js serialization (como handleSave)
  const craftEditor = getCurrentCraftEditor();
  const craftJson = craftEditor.query.serialize();
  const semanticJson = transformToSemanticJson(craftJson);
  
  // Salva JSON semântico
  localStorage.setItem('editor2_craft_preview', JSON.stringify(semanticJson));
  
  // Abre preview específico para Craft.js
  window.open('/preview/craft/editor2', '_blank');
}
```

### ETAPA 2: Unificar Sistema de Salvamento
**Objetivo:** Remover sistema legacy e usar apenas Craft.js

#### 2.1 Corrigir handleSave()
```typescript
const handleSave = async () => {
  const craftEditor = getCurrentCraftEditor();
  const craftJson = craftEditor.query.serialize();
  const semanticJson = transformToSemanticJson(craftJson);
  
  // Salva local e servidor usando mesmo JSON
  localStorage.setItem('editor2_craft_state', JSON.stringify(semanticJson));
  
  // Salva no servidor
  await fetch('/api/save-page-json', {
    method: 'POST',
    body: JSON.stringify({
      pageId: 'editor2',
      jsonData: JSON.stringify(semanticJson)
    })
  });
}
```

#### 2.2 Corrigir Carregamento
```typescript
// CanvasContainer deve carregar JSON semântico consistentemente
const loadPageData = async () => {
  // 1. Tenta servidor
  const response = await fetch('/api/load-page-json/editor2');
  
  if (response.data) {
    // JSON semântico do servidor
    setInitialJson(response.data);
  } else {
    // 2. Fallback localStorage
    const saved = localStorage.getItem('editor2_craft_state');
    if (saved) {
      setInitialJson(saved);
    } else {
      // 3. Template padrão
      setInitialJson(JSON.stringify(getDefaultSemanticJson()));
    }
  }
}
```

### ETAPA 3: Criar Preview Limpo (Somente JSON)
**Objetivo:** Preview que renderiza APENAS o JSON, sem chrome do editor

#### 3.1 Componente CraftPreview
```typescript
const CraftPreview = ({ jsonData }) => {
  return (
    <Editor
      resolver={{ Container, Text, CraftButton, Video }}
      enabled={false} // Modo somente visualização
    >
      <Frame data={jsonData}>
        <Element
          canvas
          is={Container}
          // Container root será substituído pelo JSON
        />
      </Frame>
    </Editor>
  );
}
```

#### 3.2 Layout Preview Clean
```typescript
// Preview sem header do editor, sem sidebar, sem toolbox
// Apenas o conteúdo renderizado + botão "Fechar"
<div className="min-h-screen bg-white">
  <div className="fixed top-4 right-4 z-50">
    <button onClick={() => window.close()}>
      Fechar Preview
    </button>
  </div>
  
  <CraftPreview jsonData={pageData} />
</div>
```

### ETAPA 4: Melhorar Persistência Definitiva
**Objetivo:** Save sobrescreve definitivamente, não cache

#### 4.1 Confirmação de Save
```typescript
const handleSave = async () => {
  // Confirma se quer sobrescrever
  const confirm = await showConfirmDialog(
    'Salvar página?',
    'Isso sobrescreverá a versão salva anterior definitivamente.'
  );
  
  if (confirm) {
    await saveCraftJsonPermanently();
    showSuccessMessage('Página salva com sucesso!');
  }
}
```

#### 4.2 Backup Automático
```typescript
// Auto-save a cada 30 segundos em key separada
const autoSave = () => {
  const craftJson = getCurrentCraftEditor().query.serialize();
  const semanticJson = transformToSemanticJson(craftJson);
  localStorage.setItem('editor2_autosave', JSON.stringify(semanticJson));
  localStorage.setItem('editor2_autosave_timestamp', Date.now().toString());
}
```

## Arquivos que Precisam ser Modificados

### Frontend
1. **`client/src/components/editor2/Header/EditorHeader.tsx`**
   - Corrigir `handlePreview()` para usar Craft.js
   - Corrigir `handleSave()` para usar só Craft.js
   - Remover `serializeToJSON()` legacy

2. **`client/src/pages/preview-craft.tsx`** (NOVO)
   - Preview limpo específico para Craft.js
   - Renderização sem editor chrome

3. **`client/src/components/editor2/Canvas/CanvasContainer.tsx`**
   - Unificar carregamento para usar apenas JSON semântico
   - Remover referências ao sistema legacy

4. **`client/src/App.tsx`**
   - Adicionar rota `/preview/craft/:pageId`

### Backend
1. **`server/index.ts`**
   - Endpoints já funcionam, sem modificação necessária

## Benefícios da Implementação

### 1. Consistência Total
- Save e Preview usam exatamente o mesmo JSON
- Não há mais conflito entre sistemas legacy e Craft.js

### 2. Preview Real
- Preview renderiza exatamente como será mostrado
- Sem elementos do editor, apenas conteúdo

### 3. Persistência Confiável
- Save definitivo sobrescreve versão anterior
- Auto-save para backup automático
- Confirmação para evitar perdas acidentais

### 4. Compatibilidade com IA
- JSON semântico limpo ideal para geração via prompts
- Estrutura consistente para training de IA

## Tempo Estimado de Implementação
- **ETAPA 1 (Preview Craft.js):** 2-3 horas
- **ETAPA 2 (Unificar Save):** 1-2 horas  
- **ETAPA 3 (Preview Limpo):** 2-3 horas
- **ETAPA 4 (Persistência):** 1-2 horas

**Total:** 6-10 horas para implementação completa

## Próximos Passos Recomendados
1. Começar com ETAPA 1 (Preview) para validar conceito
2. Implementar ETAPA 2 (Save unificado) 
3. Criar preview limpo (ETAPA 3)
4. Adicionar melhorias de persistência (ETAPA 4)