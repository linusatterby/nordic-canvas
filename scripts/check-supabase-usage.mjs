#!/usr/bin/env node

/**
 * Supabase Direct Usage Check
 * 
 * Scans src/ for direct supabase client usage outside allowed locations.
 * Run: node scripts/check-supabase-usage.mjs
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

const SRC_DIR = 'src';

// Allowed patterns (relative to src/)
const WHITELIST = [
  'lib/api/',
  'lib/supabase/',
  'hooks/useSession.ts',
  'hooks/useScheduler.ts',
  'hooks/useDemoGuideSummary.ts',
  'contexts/AuthContext.tsx',
  'integrations/supabase/',
];

// Patterns to detect
const VIOLATION_PATTERNS = [
  /supabase\.from\s*\(/,
  /from\s+["']@\/integrations\/supabase\/client["']/,
  /from\s+["']\.\.?\/.*supabase\/client["']/,
];

async function getAllFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await getAllFiles(fullPath, files);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function isWhitelisted(filePath) {
  const relativePath = relative(SRC_DIR, filePath);
  return WHITELIST.some(pattern => relativePath.startsWith(pattern));
}

async function checkFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const violations = [];
  
  for (const pattern of VIOLATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(pattern.source);
    }
  }
  
  return violations;
}

async function main() {
  console.log('🔍 Scanning for direct Supabase usage...\n');
  
  const files = await getAllFiles(SRC_DIR);
  const violations = [];
  
  for (const file of files) {
    if (isWhitelisted(file)) continue;
    
    const fileViolations = await checkFile(file);
    if (fileViolations.length > 0) {
      violations.push({
        file: relative('.', file),
        patterns: fileViolations,
      });
    }
  }
  
  if (violations.length === 0) {
    console.log('✅ OK - No violations found\n');
    console.log('All Supabase access is properly centralized in:');
    console.log('  - src/lib/api/*');
    console.log('  - src/hooks/* (whitelisted)');
    console.log('  - src/contexts/AuthContext.tsx');
    process.exit(0);
  }
  
  console.log('❌ VIOLATIONS FOUND\n');
  console.log('The following files have direct Supabase usage:\n');
  
  for (const v of violations) {
    console.log(`  ${v.file}`);
    for (const p of v.patterns) {
      console.log(`    - Pattern: ${p}`);
    }
  }
  
  console.log('\n📖 See src/PROJECT_RULES.md for proper data access patterns.');
  console.log('Move Supabase calls to src/lib/api/* and use hooks.\n');
  
  process.exit(1);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
