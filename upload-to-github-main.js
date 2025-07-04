import fs from 'fs';
import path from 'path';

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'caiorodrigo';
const REPO_NAME = 'taskmed';
const BRANCH = 'main';

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'attached_assets',
  '.env',
  'cookies.txt',
  '.replit',
  '.cache',
  '.local',
  'package-lock.json',
  'upload-to-github-main.js',
  // Migration and test files
  'add-advanced-calendar-columns.ts',
  'add-permissions-supabase.ts',
  'add-role-columns.ts',
  'check-calendar-config.ts',
  'check-calendar-details.ts',
  'check-calendar-settings.ts',
  'check-calendar-supabase.ts',
  'cleanup-orphaned-events.ts',
  'complete-clinic-settings-migration.ts',
  'complete-missing-tables.ts',
  'complete-upload.js',
  'create-appointment-tags-table.ts',
  'create-missing-table.ts',
  'create-profile.sql',
  'create-supabase-tables.ts',
  'create-user-profile.js',
  'debug-calendar-events.ts',
  'debug-supabase.ts',
  'delete-calendar-integration.ts',
  'fix-calendar-ids.ts',
  'fix-calendar-schema.ts',
  'fix-clinic-email-column.ts',
  'fix-contacts-sequence.ts',
  'fix-current-user.ts',
  'fix-sequence-direct.ts',
  'fix-sequences-supabase.ts',
  'fix-user-profile.js',
  'migrate-calendar-corrected.ts',
  'migrate-calendar-final.ts',
  'migrate-calendar-integrations.ts',
  'migrate-clean.ts',
  'migrate-clinics-direct.ts',
  'migrate-complete.ts',
  'migrate-data-fixed.ts',
  'migrate-data-only.ts',
  'migrate-permissions.ts',
  'migrate-simple.ts',
  'migrate-to-supabase-complete.ts',
  'migrate-to-supabase.ts',
  'migrate-user-to-supabase.ts',
  'run-db-migration.ts',
  'schema-supabase.sql',
  'supabase-migration-analysis.ts',
  'switch-to-supabase.ts',
  'test-advanced-sync-system.ts',
  'test-calendar-cleanup.ts',
  'test-calendar-deletion-final.ts',
  'test-calendar-id-sync.ts',
  'test-calendar-integration-final.ts',
  'test-calendar-token-handling.ts',
  'test-cleanup-direct.ts',
  'test-complete-calendar-integration.ts',
  'test-frontend-auth.js',
  'test-google-calendar-complete.ts',
  'test-login-flow.js',
  'test-mara-api.ts',
  'test-migration-readiness.ts',
  'test-rls-policies.ts',
  'test-schema.js',
  'test-supabase-auth-integration.ts',
  'test-supabase-auth.ts',
  'test-supabase-connection.ts',
  'test-supabase-direct.ts',
  'test-supabase-fase4-complete.ts',
  'test-supabase-frontend.ts',
  'update-repo-name.js',
  'upload-essential-files.js',
  'upload-to-github.js',
  'verify-complete-migration.ts',
  'verify-migration-complete.ts',
  'verify-supabase.ts'
];

async function uploadFile(filePath, content) {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    
    // Check if file exists to get SHA
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
      // File doesn't exist, that's fine
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
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    console.log(`✅ Uploaded: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message);
    return false;
  }
}

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.endsWith('/')) {
      return filePath.startsWith(pattern) || filePath.includes(`/${pattern}`);
    }
    return filePath === pattern || filePath.endsWith(`/${pattern}`);
  });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative('.', fullPath).replace(/\\/g, '/');
    
    if (shouldExclude(relativePath) || shouldExclude(file)) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function uploadProject() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting upload to GitHub main branch...');
  console.log(`📁 Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`🌿 Branch: ${BRANCH}`);

  const allFiles = getAllFiles('.');
  console.log(`📋 Found ${allFiles.length} files to upload`);

  let successCount = 0;
  let failCount = 0;

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
      
      console.log(`📤 Uploading: ${relativePath}`);
      const success = await uploadFile(relativePath, content);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed uploads: ${failCount} files`);
  console.log(`📁 Total files processed: ${allFiles.length}`);
  
  if (failCount === 0) {
    console.log('🎉 All files uploaded successfully to GitHub main branch!');
  } else {
    console.log('⚠️ Some files failed to upload. Check the logs above.');
  }
}

uploadProject().catch(console.error);