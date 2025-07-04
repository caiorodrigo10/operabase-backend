import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const REPO_NAME = 'sistema-gestao-clinicas';

// Lista de arquivos essenciais do projeto
const essentialFiles = [
  // Documentação
  'README.md',
  'GITHUB_SETUP.md',
  '.gitignore',
  '.env.example',
  
  // Configuração do projeto
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'drizzle.config.ts',
  
  // Frontend - Páginas principais
  'client/index.html',
  'client/src/main.tsx',
  'client/src/App.tsx',
  'client/src/index.css',
  'client/src/vite-env.d.ts',
  
  // Páginas
  'client/src/pages/home.tsx',
  'client/src/pages/consultas.tsx',
  'client/src/pages/pacientes.tsx',
  'client/src/pages/pipeline.tsx',
  'client/src/pages/configuracoes.tsx',
  'client/src/pages/dashboard.tsx',
  
  // Componentes essenciais
  'client/src/components/Calendar.tsx',
  'client/src/components/FindTimeSlots.tsx',
  'client/src/components/AppointmentForm.tsx',
  'client/src/components/ContactForm.tsx',
  'client/src/components/Layout.tsx',
  'client/src/components/Navigation.tsx',
  
  // Libs e utilitários
  'client/src/lib/queryClient.ts',
  'client/src/lib/utils.ts',
  'client/src/lib/supabase.ts',
  
  // Hooks
  'client/src/hooks/use-toast.ts',
  
  // Backend
  'server/index.ts',
  'server/routes.ts',
  'server/auth.ts',
  'server/replitAuth.ts',
  'server/storage-factory.ts',
  'server/postgres-storage.ts',
  'server/db.ts',
  'server/google-calendar-service.ts',
  'server/calendar-routes.ts',
  'server/mara-ai-service.ts',
  'server/mara-routes.ts',
  
  // Schema compartilhado
  'shared/schema.ts'
];

async function uploadFile(filePath, content) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `feat: Add ${filePath}`,
        content: Buffer.from(content).toString('base64'),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Erro ao enviar ${filePath}:`, error);
      return false;
    }

    console.log(`✅ ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ ${filePath}:`, error.message);
    return false;
  }
}

async function uploadProject() {
  console.log('🚀 Enviando arquivos essenciais para GitHub...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const filePath of essentialFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️ ${filePath} (não encontrado)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const success = await uploadFile(filePath, content);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ ${filePath}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`✅ Enviados: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`\n🔗 https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`);
}

uploadProject();