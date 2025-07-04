import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'caiorodrigo10';
const REPO_NAME = 'taskmed';
const BRANCH = 'main';

// Server files to upload
const SERVER_FILES = [
  'server/index.ts',
  'server/db.ts',
  'server/storage.ts',
  'server/storage-factory.ts',
  'server/postgres-storage.ts',
  'server/storage-minimal.ts',
  'server/auth.ts',
  'server/permissions-middleware.ts',
  'server/permissions-routes.ts',
  'server/mara-ai-service.ts',
  'server/mara-routes.ts',
  'server/google-calendar-service.ts',
  'server/calendar-routes.ts',
  'server/calendar-sync-manager.ts',
  'server/calendar-webhook-routes.ts',
  'shared/schema.ts'
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
      message: `Add ${filePath}`,
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

async function uploadServerFiles() {
  console.log('🚀 Uploading server files...');
  
  let successCount = 0;
  
  for (const filePath of SERVER_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        console.log(`⚠️ Not found: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${filePath}`);
    }
  }

  console.log(`\n📊 Uploaded ${successCount}/${SERVER_FILES.length} server files`);
}

uploadServerFiles().catch(console.error);