import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'caiorodrigo10';
const REPO_NAME = 'taskmed';
const BRANCH = 'main';

// Essential files to upload
const ESSENTIAL_FILES = [
  'package.json',
  'README.md',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  'components.json',
  '.env.example',
  '.gitignore',
  
  // Client files
  'client/index.html',
  'client/src/main.tsx',
  'client/src/App.tsx',
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
  'client/src/components/ui/calendar.tsx',
  'client/src/components/ui/toast.tsx',
  'client/src/components/ui/toaster.tsx',
  'client/src/components/ui/use-toast.ts',
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
  'client/src/index.css',
  
  // Server files
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
  
  // Domain structure
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
  'server/domains/medical-records/medical-records.schema.ts',
  'server/domains/medical-records/medical-records.service.ts',
  'server/domains/medical-records/medical-records.repository.ts',
  'server/domains/calendar/calendar.schema.ts',
  'server/domains/calendar/calendar.service.ts',
  'server/domains/calendar/calendar.repository.ts',
  
  // API routes
  'server/api/v1/auth.ts',
  'server/api/v1/clinics.ts',
  'server/api/v1/contacts.ts',
  'server/api/v1/appointments.ts',
  'server/api/v1/medical-records.ts',
  'server/api/v1/calendar.ts',
  
  // Shared files
  'shared/schema.ts',
  
  // Migrations
  'migrations/0000_next_raza.sql',
  'migrations/meta/_journal.json',
  'migrations/meta/0000_snapshot.json'
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

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Failed ${filePath}: ${response.status}`);
      return false;
    }

    console.log(`✅ ${filePath}`);
    return true;
  } catch (error) {
    console.log(`❌ Error ${filePath}: ${error.message}`);
    return false;
  }
}

async function uploadEssentialFiles() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Uploading essential files to taskmed repository...');
  console.log(`📁 Repository: ${REPO_OWNER}/${REPO_NAME}`);

  let successCount = 0;
  let failCount = 0;

  for (const filePath of ESSENTIAL_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`⚠️ File not found: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error processing ${filePath}: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed uploads: ${failCount} files`);
  
  if (failCount === 0) {
    console.log('🎉 All essential files uploaded successfully!');
  }
}

uploadEssentialFiles().catch(console.error);