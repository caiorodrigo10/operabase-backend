# 🚀 Guia de Configuração Local - Operabase

## 📋 Pré-requisitos

- **Node.js 18+** instalado
- **Conta no Supabase** (gratuita)
- **Git** para clonar repositórios
- **Editor de código** (VS Code recomendado)

## 🔧 Configuração Passo a Passo

### 1. Instalação das Dependências

```bash
npm install
```

### 2. Configuração do Supabase

#### 2.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Clique em "New Project"
4. Escolha uma organização
5. Configure:
   - **Name**: operabase-local
   - **Database Password**: crie uma senha forte
   - **Region**: escolha a mais próxima

#### 2.2 Obter Credenciais
Após criar o projeto, vá em **Settings > API**:

- **Project URL**: `https://xxx.supabase.co`
- **anon public**: `eyJhbG...` (chave pública)
- **service_role**: `eyJhbG...` (chave secreta)

#### 2.3 Obter String de Conexão
Vá em **Settings > Database** e copie a **Connection string**:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 3. Configurar Variáveis de Ambiente

#### Opção 1: Setup Automático (Recomendado)
```bash
npm run setup
```
Este comando irá guiá-lo através da configuração interativa.

#### Opção 2: Manual
Edite o arquivo `.env` com suas credenciais:

```bash
# CONFIGURAÇÃO MÍNIMA PARA DESENVOLVIMENTO LOCAL
NODE_ENV=development
PORT=3000
SESSION_SECRET=dev-session-secret-for-local-development

# SUPABASE - SUBSTITUA PELOS SEUS DADOS
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...sua-chave-service-role
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# OPENAI (OPCIONAL PARA TESTE INICIAL)
OPENAI_API_KEY=sk-proj-xxx...sua-chave-openai
```

### 4. Configurar Banco de Dados

#### 4.1 Aplicar Migrações
```bash
npm run db:push
```

#### 4.2 Verificar Tabelas (Opcional)
```bash
npx drizzle-kit studio
```
Isso abrirá uma interface web para visualizar as tabelas criadas.

### 5. Executar a Aplicação

#### 5.1 Modo Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

#### 5.2 Verificar Logs
No terminal, você deve ver:
```
✅ Database connection successful
💾 Using PostgreSQL storage with Supabase
🔒 Applying tenant isolation layer
serving on port 3000
```

## 🎯 Testando a Instalação

### 1. Acessar a Interface
- Abra `http://localhost:3000` no navegador
- Você deve ver a interface da aplicação

### 2. Verificar API
- Teste: `http://localhost:3000/api/health`
- Deve retornar status OK

### 3. Verificar Banco
- As tabelas devem ter sido criadas automaticamente no Supabase
- Acesse o painel do Supabase > Table Editor para verificar

## 🔧 Configurações Opcionais

### OpenAI (Para IA Mara)
1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta e gere uma API key
3. Adicione ao `.env`: `OPENAI_API_KEY=sk-proj-xxx...`

### Google Calendar (Para Agendamentos)
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto
3. Ative a API do Google Calendar
4. Crie credenciais OAuth 2.0
5. Configure no `.env`:
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback/google
```

### Redis (Para Cache - Opcional)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Adicionar ao .env:
REDIS_URL=redis://localhost:6379
```

## 🚨 Resolução de Problemas

### Erro de Conexão com Banco
```
❌ Database connection failed
```
**Solução**: Verifique se:
- As credenciais do Supabase estão corretas
- A URL do banco está correta
- O projeto do Supabase está ativo

### Erro de Porta em Uso
```
Port 5000 is already in use
```
**Solução**:
```bash
# Encontrar processo usando a porta
lsof -i :3000

# Matar processo
kill -9 [PID]

# Ou usar porta diferente
PORT=4000 npm run dev
```

### Erro de Módulos
```
Cannot find module 'xxx'
```
**Solução**:
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📚 Próximos Passos

Após a configuração básica:

1. **Criar usuário admin**: A aplicação criará automaticamente um usuário padrão
2. **Configurar clínica**: Acesse o painel admin para configurar sua clínica
3. **Testar funcionalidades**: Teste contatos, agendamentos, etc.
4. **Integrar WhatsApp**: Configure Evolution API para WhatsApp
5. **Configurar IA**: Configure OpenAI para assistente Mara

## 🔗 Links Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação OpenAI](https://platform.openai.com/docs)
- [Documentação Google Calendar API](https://developers.google.com/calendar)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

## 💬 Suporte

Para dúvidas específicas sobre configuração, consulte:
- `docs/` - Documentação completa do sistema
- Issues do repositório
- Logs da aplicação para debug detalhado 