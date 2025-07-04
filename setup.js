#!/usr/bin/env node

import { createInterface } from 'readline';
import { writeFileSync, existsSync } from 'fs';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 Bem-vindo ao setup do Operabase!\n');
console.log('Este script irá ajudá-lo a configurar as variáveis de ambiente necessárias.\n');

const questions = [
  {
    key: 'SUPABASE_URL',
    question: '📍 URL do seu projeto Supabase (ex: https://xxx.supabase.co): ',
    required: true
  },
  {
    key: 'SUPABASE_ANON_KEY',
    question: '🔑 Chave anon do Supabase: ',
    required: true
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    question: '🔐 Chave service_role do Supabase: ',
    required: true
  },
  {
    key: 'DATABASE_URL',
    question: '🗄️  String de conexão do banco (copie do Supabase): ',
    required: true
  },
  {
    key: 'OPENAI_API_KEY',
    question: '🤖 Chave da OpenAI (opcional, pressione Enter para pular): ',
    required: false
  }
];

async function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setup() {
  const config = {};
  
  console.log('ℹ️  Para encontrar suas credenciais do Supabase:');
  console.log('   1. Acesse https://supabase.com/dashboard');
  console.log('   2. Selecione seu projeto');
  console.log('   3. Vá em Settings > API');
  console.log('   4. Copie a URL e as chaves\n');
  
  for (const { key, question, required } of questions) {
    let answer = '';
    
    do {
      answer = await askQuestion(question);
      
      if (required && !answer) {
        console.log('❌ Este campo é obrigatório!');
      }
    } while (required && !answer);
    
    if (answer) {
      config[key] = answer;
    }
  }
  
  // Adicionar configurações fixas
  config.NODE_ENV = 'development';
  config.PORT = '3000';
  config.SESSION_SECRET = 'dev-session-secret-for-local-development';
  
  // Gerar arquivo .env
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const fullEnvContent = `# Arquivo .env gerado pelo setup do Operabase
# Gerado em: ${new Date().toISOString()}

${envContent}

# ===== CONFIGURAÇÕES OPCIONAIS =====
# Descomente e configure conforme necessário:

# WHATSAPP EVOLUTION API
# EVOLUTION_API_URL=https://your-evolution-api.com
# EVOLUTION_API_KEY=your-evolution-api-key

# GOOGLE CALENDAR
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=xxx
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback/google

# REDIS (CACHE)
# REDIS_URL=redis://localhost:6379

# ASAAS (PAGAMENTOS)
# ASAAS_API_KEY=your-asaas-api-key
`;
  
  writeFileSync('.env', fullEnvContent);
  
  console.log('\n✅ Arquivo .env criado com sucesso!');
  console.log('\n🔧 Próximos passos:');
  console.log('   1. Verifique se as credenciais estão corretas');
  console.log('   2. Execute: npm run db:push');
  console.log('   3. Execute: npm run dev');
  console.log('   4. Acesse: http://localhost:3000\n');
  
  rl.close();
}

// Verificar se já existe .env
if (existsSync('.env')) {
  const shouldOverwrite = await askQuestion('⚠️  Arquivo .env já existe. Deseja sobrescrever? (y/N): ');
  if (shouldOverwrite.toLowerCase() !== 'y' && shouldOverwrite.toLowerCase() !== 'yes') {
    console.log('✋ Setup cancelado. Arquivo .env mantido.');
    rl.close();
    process.exit(0);
  }
}

setup().catch(console.error); 