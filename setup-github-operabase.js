#!/usr/bin/env node

/**
 * Setup GitHub Repository for Operabase
 * Creates a new repository and uploads the complete application
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'caiorodrigo10';
const REPO_NAME = 'operabase';
const BRANCH = 'main';

// GitHub API URLs
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPOS_API = `${GITHUB_API_BASE}/user/repos`;
const GITHUB_CONTENTS_API = `${GITHUB_API_BASE}/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents`;

// Files and directories to exclude from upload
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  '.replit',
  'replit.nix',
  'dist',
  'build',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  'setup-github-operabase.js',
  'upload-to-github-main.js',
  'upload-batch.js',
  'upload-server.js',
  'upload-essential.js',
  'upload-domains.js',
  'complete-upload.js'
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
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

async function makeGitHubRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Operabase-Setup-Script',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

async function createRepository() {
  console.log('🔧 Creating GitHub repository...');
  
  try {
    const repoData = {
      name: REPO_NAME,
      description: 'Advanced healthcare communication and knowledge management platform with AI-powered assistance and real-time capabilities',
      private: false,
      has_issues: true,
      has_projects: true,
      has_wiki: true,
      auto_init: false
    };

    const result = await makeGitHubRequest(GITHUB_REPOS_API, {
      method: 'POST',
      body: JSON.stringify(repoData)
    });

    console.log(`✅ Repository created: ${result.html_url}`);
    return result;
  } catch (error) {
    if (error.message.includes('422')) {
      console.log('ℹ️ Repository already exists, continuing with upload...');
      return { html_url: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}` };
    }
    throw error;
  }
}

async function uploadFile(filePath, content) {
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  const url = `${GITHUB_CONTENTS_API}/${relativePath}`;

  try {
    // Check if file already exists
    let sha = null;
    try {
      const existingFile = await makeGitHubRequest(url);
      sha = existingFile.sha;
    } catch (error) {
      // File doesn't exist, which is fine
    }

    const fileData = {
      message: sha ? `Update ${relativePath}` : `Add ${relativePath}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: BRANCH
    };

    if (sha) {
      fileData.sha = sha;
    }

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

async function uploadAllFiles() {
  const allFiles = getAllFiles('.');
  console.log(`📁 Found ${allFiles.length} files to upload`);

  let successCount = 0;
  let failCount = 0;

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
      
      console.log(`📤 Uploading: ${relativePath}`);
      const success = await uploadFile(filePath, content);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      failCount++;
    }
  }

  return { successCount, failCount, total: allFiles.length };
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('ℹ️ Please set your GitHub Personal Access Token with repo permissions');
    process.exit(1);
  }

  console.log('🚀 Setting up Operabase repository on GitHub...');
  console.log(`📦 Repository: ${GITHUB_USERNAME}/${REPO_NAME}`);
  console.log(`🌿 Branch: ${BRANCH}`);

  try {
    // Step 1: Create repository
    const repo = await createRepository();
    
    // Step 2: Upload all files
    console.log('\n📂 Starting file upload...');
    const results = await uploadAllFiles();

    // Step 3: Summary
    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${results.successCount} files`);
    console.log(`❌ Failed uploads: ${results.failCount} files`);
    console.log(`📁 Total files processed: ${results.total}`);
    
    if (results.failCount === 0) {
      console.log('🎉 All files uploaded successfully!');
      console.log(`🌐 Repository URL: ${repo.html_url}`);
      console.log('📋 Next steps:');
      console.log('   1. Configure environment variables in your deployment');
      console.log('   2. Set up Supabase database');
      console.log('   3. Configure WhatsApp Evolution API');
      console.log('   4. Deploy your application');
    } else {
      console.log('⚠️ Some files failed to upload. Check the logs above.');
    }
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup script
main();