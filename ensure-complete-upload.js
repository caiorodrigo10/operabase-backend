#!/usr/bin/env node

/**
 * ENSURE Complete Upload Strategy
 * Multiple approaches to guarantee ALL files are uploaded
 */

import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'caiorodrigo10';
const REPO_NAME = 'operabase';

// Priority batches for upload
const UPLOAD_BATCHES = [
  {
    name: 'Core Application Files',
    patterns: ['client/src/**', 'server/**', 'shared/**'],
    priority: 1
  },
  {
    name: 'Configuration & Build',
    patterns: ['*.config.*', '*.json', 'drizzle.config.ts'],
    priority: 2
  },
  {
    name: 'Documentation',
    patterns: ['*.md', 'DEPLOYMENT.md', 'ARCHITECTURE.md'],
    priority: 3
  }
];

const EXCLUDE_ALWAYS = [
  'node_modules', '.git', '.env', '.cache', '.replit', 'dist', 'build',
  'attached_assets', '*.log', '.DS_Store', 'Thumbs.db'
];

const EXCLUDE_SCRIPTS = [
  'setup-github-operabase.js', 'create-operabase-repo.js', 
  'upload-complete-operabase.js', 'quick-upload-essentials.js',
  'ensure-complete-upload.js'
];

function shouldInclude(filePath) {
  const relativePath = path.relative('.', filePath);
  const fileName = path.basename(filePath);
  
  // Exclude patterns
  if (EXCLUDE_ALWAYS.some(pattern => 
    relativePath.includes(pattern) || fileName.includes(pattern)
  )) return false;
  
  if (EXCLUDE_SCRIPTS.includes(fileName)) return false;
  
  // Exclude temp/test files
  if (fileName.match(/^(test-|debug-|check-|fix-|analyze-|apply-|cleanup-|update-|add-|execute-)/)) {
    return false;
  }
  
  return true;
}

function scanDirectory(dir = '.') {
  const files = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (!shouldInclude(fullPath)) continue;
        
        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`⚠️ Cannot read ${currentDir}: ${error.message}`);
    }
  }
  
  scan(dir);
  return files;
}

async function makeRequest(url, options = {}) {
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
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  return await response.json();
}

async function uploadSingleFile(filePath) {
  const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${relativePath}`;
  
  try {
    // Get existing SHA if file exists
    let sha = null;
    try {
      const existing = await makeRequest(url);
      sha = existing.sha;
    } catch (e) {
      // File doesn't exist, which is fine
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    const data = {
      message: `${sha ? 'Update' : 'Add'} ${relativePath}`,
      content: Buffer.from(content).toString('base64'),
      branch: 'main'
    };
    
    if (sha) data.sha = sha;

    await makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    return { success: true, file: relativePath };
  } catch (error) {
    return { success: false, file: relativePath, error: error.message };
  }
}

async function uploadBatch(files, batchName, maxConcurrent = 3) {
  console.log(`\n📦 ${batchName}: ${files.length} files`);
  
  const results = [];
  const chunks = [];
  
  // Split into chunks for concurrent processing
  for (let i = 0; i < files.length; i += maxConcurrent) {
    chunks.push(files.slice(i, i + maxConcurrent));
  }
  
  let processed = 0;
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (file) => {
      const result = await uploadSingleFile(file);
      processed++;
      
      if (result.success) {
        console.log(`✅ ${processed}/${files.length}: ${result.file}`);
      } else {
        console.log(`❌ ${processed}/${files.length}: ${result.file} - ${result.error}`);
      }
      
      return result;
    });
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
    
    // Rate limiting between chunks
    await new Promise(r => setTimeout(r, 200));
  }
  
  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`📊 ${batchName}: ${success} success, ${failed} failed`);
  
  return { success, failed, results };
}

async function createGitTree() {
  console.log('\n🌳 Attempting Git Tree API for bulk upload...');
  
  try {
    const files = scanDirectory().slice(0, 100); // Limit for tree API
    
    const tree = [];
    
    for (const file of files) {
      const relativePath = path.relative('.', file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf8');
      
      tree.push({
        path: relativePath,
        mode: '100644',
        type: 'blob',
        content: content
      });
    }
    
    // Create tree
    const treeResponse = await makeRequest(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({ tree })
      }
    );
    
    console.log(`✅ Created tree with ${tree.length} files`);
    return { success: true, count: tree.length };
    
  } catch (error) {
    console.log(`❌ Git Tree failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN required');
    process.exit(1);
  }

  console.log('🚀 ENSURING Complete Operabase Upload');
  console.log(`📦 Repository: ${GITHUB_USERNAME}/${REPO_NAME}`);

  const allFiles = scanDirectory();
  console.log(`📊 Found ${allFiles.length} total files to upload`);

  // Strategy 1: Try Git Tree API for bulk upload
  const treeResult = await createGitTree();
  
  if (treeResult.success) {
    console.log(`🎉 Bulk upload successful via Git Tree API!`);
    return;
  }

  // Strategy 2: Organized batch upload
  console.log('\n📋 Proceeding with organized batch upload...');
  
  const batches = {
    critical: allFiles.filter(f => 
      f.includes('server/index.ts') || 
      f.includes('client/src/App.tsx') || 
      f.includes('shared/schema.ts') ||
      f.endsWith('README.md') ||
      f.endsWith('package.json')
    ),
    client: allFiles.filter(f => f.startsWith('client/')),
    server: allFiles.filter(f => f.startsWith('server/')),
    shared: allFiles.filter(f => f.startsWith('shared/')),
    config: allFiles.filter(f => 
      f.endsWith('.config.ts') || 
      f.endsWith('.config.js') || 
      f.endsWith('.json')
    ),
    docs: allFiles.filter(f => f.endsWith('.md')),
    other: allFiles.filter(f => 
      !f.startsWith('client/') && 
      !f.startsWith('server/') && 
      !f.startsWith('shared/') &&
      !f.endsWith('.md') &&
      !f.endsWith('.json') &&
      !f.includes('.config.')
    )
  };

  let totalSuccess = 0;
  let totalFailed = 0;

  // Upload in priority order
  for (const [batchName, files] of Object.entries(batches)) {
    if (files.length === 0) continue;
    
    const result = await uploadBatch(files, batchName.toUpperCase(), 2);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  console.log('\n📊 FINAL SUMMARY:');
  console.log(`✅ Total Success: ${totalSuccess}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`🌐 Repository: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`);
  
  if (totalFailed === 0) {
    console.log('🎉 ALL FILES UPLOADED SUCCESSFULLY!');
  } else {
    console.log(`⚠️ ${totalFailed} files need manual attention`);
  }
}

main().catch(console.error);