import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const REPO_NAME = 'sistema-gestao-clinicas';

// Arquivos restantes críticos
const remainingFiles = [
  'client/src/main.tsx',
  'client/src/App.tsx',
  'client/src/index.css',
  'client/src/pages/consultas.tsx',
  'client/src/pages/pacientes.tsx',
  'client/src/components/Calendar.tsx',
  'client/src/components/FindTimeSlots.tsx',
  'client/src/lib/supabase.ts',
  'server/index.ts',
  'server/routes.ts',
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
      },
      body: JSON.stringify({
        message: `feat: Add ${filePath}`,
        content: Buffer.from(content).toString('base64'),
      }),
    });

    if (response.ok) {
      console.log(`✅ ${filePath}`);
      return true;
    } else {
      console.log(`❌ ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${filePath}: ${error.message}`);
    return false;
  }
}

async function completeUpload() {
  console.log('Completando upload dos arquivos principais...');
  
  for (const filePath of remainingFiles) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      await uploadFile(filePath, content);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log('\n🎉 Upload concluído!');
  console.log('🔗 https://github.com/caiorodrigo10/sistema-gestao-clinicas');
}

completeUpload();