#!/usr/bin/env node

/**
 * Script to merge tested features from development to production
 * This script helps manage database migrations and environment variables
 */

const fs = require('fs');
const path = require('path');

const ENV_DEV = '.env.development';
const ENV_PROD = '.env.production';
const ENV_EXAMPLE = '.env.example';

console.log('🚀 Starting Dev to Prod Merge Process...\n');

// Check if environment files exist
if (!fs.existsSync(ENV_DEV)) {
  console.error('❌ .env.development file not found!');
  process.exit(1);
}

if (!fs.existsSync(ENV_PROD)) {
  console.warn('⚠️  .env.production file not found. Creating from .env.development...');
  fs.copyFileSync(ENV_DEV, ENV_PROD);
  console.log('✅ Created .env.production\n');
}

// Read environment files
const devEnv = fs.readFileSync(ENV_DEV, 'utf8');
const prodEnv = fs.readFileSync(ENV_PROD, 'utf8');

console.log('📋 Environment files loaded\n');

// Parse environment variables
function parseEnv(envContent) {
  const vars = {};
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  return vars;
}

const devVars = parseEnv(devEnv);
const prodVars = parseEnv(prodEnv);

// Compare and show differences
console.log('🔍 Comparing environments...\n');

const differences = [];
Object.keys(devVars).forEach(key => {
  if (key.startsWith('NEXT_PUBLIC_') || key === 'NODE_ENV') {
    // Public vars and NODE_ENV should match
    if (devVars[key] !== prodVars[key]) {
      differences.push({ key, dev: devVars[key], prod: prodVars[key] });
    }
  } else if (!prodVars[key]) {
    differences.push({ key, dev: devVars[key], prod: 'MISSING' });
  }
});

if (differences.length > 0) {
  console.log('⚠️  Found differences:\n');
  differences.forEach(diff => {
    console.log(`  ${diff.key}:`);
    console.log(`    Dev:  ${diff.dev}`);
    console.log(`    Prod: ${diff.prod}\n`);
  });
} else {
  console.log('✅ No significant differences found\n');
}

console.log('📝 Next steps:');
console.log('  1. Review database migrations in supabase/migrations/');
console.log('  2. Apply migrations to production Supabase project');
console.log('  3. Update production environment variables if needed');
console.log('  4. Test production deployment');
console.log('  5. Monitor for any issues\n');

console.log('✅ Merge process completed!\n');

