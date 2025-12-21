#!/usr/bin/env node

/**
 * Auto-increment version script
 * This script increments the patch version (1.0.0 -> 1.0.1) in package.json
 * Run this script before every git push to automatically bump the version
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Parse current version
  const versionParts = packageJson.version.split('.');
  const major = parseInt(versionParts[0]) || 1;
  const minor = parseInt(versionParts[1]) || 0;
  const patch = parseInt(versionParts[2]) || 0;
  
  // Increment patch version
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  // Update version
  packageJson.version = newVersion;
  
  // Write back to package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  
  console.log(`✅ Version updated: ${packageJson.version} -> ${newVersion}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Error updating version:', error);
  process.exit(1);
}

