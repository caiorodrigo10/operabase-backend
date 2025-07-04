import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'caiorodrigo10';
const REPO_NAME = 'taskmed';
const BRANCH = 'main';

// Domain and API files to upload
const DOMAIN_FILES = [
  'server/domains/auth/auth.schema.ts',
  'server/domains/auth/auth.service.ts',
  'server/domains/auth/auth.repository.ts',
  'server/domains/clinics/clinics.schema.ts',
  'server/domains/clinics/clinics.service.ts',
  'server/domains/clinics/clinics.repository.ts',
  'server/domains/contacts/contacts.schema.ts',
  'server/domains/contacts/contacts.service.ts',
  'server/domains/contacts/contacts.repository.ts',
  'server/domains/appointments/appointments.schema.ts',
  'server/domains/appointments/appointments.service.ts',
  'server/domains/appointments/appointments.repository.ts',
  'server/api/v1/auth.ts',
  'server/api/v1/clinics.ts',
  'server/api/v1/contacts.ts',
  'server/api/v1/appointments.ts'
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

async function uploadDomains() {
  console.log('🚀 Uploading domain and API files...');
  
  let successCount = 0;
  
  for (const filePath of DOMAIN_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`⚠️ Not found: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${filePath}`);
    }
  }

  console.log(`\n📊 Final: Uploaded ${successCount}/${DOMAIN_FILES.length} domain files`);
  console.log('🎉 Repository upload complete!');
}

uploadDomains().catch(console.error);