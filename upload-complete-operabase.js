#!/usr/bin/env node

/**
 * Complete Operabase Upload to GitHub - ROBUST VERSION
 * Ensures ALL essential files are uploaded without fail
 */

import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'caiorodrigo10';
const REPO_NAME = 'operabase';

// Critical files that MUST be uploaded
const CRITICAL_FILES = [
  'README.md',
  'replit.md',
  'package.json'
];

// Directories that must be fully uploaded
const REQUIRED_DIRECTORIES = [
  'client',
  'server', 
  'shared'
];

// Configuration files
const CONFIG_FILES = [
  'drizzle.config.ts',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'tsconfig.json'
];

// Documentation files
const DOCS_FILES = [
  'ARCHITECTURE.md',
  'API.md',
  'DEPLOYMENT.md',
  'DEVELOPMENT.md'
];

// Files to ALWAYS exclude
const ALWAYS_EXCLUDE = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  '.cache',
  '.replit',
  'replit.nix',
  'dist',
  'build',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  'attached_assets',
  'setup-github-operabase.js',
  'create-operabase-repo.js',
  'upload-complete-operabase.js'
];

// Temporary/test files to exclude
const TEMP_EXCLUDE_PATTERNS = [
  'upload-',
  'test-',
  'debug-',
  'check-',
  'fix-',
  'analyze-',
  'apply-',
  'cleanup-',
  'complete-',
  'update-',
  'add-',
  'execute-'
];

function shouldExclude(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative('.', filePath);
  
  // Always exclude certain patterns
  if (ALWAYS_EXCLUDE.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return relativePath.includes(pattern) || fileName === pattern;
  })) {
    return true;
  }

  // Exclude temp files by prefix
  if (TEMP_EXCLUDE_PATTERNS.some(prefix => fileName.startsWith(prefix))) {
    return true;
  }

  return false;
}

function getAllFilesRecursive(dir = '.', baseDir = '.') {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (shouldExclude(fullPath)) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan directories
        files.push(...getAllFilesRecursive(fullPath, baseDir));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`⚠️ Cannot read directory ${dir}: ${error.message}`);
  }

  return files;
}

function organizeFiles() {
  console.log('📋 Organizing files for upload...');
  
  const allFiles = getAllFilesRecursive();
  
  const organized = {
    critical: [],
    config: [],
    docs: [],
    client: [],
    server: [],
    shared: [],
    other: []
  };

  for (const file of allFiles) {
    const relativePath = path.relative('.', file);
    const fileName = path.basename(file);
    
    if (CRITICAL_FILES.includes(fileName)) {
      organized.critical.push(file);
    } else if (CONFIG_FILES.includes(fileName)) {
      organized.config.push(file);
    } else if (DOCS_FILES.includes(fileName)) {
      organized.docs.push(file);
    } else if (relativePath.startsWith('client/')) {
      organized.client.push(file);
    } else if (relativePath.startsWith('server/')) {
      organized.server.push(file);
    } else if (relativePath.startsWith('shared/')) {
      organized.shared.push(file);
    } else {
      organized.other.push(file);
    }
  }

  return organized;
}

async function makeGitHubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Operabase-Complete-Upload',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function getFileSha(filePath) {
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${relativePath}`;
  
  try {
    const result = await makeGitHubRequest(url);
    return result.sha;
  } catch (error) {
    // File doesn't exist
    return null;
  }
}

async function uploadFile(filePath) {
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${relativePath}`;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sha = await getFileSha(filePath);
    
    const fileData = {
      message: sha ? `Update ${relativePath}` : `Add ${relativePath}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: 'main'
    };

    if (sha) {
      fileData.sha = sha;
    }

    await makeGitHubRequest(url, {
      method: 'PUT',
      body: JSON.stringify(fileData)
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function uploadFilesBatch(files, batchName, delay = 150) {
  console.log(`\n📦 Uploading ${batchName}: ${files.length} files`);
  
  let success = 0;
  let failed = 0;
  const failures = [];

  for (const file of files) {
    const relativePath = path.relative('.', file);
    
    try {
      console.log(`📤 ${relativePath}`);
      const result = await uploadFile(file);
      
      if (result.success) {
        success++;
      } else {
        failed++;
        failures.push({ file: relativePath, error: result.error });
        console.log(`❌ Failed: ${result.error}`);
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      failed++;
      failures.push({ file: relativePath, error: error.message });
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  return { success, failed, failures };
}

async function retryFailures(failures, maxRetries = 2) {
  if (failures.length === 0) return { success: 0, failed: 0 };
  
  console.log(`\n🔄 Retrying ${failures.length} failed files...`);
  
  let success = 0;
  let failed = 0;
  
  for (const failure of failures) {
    let retries = 0;
    let uploaded = false;
    
    while (retries < maxRetries && !uploaded) {
      try {
        console.log(`🔄 Retry ${retries + 1}/${maxRetries}: ${failure.file}`);
        const result = await uploadFile(failure.file);
        
        if (result.success) {
          success++;
          uploaded = true;
        } else {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (!uploaded) {
      failed++;
      console.log(`❌ Final failure: ${failure.file}`);
    }
  }

  return { success, failed };
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting COMPLETE Operabase upload to GitHub');
  console.log(`📦 Repository: ${GITHUB_USERNAME}/${REPO_NAME}`);
  
  try {
    const organized = organizeFiles();
    
    console.log('\n📊 Upload Plan:');
    console.log(`📋 Critical files: ${organized.critical.length}`);
    console.log(`⚙️ Config files: ${organized.config.length}`);
    console.log(`📚 Documentation: ${organized.docs.length}`);
    console.log(`🖥️ Client files: ${organized.client.length}`);
    console.log(`🔧 Server files: ${organized.server.length}`);
    console.log(`📦 Shared files: ${organized.shared.length}`);
    console.log(`📄 Other files: ${organized.other.length}`);
    
    const totalFiles = Object.values(organized).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📊 Total files to upload: ${totalFiles}`);

    // Upload in priority order
    const results = [];
    
    // 1. Critical files first
    results.push(await uploadFilesBatch(organized.critical, 'Critical Files', 100));
    
    // 2. Configuration files
    results.push(await uploadFilesBatch(organized.config, 'Configuration Files', 100));
    
    // 3. Documentation
    results.push(await uploadFilesBatch(organized.docs, 'Documentation', 100));
    
    // 4. Shared directory (schemas, types)
    results.push(await uploadFilesBatch(organized.shared, 'Shared Directory', 150));
    
    // 5. Server directory
    results.push(await uploadFilesBatch(organized.server, 'Server Directory', 150));
    
    // 6. Client directory
    results.push(await uploadFilesBatch(organized.client, 'Client Directory', 150));
    
    // 7. Other files
    results.push(await uploadFilesBatch(organized.other, 'Other Files', 200));

    // Collect all failures for retry
    const allFailures = results.flatMap(r => r.failures);
    
    // Retry failed uploads
    const retryResult = await retryFailures(allFailures);

    // Final summary
    const totalSuccess = results.reduce((sum, r) => sum + r.success, 0) + retryResult.success;
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0) + retryResult.failed - retryResult.success;

    console.log('\n📊 FINAL UPLOAD SUMMARY:');
    console.log(`✅ Successfully uploaded: ${totalSuccess} files`);
    console.log(`❌ Failed uploads: ${totalFailed} files`);
    console.log(`🌐 Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`);
    
    if (totalFailed === 0) {
      console.log('🎉 ALL FILES UPLOADED SUCCESSFULLY!');
      console.log('✅ Complete Operabase application is now available on GitHub');
    } else {
      console.log(`⚠️ ${totalFailed} files failed to upload. Manual verification needed.`);
    }

  } catch (error) {
    console.error('💥 Upload failed:', error.message);
    process.exit(1);
  }
}

main();