#!/usr/bin/env node

/**
 * Quick Upload - Essential Operabase Files Only
 * Uploads only the most critical files for a working repository
 */

import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'caiorodrigo10';
const REPO_NAME = 'operabase';

// Only the most essential files for a functional repository
const ESSENTIAL_TARGETS = [
  // Root files
  'README.md',
  'replit.md', 
  'drizzle.config.ts',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'tsconfig.json',
  
  // Client structure
  'client/index.html',
  'client/src/index.css',
  'client/src/App.tsx',
  'client/src/main.tsx',
  
  // Server structure  
  'server/index.ts',
  'server/vite.ts',
  'server/storage.ts',
  'server/routes.ts',
  
  // Shared
  'shared/schema.ts'
];

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
    throw new Error(`GitHub API ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function getFileSha(filePath) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
  try {
    const result = await makeGitHubRequest(url);
    return result.sha;
  } catch {
    return null;
  }
}

async function uploadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' };
  }

  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${filePath}`;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const sha = await getFileSha(filePath);
    
    const data = {
      message: sha ? `Update ${filePath}` : `Add ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      branch: 'main'
    };

    if (sha) data.sha = sha;

    await makeGitHubRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN required');
    process.exit(1);
  }

  console.log('🚀 Quick upload of essential Operabase files');
  console.log(`📦 Target: ${GITHUB_USERNAME}/${REPO_NAME}`);
  console.log(`📋 Uploading ${ESSENTIAL_TARGETS.length} essential files\n`);

  let success = 0;
  let failed = 0;

  for (const file of ESSENTIAL_TARGETS) {
    console.log(`📤 ${file}`);
    
    const result = await uploadFile(file);
    
    if (result.success) {
      success++;
      console.log(`✅ Uploaded`);
    } else {
      failed++;
      console.log(`❌ Failed: ${result.error}`);
    }
    
    // Short delay for rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n📊 Quick Upload Summary:');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🌐 Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`);
  
  if (failed === 0) {
    console.log('🎉 Essential files uploaded successfully!');
  }
}

main();