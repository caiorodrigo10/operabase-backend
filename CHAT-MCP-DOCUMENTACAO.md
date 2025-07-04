# Interface de Chat de Teste MCP - Documentação Completa

## Visão Geral

Interface de chat conversacional implementada em `/chatdeteste` para testar todas as funcionalidades do sistema MCP através de linguagem natural. O assistente utiliza OpenAI GPT-4 para interpretar mensagens e executar ações no sistema de agendamento médico.

## Componentes Implementados

### 1. Interface Frontend (`client/src/pages/chat-de-teste.tsx`)

**Características:**
- Design conversacional intuitivo com histórico de mensagens
- Indicadores visuais por tipo de resposta (sucesso ✅, erro ❌, info ℹ️)
- Área de input com suporte a multi-linha
- Botão "Limpar Chat" para resetar conversa
- Loading states durante processamento
- Exibição de informações do usuário de teste

**Funcionalidades:**
- Envio de mensagens via Enter ou botão
- Scroll automático para última mensagem
- Tratamento de erros com feedback visual
- Exemplos de comandos para orientar usuário

### 2. Hook de Chat (`client/src/hooks/useMCPChat.ts`)

**Responsabilidades:**
- Comunicação com API de interpretação OpenAI
- Execução de ações MCP baseadas na interpretação
- Gerenciamento de estados (loading, error)
- Tratamento de diferentes tipos de resposta

**Tipos de Ação Suportados:**
- `chat_response`: Respostas conversacionais gerais
- `create`: Criação de consultas
- `list`: Listagem de consultas
- `reschedule`: Reagendamento
- `cancel`: Cancelamento
- `availability`: Verificação de disponibilidade
- `clarification`: Solicitação de mais informações

### 3. Interpretador OpenAI (`server/mcp/chat-interpreter.ts`)

**Funcionalidades:**
- Processamento de linguagem natural via GPT-4
- Conversão de mensagens em ações estruturadas
- Validação com schemas Zod
- Suporte a respostas conversacionais

**Sistema de Prompt:**
- Contexto de agendamento médico
- Parâmetros fixos (clinic_id: 1, user_id: 4)
- Reconhecimento de expressões temporais (hoje, amanhã, manhã, tarde)
- Formatação automática de datas e horários

### 4. Endpoint de Chat (`server/mcp/n8n-routes.ts`)

**Rota:** `POST /api/mcp/chat/interpret`

**Funcionalidade:**
- Recebe mensagem do usuário
- Processa via OpenAI
- Retorna ação estruturada ou resposta conversacional
- Logging para debugging

## Exemplos de Funcionamento

### Conversação Básica
```
Usuário: "Oi, como você está?"
Assistente: "Olá! Tudo bem sim, obrigado! Sou seu assistente de agendamento médico. Como posso ajudar você hoje? Posso agendar, reagendar, cancelar consultas ou verificar a agenda."
```

### Agendamento de Consulta
```
Usuário: "Agendar consulta para Maria Silva amanhã às 10h"
Sistema: Interpretação → {"action":"create","contact_name":"Maria Silva","date":"2025-06-19","time":"10:00","duration":60}
Assistente: "✅ Consulta agendada com sucesso para Maria Silva no dia 2025-06-19 às 10:00. ID do agendamento: #18"
```

### Consulta de Agenda
```
Usuário: "Quais consultas temos para hoje?"
Sistema: Interpretação → {"action":"list","date":"2025-06-18"}
Assistente: "📅 Consultas encontradas:

• 09:00 - João Santos (Dr. Silva)
• 14:30 - Ana Costa
• 16:00 - Carlos Lima"
```

### Reagendamento
```
Usuário: "Reagendar a consulta 15 para sexta às 16h"
Sistema: Interpretação → {"action":"reschedule","appointment_id":15,"new_date":"2025-06-27","new_time":"16:00"}
Assistente: "✅ Consulta reagendada com sucesso para 2025-06-27 às 16:00."
```

## Configuração de Usuário de Teste

**Dados Hardcoded:**
- Email: `cr@caiorodrigo.com.br`
- Clinic ID: `1`
- User ID: `4`
- Permissões: Admin/Profissional ativo

**Validações:**
- Todos os contatos devem pertencer à clínica 1
- Usuários devem ser membros ativos da clínica
- Verificação automática de conflitos de horário

## Fluxo de Processamento

1. **Usuário digita mensagem** → Interface de chat
2. **Envio para interpretação** → `/api/mcp/chat/interpret`
3. **Processamento OpenAI** → Análise de linguagem natural
4. **Retorno de ação** → JSON estruturado
5. **Execução MCP** → Chamada para endpoints específicos
6. **Resposta formatada** → Mensagem amigável ao usuário

## Tratamento de Erros

### Conflitos de Agendamento
```
❌ Conflito de horário detectado. Já existe uma consulta às 14:00.

Horários disponíveis: 15:00, 16:00, 17:00
```

### Contato Não Encontrado
```
O sistema automaticamente cria novos contatos quando necessário, ou solicita informações adicionais se ambíguo.
```

### Dados Inválidos
```
Assistente: "Preciso de mais informações. Qual o nome do paciente e o horário desejado?"
```

## Comandos Suportados

### Agendamento
- "Agendar consulta para [Nome] no dia [data] às [hora]"
- "Marcar consulta com [Nome] amanhã de manhã"
- "Criar agendamento para [Nome] na sexta às 15h"

### Consultas
- "Quais consultas temos hoje?"
- "Mostrar agenda de amanhã"
- "Listar consultas da semana"

### Reagendamento
- "Reagendar consulta [ID] para [nova data/hora]"
- "Mudar consulta do [Nome] para [horário]"

### Cancelamento
- "Cancelar consulta [ID]"
- "Cancelar agendamento das [hora]"

### Disponibilidade
- "Verificar disponibilidade para [data]"
- "Quais horários livres temos sexta?"

### Conversação
- Cumprimentos: "Oi", "Olá", "Tudo bem?"
- Agradecimentos: "Obrigado", "Valeu"
- Despedidas: "Tchau", "Até logo"

## Validações Implementadas

### Integridade de Dados
- Verificação de existência de contatos na clínica
- Validação de membership de usuários
- Prevenção de conflitos de horário
- Criação automática de contatos quando necessário

### Formato de Dados
- Datas: YYYY-MM-DD
- Horários: HH:MM
- Duração: Minutos (padrão 60)
- Status: Valores válidos do sistema

### Segurança
- Isolamento por clinic_id
- Validação de permissões
- Sanitização de inputs

## Performance

### Tempos de Resposta
- Interpretação OpenAI: ~1.5-2.5 segundos
- Execução MCP: <500ms
- Total: ~2-3 segundos por mensagem

### Otimizações
- Cache de validações de contatos
- Reutilização de conexões
- Logs estruturados para debugging

## Testes Realizados

### Funcionalidades Básicas
✅ Respostas conversacionais
✅ Interpretação de agendamentos
✅ Listagem de consultas
✅ Tratamento de erros
✅ Validação de dados

### Casos Específicos
✅ Mensagem: "Oi tudo bem?" → Resposta conversacional
✅ Mensagem: "Agendar para Maria amanhã 10h" → Criação estruturada
✅ Mensagem: "Consultas de hoje" → Listagem filtrada
✅ Mensagem: "Obrigado" → Resposta educada

## Acesso à Interface

**URL:** `https://your-domain.com/chatdeteste`

**Requisitos:**
- Usuário autenticado
- Acesso à clínica 1
- OPENAI_API_KEY configurada

## Logs e Monitoramento

### Logs de Sistema
```javascript
Chat interpret request: { message: 'Agendar consulta para Maria Silva amanhã às 10h' }
POST /api/mcp/chat/interpret 200 in 1557ms
```

### Debugging
- Todas as interpretações são logadas
- Erros de validação capturados
- Métricas de performance registradas

## Limitações Conhecidas

1. **Dependência da OpenAI:** Requer API key válida
2. **Contexto:** Limitado ao escopo de uma clínica
3. **Idioma:** Otimizado para português brasileiro
4. **Complexidade:** Comandos muito elaborados podem confundir a IA

## Próximas Melhorias

1. **Memória de Contexto:** Manter histórico da conversa
2. **Sugestões Inteligentes:** Baseadas no histórico
3. **Integração com WhatsApp:** Via n8n
4. **Relatórios por Voz:** Síntese de fala
5. **Multi-idioma:** Suporte a outros idiomas

---

**Status:** ✅ Totalmente Funcional
**Versão:** 1.0.0
**Atualizado:** 18 de Junho de 2025