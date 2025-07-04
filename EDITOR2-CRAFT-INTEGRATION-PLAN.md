# Editor2 + Craft.js Integration Plan - V1 Implementation

## 🎯 Objetivo V1
Criar sistema híbrido que mantém interface do Editor2 com engine do Craft.js, focando em serialização JSON para AI integration (sem drag-and-drop inicial).

## 📋 Contexto do Projeto
- **Interface Mantida**: EditorLayout, sidebars, header, chat AI
- **Engine Substituído**: Canvas agora usa Craft.js para state management e serialização
- **Foco V1**: JSON ready para AI, não perfeição de drag-and-drop
- **Componentes Disponíveis**: Container, Text, Button, Video já existem no projeto

---

## 🏗️ ETAPA 2: Setup Base do Craft.js

### Objetivo
Configurar contexto do Craft.js no CanvasContainer mantendo interface atual.

### Tarefas
1. **Instalar dependências Craft.js** (verificar se já estão instaladas)
2. **Configurar Editor context** no CanvasContainer
3. **Importar componentes existentes** do funil-editor-landing
4. **Configurar resolver** com componentes disponíveis
5. **Implementar Frame básico** com elemento inicial

### Resultado Esperado
Canvas funcional com contexto Craft.js, sem interface visual ainda.

---

## 🎨 ETAPA 3: Integração de Componentes

### Objetivo
Adaptar componentes Craft.js existentes para funcionar no novo contexto.

### Tarefas
1. **Revisar componentes existentes** (Container, Text, Button, Video)
2. **Adaptar craft.props** com configurações básicas
3. **Implementar useNode hooks** nos componentes
4. **Configurar connectors** básicos (connect, sem drag inicialmente)
5. **Testar renderização** no Frame

### Resultado Esperado
Componentes renderizando corretamente no Canvas com state management do Craft.js.

---

## 🔗 ETAPA 4: WidgetsPanel Integration

### Objetivo
Conectar WidgetsPanel atual aos componentes do Craft.js via programação (sem drag).

### Tarefas
1. **Analisar WidgetsPanel atual** e sistema de disponibilidade
2. **Implementar create actions** via useEditor hook
3. **Conectar botões** aos componentes Craft.js
4. **Programar adição de elementos** via clique (sem drag)
5. **Manter interface visual** atual do WidgetsPanel

### Resultado Esperado
Widgets Panel funcional adicionando componentes via clique no Canvas.

---

## 📄 ETAPA 5: Serialização JSON

### Objetivo
Implementar sistema completo de save/load JSON para integração com AI.

### Tarefas
1. **Implementar query.serialize()** para export JSON
2. **Implementar actions.deserialize()** para import JSON
3. **Integrar com AICodeChat** para receber/enviar JSONs
4. **Criar endpoints backend** para save/load (se necessário)
5. **Testar ciclo completo** JSON export/import

### Resultado Esperado
Sistema completo de serialização funcionando com chat AI.

---

## ⚙️ ETAPA 6: Settings Integration

### Objetivo
Preparar base para configurações globais futuras mantendo GlobalStylingSidebar.

### Tarefas
1. **Analisar GlobalStylingSidebar atual**
2. **Preparar related components** para settings de componentes
3. **Configurar useEditor** para selected component
4. **Implementar base** para toolbar de propriedades
5. **Manter interface** atual para futuras expansões

### Resultado Esperado
Base sólida para configurações de componentes preparada.

---

## 🧪 ETAPA 7: Testes e Refinamentos

### Objetivo
Validar sistema completo e corrigir issues antes de próximas fases.

### Tarefas
1. **Testar todos os componentes** no Canvas
2. **Validar serialização/deserialização** JSON
3. **Testar integração** com AICodeChat
4. **Verificar performance** e state management
5. **Documentar sistema** V1 completo

### Resultado Esperado
Sistema V1 estável e documentado, pronto para futuras melhorias.

---

## 📊 Critérios de Sucesso V1

### Funcionalidades Core
- ✅ Canvas renderiza componentes Craft.js
- ✅ WidgetsPanel adiciona componentes via clique
- ✅ Serialização JSON completa funcionando
- ✅ AI pode enviar JSONs que renderizam no Canvas
- ✅ Interface do Editor2 100% preservada

### Não Implementado na V1
- ❌ Drag and drop perfeito
- ❌ Sistema de blocos/colunas visual
- ❌ Configurações globais avançadas
- ❌ Grid system responsivo
- ❌ Tokens semânticos completos

---

## 🚀 Próximas Fases (Pós V1)

### V2: Configurações Globais
- Implementar sistema de tokens semânticos
- Grid system responsivo
- Herança de estilos

### V3: UX Avançada
- Drag and drop refinado
- Layers panel
- Undo/redo system

### V4: AI Integration Avançada
- Template generation via AI
- Smart component suggestions
- Auto-layout optimization

---

## ⏱️ Estimativa de Tempo
- **Etapa 2**: 30-45 min (setup base)
- **Etapa 3**: 45-60 min (componentes)
- **Etapa 4**: 30-45 min (widgets integration)
- **Etapa 5**: 45-60 min (JSON system)
- **Etapa 6**: 30 min (settings prep)
- **Etapa 7**: 30 min (testes)

**Total V1**: ~4-5 horas de desenvolvimento focado

---

Este plano mantém a interface que funciona bem no Editor2 enquanto adiciona a robustez técnica do Craft.js, focando no objetivo principal da V1: ter um sistema de page builder que funciona via JSON para integração com AI.