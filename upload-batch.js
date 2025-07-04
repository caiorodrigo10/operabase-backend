import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'caiorodrigo10';
const REPO_NAME = 'taskmed';
const BRANCH = 'main';

// Remaining essential files to upload
const REMAINING_FILES = [
  'client/src/lib/queryClient.ts',
  'client/src/lib/utils.ts',
  'client/src/lib/auth.ts',
  'client/src/lib/supabase.ts',
  'client/src/components/ui/button.tsx',
  'client/src/components/ui/card.tsx',
  'client/src/components/ui/form.tsx',
  'client/src/components/ui/input.tsx',
  'client/src/components/ui/select.tsx',
  'client/src/components/ui/dialog.tsx',
  'client/src/components/layout/sidebar.tsx',
  'client/src/components/layout/header.tsx',
  'client/src/pages/consultas.tsx',
  'client/src/pages/contatos.tsx',
  'client/src/pages/contato-detalhes.tsx',
  'client/src/pages/painel.tsx',
  'client/src/pages/configuracoes.tsx',
  'client/src/pages/perfil.tsx',
  'client/src/pages/calendario.tsx',
  'client/src/pages/login.tsx',
  'client/src/hooks/use-toast.ts',
  'client/src/index.css'
];

async function uploadFile(filePath, content) {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    
    let sha = null;
    try {
      const getResponse = await fetch(url, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (getResponse.ok) {
        const existingFile = await getResponse.json();
        sha = existingFile.sha;
      }
    } catch (error) {
      // File doesn't exist
    }

    const body = {
      message: `Update ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      branch: BRANCH,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(`✅ ${filePath}`);
      return true;
    } else {
      console.log(`❌ ${filePath}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${filePath}: ${error.message}`);
    return false;
  }
}

async function uploadBatch() {
  console.log('🚀 Uploading client files batch...');
  
  let successCount = 0;
  
  for (const filePath of REMAINING_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log(`⚠️ Not found: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${filePath}`);
    }
  }

  console.log(`\n📊 Uploaded ${successCount}/${REMAINING_FILES.length} client files`);
}

uploadBatch().catch(console.error);