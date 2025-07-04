#!/usr/bin/env node

/**
 * Optimized GitHub Repository Setup for Operabase
 * Creates repository and uploads only essential files
 */

import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'caiorodrigo10';
const REPO_NAME = 'operabase';

// Essential files to include
const ESSENTIAL_FILES = [
  'README.md',
  'replit.md',
  'ARCHITECTURE.md',
  'API.md',
  'DEPLOYMENT.md',
  'DEVELOPMENT.md',
  'drizzle.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'vite.config.ts',
  'tsconfig.json'
];

// Essential directories to include
const ESSENTIAL_DIRS = [
  'client',
  'server',
  'shared'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  '.cache',
  'node_modules',
  '.git',
  '.env',
  '.replit',
  'replit.nix',
  'dist',
  'build',
  '*.log',
  '.DS_Store',
  'setup-github-operabase.js',
  'create-operabase-repo.js',
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
  'execute-',
  'attached_assets'
];

function shouldExclude(filePath) {
  // Always include essential files
  if (ESSENTIAL_FILES.includes(path.basename(filePath))) {
    return false;
  }

  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern) || path.basename(filePath).startsWith(pattern);
  });
}

function isEssentialDirectory(dirPath) {
  const dirName = path.basename(dirPath);
  return ESSENTIAL_DIRS.includes(dirName);
}

function getEssentialFiles() {
  const files = [];
  
  // Add essential root files
  ESSENTIAL_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      files.push(file);
    }
  });

  // Add essential directories
  ESSENTIAL_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const dirFiles = getAllFilesInDir(dir);
      files.push(...dirFiles);
    }
  });

  return files;
}

function getAllFilesInDir(dirPath) {
  const files = [];
  
  function scanDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const fullPath = path.join(currentPath, item);
        const relativePath = path.relative('.', fullPath);
        
        if (shouldExclude(relativePath)) {
          return;
        }

        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.log(`⚠️ Skipping directory ${currentPath}: ${error.message}`);
    }
  }

  scanDir(dirPath);
  return files;
}

async function makeGitHubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function createRepository() {
  console.log('🔧 Creating GitHub repository...');
  
  try {
    const repoData = {
      name: REPO_NAME,
      description: 'Advanced healthcare communication and knowledge management platform with AI-powered assistance',
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true
    };

    const result = await makeGitHubRequest('https://api.github.com/user/repos', {
      method: 'POST',
      body: JSON.stringify(repoData)
    });

    console.log(`✅ Repository created: ${result.html_url}`);
    return result;
  } catch (error) {
    if (error.message.includes('422')) {
      console.log('ℹ️ Repository already exists, continuing...');
      return { html_url: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}` };
    }
    throw error;
  }
}

async function uploadFile(filePath, content) {
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${relativePath}`;

  try {
    const fileData = {
      message: `Add ${relativePath}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: 'main'
    };

    await makeGitHubRequest(url, {
      method: 'PUT',
      body: JSON.stringify(fileData)
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${relativePath}: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Creating Operabase repository...');
  console.log(`📦 Repository: ${GITHUB_USERNAME}/${REPO_NAME}`);

  try {
    // Create repository
    const repo = await createRepository();
    
    // Get essential files
    const files = getEssentialFiles();
    console.log(`📁 Found ${files.length} essential files to upload`);

    let successCount = 0;
    let failCount = 0;

    // Upload files
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative('.', filePath);
        
        console.log(`📤 Uploading: ${relativePath}`);
        const success = await uploadFile(filePath, content);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        failCount++;
      }
    }

    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} files`);
    console.log(`❌ Failed uploads: ${failCount} files`);
    console.log(`🌐 Repository: ${repo.html_url}`);
    
    if (failCount === 0) {
      console.log('🎉 Operabase repository created successfully!');
    }
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

main();