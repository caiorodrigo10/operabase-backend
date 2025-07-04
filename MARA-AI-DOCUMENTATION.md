# Mara AI - Sistema Inteligente de Assistência Médica

## Visão Geral

Mara é uma assistente médica conversacional inteligente que combina dados específicos do paciente com conhecimento especializado através de Retrieval-Augmented Generation (RAG). Ela fornece insights personalizados e fundamentados para profissionais de saúde durante consultas e análises de pacientes.

## Características Principais

### 1. Análise Contextual de Pacientes
- **Dados do Paciente**: Nome, telefone, email, status, observações
- **Histórico de Consultas**: Consultas anteriores, especialidades, status, notas da sessão
- **Prontuários Médicos**: Queixa principal, diagnósticos, planos de tratamento, observações
- **Respostas de Anamnese**: Dados estruturados de questionários médicos

### 2. Integração RAG (Retrieval-Augmented Generation)
- **Base de Conhecimento Personalizada**: Cada profissional pode conectar sua própria base
- **Busca Semântica**: Encontra informações relevantes usando embeddings OpenAI
- **Contexto Híbrido**: Combina dados do paciente + conhecimento especializado
- **Filtros Inteligentes**: Similaridade > 0.2 para máxima cobertura de conhecimento

### 3. Configuração por Profissional
- **Configurações Individuais**: Cada profissional pode ter configurações específicas
- **Bases de Conhecimento**: Conectar diferentes bases por profissional/clínica
- **Ativação/Desativação**: Controle granular sobre uso do RAG

## Arquitetura Técnica

### Fluxo de Processamento

```
1. Pergunta do Usuário
   ↓
2. Busca Contexto do Paciente
   ↓
3. Verifica Configuração Mara do Profissional
   ↓
4. Busca RAG (se configurado)
   ↓
5. Gera Embedding da Pergunta
   ↓
6. Busca Semântica na Base de Conhecimento
   ↓
7. Filtra e Formata Contexto RAG
   ↓
8. Cria Prompt Híbrido (Paciente + RAG)
   ↓
9. Envia para OpenAI GPT-4o
   ↓
10. Retorna Resposta Fundamentada
```

### Componentes Principais

#### 1. MaraAIService
- **Localização**: `server/mara-ai-service.ts`
- **Responsabilidades**:
  - Análise contextual de pacientes
  - Integração com sistema RAG
  - Configuração por profissional
  - Geração de respostas

#### 2. Configurações Mara
- **Tabela**: `mara_professional_configs`
- **Campos**:
  - `professional_id`: ID do profissional
  - `clinic_id`: ID da clínica
  - `knowledge_base_id`: Base de conhecimento conectada
  - `is_active`: Status de ativação
  - `created_at`, `updated_at`: Timestamps

#### 3. Rotas da API
- **Chat**: `POST /api/contacts/:contactId/mara/chat`
- **Configuração**: `GET/POST /api/mara/config`
- **Resumo**: `POST /api/contacts/:contactId/mara/summary`

## Uso na Interface do Paciente

### 1. Acesso ao Chat Mara
- **Localização**: Tela de detalhes do contato/paciente
- **Ativação**: Botão "Chat com Mara" na barra de ações
- **Interface**: Chat conversacional em tempo real

### 2. Funcionalidades Disponíveis
- **Perguntas Livres**: Qualquer pergunta sobre o paciente
- **Análise de Histórico**: Interpretação de consultas passadas
- **Sugestões Clínicas**: Baseadas em dados + conhecimento especializado
- **Resumos**: Geração automática de resumos do paciente

### 3. Tipos de Perguntas Suportadas
- "Qual o histórico deste paciente?"
- "O que você sabe sobre [condição específica]?"
- "Quais são os principais pontos de atenção?"
- "Faça um resumo geral do caso"

## Configuração da Base de Conhecimento

### 1. Acesso às Configurações
- **Menu**: Configurações → Mara AI
- **Permissões**: Profissionais podem configurar suas próprias bases

### 2. Conectar Base de Conhecimento
```typescript
// Estrutura da configuração
{
  professionalId: number,
  clinicId: number,
  knowledgeBaseId: number,
  isActive: boolean
}
```

### 3. Tipos de Documentos Suportados
- **PDFs**: Artigos científicos, protocolos, guidelines
- **Textos**: Anotações, resumos, conhecimento estruturado
- **URLs**: Sites médicos, artigos online, bases de conhecimento

### 4. Processo de Configuração
1. Acesse "Base de Conhecimento" no menu
2. Crie uma nova base ou selecione existente
3. Adicione documentos relevantes
4. Aguarde processamento (embeddings)
5. Acesse "Configurações Mara"
6. Conecte a base criada
7. Ative a configuração

## Parâmetros de Configuração RAG

### 1. Filtros de Similaridade
- **Threshold Atual**: 0.2 (cobertura máxima)
- **Chunks Retornados**: 5 mais relevantes
- **Contexto Máximo**: ~7000 caracteres

### 2. Modelos Utilizados
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensões)
- **Chat**: OpenAI GPT-4o
- **Temperatura**: 0.7 (equilíbrio criatividade/precisão)
- **Max Tokens**: 400 (respostas concisas)

## Monitoramento e Debug

### 1. Logs Disponíveis
- **RAG Debug**: Informações detalhadas da busca semântica
- **Contexto**: Preview do conteúdo encontrado
- **Performance**: Tempos de resposta e alertas

### 2. Métricas de Qualidade
- **Similaridade**: Score de relevância dos resultados
- **Cobertura**: Quantidade de contexto utilizado
- **Tempo de Resposta**: Performance do sistema

### 3. Troubleshooting
- **Sem Resultados RAG**: Verificar base de conhecimento ativa
- **Contexto Irrelevante**: Ajustar threshold de similaridade
- **Performance Lenta**: Otimizar índices de busca

## Exemplos de Uso

### 1. Consulta Geral sobre Paciente
```
Usuário: "Qual o histórico do João?"
Mara: [Analisa dados do paciente + conhecimento especializado]
Resposta: Resumo contextualizado com recomendações
```

### 2. Pergunta Especializada
```
Usuário: "O que você sabe sobre Zouti?"
Mara: [Busca na base de conhecimento RAG]
Resposta: Informação específica da base conectada
```

### 3. Análise Clínica
```
Usuário: "Quais os pontos de atenção para este paciente?"
Mara: [Combina dados clínicos + protocolos da base]
Resposta: Análise fundamentada e personalizada
```

## Segurança e Privacidade

### 1. Isolamento de Dados
- **Multi-tenant**: Cada clínica tem dados isolados
- **Configurações Individuais**: Por profissional
- **Bases Privadas**: Conhecimento não compartilhado

### 2. Controle de Acesso
- **Autenticação**: Required para todas as operações
- **Autorização**: Baseada em perfis e permissões de clínica
- **Audit Trail**: Logs de todas as interações

## Manutenção e Atualizações

### 1. Atualização de Bases de Conhecimento
- **Incremental**: Novos documentos são processados automaticamente
- **Reprocessamento**: Possível recriar embeddings se necessário
- **Versionamento**: Histórico de mudanças mantido

### 2. Otimizações Contínuas
- **Performance**: Monitoramento de tempos de resposta
- **Qualidade**: Análise de relevância dos resultados
- **Custos**: Otimização de uso da API OpenAI

### 3. Backup e Recuperação
- **Configurações**: Backup automático das configurações Mara
- **Embeddings**: Persistência em banco de dados
- **Logs**: Retenção para análise e debugging