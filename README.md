# 🏥 Operabase

**Sistema completo de gestão clínica com IA integrada**

Operabase é uma plataforma moderna de gestão clínica que combina agendamento, prontuários eletrônicos, análise de dados e inteligência artificial para otimizar o atendimento médico.

## ✨ Principais Funcionalidades

### 🤖 **Inteligência Artificial**
- **Assistente IA**: Conversas inteligentes para suporte ao diagnóstico
- **Análise de Anamnese**: Processamento automático de históricos médicos
- **Sugestões Clínicas**: Recomendações baseadas em dados históricos
- **Pausas Inteligentes**: Sistema de controle de uso da IA

### 📅 **Gestão de Agendamentos**
- **Calendário Avançado**: Interface moderna com múltiplas visualizações
- **Agendamento Online**: Portal para pacientes
- **Notificações Automáticas**: SMS e email para lembretes
- **Gestão de Disponibilidade**: Controle flexível de horários

### 📋 **Prontuários Eletrônicos**
- **Editor Avançado**: Interface intuitiva para criação de anamneses
- **Histórico Completo**: Acesso rápido ao histórico do paciente
- **Anexos Médicos**: Upload e gestão de exames e documentos
- **Relatórios Personalizados**: Geração automática de relatórios

### 🏢 **Gestão Multi-Clínica**
- **Isolamento de Dados**: Cada clínica tem seus dados protegidos
- **Gestão de Equipes**: Controle de acesso por função
- **Configurações Personalizadas**: Adaptação às necessidades específicas
- **Relatórios Analíticos**: Dashboards com métricas importantes

## 🛠️ Stack Tecnológico

### **Frontend**
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **TailwindCSS** para styling
- **Shadcn/ui** para componentes
- **TanStack Query** para gerenciamento de estado
- **Craft.js** para editor visual

### **Backend**
- **Node.js** com Express
- **TypeScript** para type safety
- **PostgreSQL** como banco principal
- **Redis** para cache e sessões
- **Supabase** para autenticação
- **Drizzle ORM** para queries

### **Inteligência Artificial**
- **OpenAI GPT** para conversas
- **Anthropic Claude** para análises
- **Embeddings** para busca semântica
- **RAG** para base de conhecimento

### **Infraestrutura**
- **Docker** para containerização
- **GitHub Actions** para CI/CD
- **Neon** para PostgreSQL
- **Upstash** para Redis

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/Operabase.git
cd Operabase
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Execute as migrações**
```bash
npm run db:push
```

5. **Inicie o desenvolvimento**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
Operabase/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários e configurações
│   │   └── types/         # Definições TypeScript
│   └── public/            # Arquivos estáticos
├── server/                # Backend Express
│   ├── domains/           # Módulos de domínio
│   ├── shared/           # Código compartilhado
│   ├── middleware/       # Middlewares Express
│   └── services/         # Serviços externos
├── docs/                 # Documentação
└── migrations/           # Migrações do banco
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção (frontend only)
npm run build:full   # Build completo (frontend + backend)
npm run start        # Inicia servidor de produção

# Banco de dados
npm run db:push      # Aplica migrações
npm run setup        # Configuração inicial

# Verificação
npm run check        # Verificação de tipos TypeScript
```

## 🚀 Deploy

### Netlify (Frontend)
O frontend está configurado para deploy automático no Netlify:

1. **Conecte o repositório** no [Netlify Dashboard](https://app.netlify.com)
2. **Configure o build**:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
   - Node version: 18
3. **Adicione as variáveis de ambiente** necessárias

📖 **Guia completo**: [docs/NETLIFY-DEPLOYMENT.md](docs/NETLIFY-DEPLOYMENT.md)

### Backend
O backend pode ser deployado em qualquer plataforma Node.js:
- Railway, Heroku, DigitalOcean, AWS, etc.
- Use `npm run build:full` para build completo

## 🌍 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Banco de dados
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Autenticação
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SESSION_SECRET=...

# IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Configurações
NODE_ENV=development
PORT=3000
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais informações.

## 🆘 Suporte

- 📧 Email: suporte@operabase.com
- 📚 Documentação: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/Operabase/issues)

## 🎯 Roadmap

- [ ] Mobile App (React Native)
- [ ] Telemedicina integrada
- [ ] IA para análise de exames
- [ ] Integração com laboratórios
- [ ] API pública para integrações

---

**Desenvolvido com ❤️ para revolucionar a gestão clínica**

# Operabase Backend

🚀 **Express.js + TypeScript backend deployed on AWS Elastic Beanstalk**

## 🌟 Features

- **Express.js + TypeScript** - Modern Node.js backend
- **Supabase Integration** - PostgreSQL database + Storage
- **Redis Cache** - AWS ElastiCache for performance
- **WhatsApp Integration** - Evolution API
- **AI Features** - OpenAI + Anthropic integration
- **Real-time** - WebSocket support
- **Multi-tenant** - Clinic isolation
- **CI/CD** - Automatic deployment from GitHub

## 🚀 Deployment

This application is automatically deployed to AWS when pushing to the `main` branch.

### Infrastructure:
- **AWS Elastic Beanstalk** (São Paulo - sa-east-1)
- **AWS ElastiCache Redis** 
- **GitHub Actions CI/CD**

### Environment:
- **Production**: Deployed automatically on push to `main`
- **Region**: São Paulo (sa-east-1)
- **Instance**: t3.small with auto-scaling

## 📝 Environment Variables

Required environment variables are configured in AWS Elastic Beanstalk:

```bash
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
REDIS_URL=redis://your-redis-endpoint:6379
OPENAI_API_KEY=your_openai_key
# ... and more
```

## 🔧 Local Development

```bash
npm install
npm run dev
```

## 📦 Deployment Pipeline

1. Push to `main` branch
2. GitHub Actions builds and tests
3. Deploys to AWS Elastic Beanstalk
4. Health checks verify deployment

---

**Last Updated**: $(date)# Deploy test - Fri Jul  4 12:21:33 -03 2025
