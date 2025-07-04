import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const REPO_NAME = 'sistema-gestao-clinicas';

// Função para fazer upload de um arquivo via API do GitHub
async function uploadFile(filePath, content) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
  
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
    console.error(`Erro ao fazer upload de ${filePath}:`, await response.text());
    return false;
  }

  console.log(`✅ ${filePath} enviado com sucesso`);
  return true;
}

// Função para ler todos os arquivos do projeto
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    // Ignorar arquivos e pastas do .gitignore
    const ignoredPaths = [
      'node_modules', '.git', '.env', 'dist', 'build',
      'attached_assets', '.replit', 'cookies.txt'
    ];
    
    if (ignoredPaths.some(ignored => fullPath.includes(ignored))) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // Converter path absoluto para relativo
      const relativePath = path.relative('.', fullPath);
      arrayOfFiles.push(relativePath);
    }
  });

  return arrayOfFiles;
}

// Função principal
async function uploadProject() {
  console.log('🚀 Iniciando upload do projeto para GitHub...');
  
  try {
    const files = getAllFiles('.');
    console.log(`📁 Encontrados ${files.length} arquivos para upload`);

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Erro ao processar ${filePath}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Resultado final:`);
    console.log(`✅ Arquivos enviados: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`\n🔗 Repositório: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

uploadProject();