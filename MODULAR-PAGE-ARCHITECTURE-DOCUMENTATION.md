# Documentação da Arquitetura de Páginas Modulares

## Visão Geral

O Operabase implementa uma arquitetura de páginas modulares que permite a separação de funcionalidades complexas em sub-páginas organizadas e navegáveis. Esta abordagem é utilizada em duas principais áreas do sistema:

1. **Sistema de Contatos** - Detalhes do paciente divididos em 6 sub-páginas
2. **Sistema de Configurações** - Configurações da clínica divididas em 5 sub-páginas

Esta arquitetura proporciona:
- Melhor organização do código
- Interface mais limpa e focada
- Navegação intuitiva entre seções relacionadas
- Manutenibilidade e escalabilidade

## 1. Sistema de Páginas de Contatos

### Estrutura de Rotas

```typescript
// Rotas implementadas em App.tsx
/contatos/:id                    → Redireciona para /contatos/:id/visao-geral
/contatos/:id/visao-geral       → Visão geral do paciente
/contatos/:id/anamneses         → Gerenciamento de anamneses
/contatos/:id/mara-ai           → Interface de chat com IA
/contatos/:id/evolucoes         → Evoluções médicas e prontuários
/contatos/:id/documentos        → Gerenciamento de documentos
/contatos/:id/arquivos          → Gerenciamento de arquivos de mídia
```

### ComponentLayout Compartilhado

**Arquivo**: `client/src/components/ContactLayout.tsx`

O ContactLayout é um componente wrapper que fornece:

#### Funcionalidades Principais:
- **Header Unificado**: Photo do paciente + nome + estatísticas
- **Navegação em Abas**: 6 abas horizontais fixas no topo
- **Layout Responsivo**: Adaptação para desktop e mobile
- **Tema Consistente**: Cor oficial Operabase (#0f766e)

#### Estrutura do Header:
```typescript
interface ContactLayoutProps {
  currentTab: 'visao-geral' | 'anamneses' | 'mara-ai' | 'evolucoes' | 'documentos' | 'arquivos';
  children: React.ReactNode;
}
```

#### Elementos do Header:
- **Botão Voltar**: Lado esquerdo, retorna para lista de contatos
- **Foto do Paciente**: Avatar centralizado com fallback
- **Nome do Paciente**: Título principal
- **Estatísticas**: Consultas, documentos, arquivos
- **Botão Editar**: Lado direito, permite edição do contato

#### Navegação por Abas:
```typescript
const tabs = [
  { id: 'visao-geral', label: 'Visão Geral', icon: User },
  { id: 'anamneses', label: 'Anamneses', icon: FileText },
  { id: 'mara-ai', label: 'Mara AI', icon: Bot },
  { id: 'evolucoes', label: 'Evoluções', icon: Activity },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen },
  { id: 'arquivos', label: 'Arquivos', icon: Paperclip }
];
```

### Sub-páginas Implementadas

#### 1. Visão Geral (`/contatos/:id/visao-geral`)
**Arquivo**: `client/src/pages/contato-visao-geral.tsx`
- **Função**: Dashboard completo do paciente
- **Conteúdo**: Informações básicas, consultas recentes, ações rápidas
- **Componentes**: StatusBadge, AppointmentCard, QuickActions

#### 2. Anamneses (`/contatos/:id/anamneses`)
**Arquivo**: `client/src/pages/contato-anamneses.tsx`
- **Função**: Gestão de anamneses do paciente
- **Conteúdo**: Templates disponíveis, anamneses preenchidas, histórico
- **Integração**: AnamnesisManager component

#### 3. Mara AI (`/contatos/:id/mara-ai`)
**Arquivo**: `client/src/pages/contato-mara-ai.tsx`
- **Função**: Interface de conversação com IA
- **Conteúdo**: Chat interface, histórico de conversas, contexto do paciente
- **Componentes**: ChatInterface, MessageBubble

#### 4. Evoluções (`/contatos/:id/evolucoes`)
**Arquivo**: `client/src/pages/contato-evolucoes.tsx`
- **Função**: Prontuários médicos e evoluções
- **Conteúdo**: Timeline de evoluções, editor médico
- **Componentes**: ProntuarioMedico (reutilizado da estrutura original)

#### 5. Documentos (`/contatos/:id/documentos`)
**Arquivo**: `client/src/pages/contato-documentos.tsx`
- **Função**: Gerenciamento de documentos do paciente
- **Conteúdo**: Upload, categorização, busca, visualização
- **Funcionalidades**: Filtros por tipo, status, data

#### 6. Arquivos (`/contatos/:id/arquivos`)
**Arquivo**: `client/src/pages/contato-arquivos.tsx`
- **Função**: Gerenciamento de mídia (imagens, áudios, vídeos)
- **Conteúdo**: Gallery view, upload múltiplo, preview
- **Categorias**: Imagens, Áudios, Vídeos, Documentos

### Padrão de Implementação para Contatos

```typescript
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ContactLayout from "@/components/ContactLayout";

export default function ContatoSubPage() {
  const { id: contactId } = useParams() as { id: string };

  // Queries específicas da página
  const { data, isLoading } = useQuery({
    queryKey: ['/api/specific-data', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/specific-data?clinic_id=1&contact_id=${contactId}`);
      if (!response.ok) throw new Error('Erro ao carregar dados');
      return response.json();
    },
    enabled: !!contactId
  });

  return (
    <ContactLayout currentTab="sub-page-id">
      {/* Conteúdo específico da sub-página */}
    </ContactLayout>
  );
}
```

## 2. Sistema de Páginas de Configurações

### Estrutura de Rotas

```typescript
// Rotas implementadas em App.tsx
/configuracoes                   → Redireciona para /configuracoes/clinica
/configuracoes/clinica          → Configurações da clínica
/configuracoes/equipe           → Gerenciamento de usuários/equipe
/configuracoes/integracoes      → Integrações e APIs
/configuracoes/planos           → Planos e assinaturas
/configuracoes/anamneses        → Templates de anamnese
```

### ConfiguracoesLayout Compartilhado

**Arquivo**: `client/src/pages/configuracoes/index.tsx`

O ConfiguracoesLayout fornece:

#### Funcionalidades Principais:
- **Sidebar de Navegação**: Menu lateral com 5 seções
- **Layout Responsivo**: Sidebar colapsável em mobile
- **Design Elegante**: Fundo branco com sombra e bordas
- **Tema Consistente**: Cores Operabase (#0f766e)

#### Estrutura da Sidebar:
```typescript
const sidebarItems = [
  {
    id: 'clinica',
    label: 'Clínica',
    icon: Building2,
    href: '/configuracoes/clinica',
  },
  {
    id: 'equipe',
    label: 'Equipe',
    icon: Users,
    href: '/configuracoes/equipe',
  },
  {
    id: 'integracoes',
    label: 'Integrações',
    icon: Plug,
    href: '/configuracoes/integracoes',
  },
  {
    id: 'planos',
    label: 'Planos',
    icon: CreditCard,
    href: '/configuracoes/planos',
  },
  {
    id: 'anamneses',
    label: 'Anamneses',
    icon: FileText,
    href: '/configuracoes/anamneses',
  }
];
```

### Sub-páginas Implementadas

#### 1. Clínica (`/configuracoes/clinica`)
**Arquivo**: `client/src/pages/configuracoes/clinica.tsx`
- **Função**: Configurações gerais da clínica
- **Conteúdo**: Dados básicos, endereço, horários de funcionamento
- **Componentes**: FormFields, AddressForm, WorkingHoursConfig

#### 2. Equipe (`/configuracoes/equipe`)
**Arquivo**: `client/src/pages/configuracoes/equipe.tsx`
- **Função**: Gerenciamento de usuários e profissionais
- **Conteúdo**: Lista de usuários, permissões, convites
- **Componentes**: UserManagement, RoleSelector

#### 3. Integrações (`/configuracoes/integracoes`)
**Arquivo**: `client/src/pages/configuracoes/integracoes.tsx`
- **Função**: Configuração de APIs e integrações externas
- **Conteúdo**: WhatsApp, Google Calendar, N8N, Evolution API
- **Componentes**: IntegrationCard, ApiKeyManager

#### 4. Planos (`/configuracoes/planos`)
**Arquivo**: `client/src/pages/configuracoes/planos.tsx`
- **Função**: Gerenciamento de planos e assinaturas
- **Conteúdo**: Plano atual, histórico de pagamentos, upgrade
- **Status**: Placeholder para funcionalidade futura

#### 5. Anamneses (`/configuracoes/anamneses`)
**Arquivo**: `client/src/pages/configuracoes/anamneses.tsx`
- **Função**: Gestão de templates de anamnese
- **Conteúdo**: Lista de templates, editor, categorização
- **Migração**: Funcionalidade movida de `/anamneses` para configurações

### Padrão de Implementação para Configurações

```typescript
import ConfiguracoesLayout from "./index";

export default function ConfigSubPage() {
  // Lógica específica da página de configuração
  
  return (
    <ConfiguracoesLayout>
      {/* Conteúdo específico da configuração */}
    </ConfiguracoesLayout>
  );
}
```

## 3. Princípios de Design

### Consistência Visual
- **Cor Principal**: #0f766e (Verde teal Operabase)
- **Tipografia**: Sistema consistente de headings e texto
- **Espaçamento**: Grid system padronizado
- **Componentes**: shadcn/ui components reutilizados

### Navegação
- **Breadcrumbs Visuais**: Abas e sidebar mostram localização atual
- **Estado Ativo**: Highlighting da seção atual
- **Responsividade**: Adaptação para diferentes tamanhos de tela
- **Acessibilidade**: Navegação por teclado e screen readers

### Performance
- **Lazy Loading**: Sub-páginas carregadas sob demanda
- **Cache Inteligente**: React Query para dados compartilhados
- **Code Splitting**: Cada sub-página é um chunk separado
- **Memoização**: Componentes otimizados para re-renders

## 4. Vantagens da Arquitetura Modular

### Para Desenvolvimento
- **Separação de Responsabilidades**: Cada página tem foco específico
- **Reutilização**: Layouts compartilhados reduzem duplicação
- **Manutenibilidade**: Mudanças isoladas por funcionalidade
- **Testing**: Testes mais focados e específicos

### Para Usuários
- **Organização Clara**: Funcionalidades agrupadas logicamente
- **Performance**: Carregamento otimizado de apenas o necessário
- **Navegação Intuitiva**: Estrutura previsível e consistente
- **Mobile-Friendly**: Interface adaptada para dispositivos móveis

### Para Escalabilidade
- **Adição de Páginas**: Facilmente extensível com novas sub-páginas
- **Personalização**: Layouts podem ser customizados por tenant
- **Integração**: Novas funcionalidades integram-se facilmente
- **Migração**: Funcionalidades podem ser movidas entre seções

## 5. Implementação Técnica

### Routing Configuration
```typescript
// App.tsx - Definição de rotas
// Contatos
<Route path="/contatos/:id" component={() => <Navigate to={`/contatos/${id}/visao-geral`} />} />
<Route path="/contatos/:id/visao-geral" component={ContatoVisaoGeral} />
<Route path="/contatos/:id/anamneses" component={ContatoAnamneses} />
<Route path="/contatos/:id/mara-ai" component={ContatoMaraAI} />
<Route path="/contatos/:id/evolucoes" component={ContatoEvolucoes} />
<Route path="/contatos/:id/documentos" component={ContatoDocumentos} />
<Route path="/contatos/:id/arquivos" component={ContatoArquivos} />

// Configurações
<Route path="/configuracoes" component={() => <Navigate to="/configuracoes/clinica" />} />
<Route path="/configuracoes/clinica" component={ConfigClinica} />
<Route path="/configuracoes/equipe" component={ConfigEquipe} />
<Route path="/configuracoes/integracoes" component={ConfigIntegracoes} />
<Route path="/configuracoes/planos" component={ConfigPlanos} />
<Route path="/configuracoes/anamneses" component={ConfigAnamneses} />
```

### Estado Compartilhado
```typescript
// Hook para dados do contato (usado em todas as sub-páginas)
const useContactData = (contactId: string) => {
  return useQuery({
    queryKey: ['/api/contacts', contactId],
    queryFn: () => fetchContact(contactId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para configurações da clínica
const useClinicConfig = () => {
  return useQuery({
    queryKey: ['/api/clinic-config'],
    queryFn: () => fetchClinicConfig(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};
```

## 6. Migração e Refatoração

### De Sistema Monolítico para Modular

#### Antes:
- Página única com tabs (`/contatos/:id`)
- Componente grande com todas as funcionalidades
- Estado complexo compartilhado
- Difícil manutenção e navegação

#### Depois:
- 6 páginas separadas com rotas próprias
- Componentes focados e especializados
- Layout compartilhado para consistência
- Navegação clara e performática

### Processo de Migração:
1. **Análise**: Identificação das seções lógicas
2. **Layout**: Criação do component wrapper
3. **Separação**: Extração das funcionalidades para sub-páginas
4. **Routing**: Configuração das novas rotas
5. **Testing**: Validação de funcionalidades preservadas
6. **Cleanup**: Remoção do código legado

## 7. Próximos Passos e Extensibilidade

### Funcionalidades Planejadas:
- **Contatos**: Sub-página de comunicação WhatsApp
- **Configurações**: Página de backup e restauração
- **Global**: Sistema de favoritos entre sub-páginas
- **Performance**: Implementação de prefetching

### Padrões para Novas Páginas:
```typescript
// Template para nova sub-página de contato
export default function ContatoNovaPagina() {
  const { id: contactId } = useParams() as { id: string };
  
  return (
    <ContactLayout currentTab="nova-pagina">
      {/* Implementação específica */}
    </ContactLayout>
  );
}

// Template para nova página de configuração
export default function ConfigNovaPagina() {
  return (
    <ConfiguracoesLayout>
      {/* Implementação específica */}
    </ConfiguracoesLayout>
  );
}
```

---

Esta arquitetura modular permite ao Operabase manter uma interface organizada, performática e escalável, proporcionando uma experiência superior tanto para desenvolvedores quanto para usuários finais.