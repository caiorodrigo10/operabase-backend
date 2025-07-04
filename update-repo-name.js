import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const REPO_NAME = 'taskmed';

async function updateFile(filePath, content) {
  // Primeiro, obter o SHA atual do arquivo
  const getUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
  
  try {
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!getResponse.ok) {
      console.log(`❌ Erro ao obter ${filePath}`);
      return false;
    }

    const fileData = await getResponse.json();
    const sha = fileData.sha;

    // Agora atualizar o arquivo
    const updateUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `feat: Update ${filePath} with TaskMed branding`,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
      }),
    });

    if (updateResponse.ok) {
      console.log(`✅ ${filePath} atualizado`);
      return true;
    } else {
      console.log(`❌ Erro ao atualizar ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${filePath}: ${error.message}`);
    return false;
  }
}

async function updateRepoFiles() {
  console.log('Atualizando arquivos no repositório TaskMed...');
  
  // Atualizar README.md
  if (fs.existsSync('README.md')) {
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    await updateFile('README.md', readmeContent);
  }

  // Atualizar GITHUB_SETUP.md
  if (fs.existsSync('GITHUB_SETUP.md')) {
    let setupContent = fs.readFileSync('GITHUB_SETUP.md', 'utf8');
    setupContent = setupContent.replace(/sistema-gestao-clinicas/g, 'taskmed');
    await updateFile('GITHUB_SETUP.md', setupContent);
  }

  console.log('\n🎉 Arquivos atualizados no GitHub!');
  console.log('🔗 https://github.com/caiorodrigo10/taskmed');
}

updateRepoFiles();