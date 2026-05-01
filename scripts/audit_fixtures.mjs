/**
 * Fixture Privacy Audit Guard (ZK-112)
 *
 * Lightweight checks to prevent obviously sensitive fixture content
 * from being committed to the repository.
 *
 * Usage:
 *   node scripts/audit_fixtures.mjs
 *
 * This script scans test fixtures for:
 * - Realistic-looking Stellar addresses (G-strkeys)
 * - Non-synthetic nullifier/secret patterns
 * - Note backup strings with real prefixes
 * - Address metadata that could leak user information
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, '..');
const TEST_DIR = join(ROOT_DIR, 'sdk', 'test');
const CIRCUITS_DIR = join(ROOT_DIR, 'circuits');

// Patterns that indicate REAL (not synthetic) data
const SUSPICIOUS_PATTERNS = [
  // Real Stellar G-strkeys start with 'G' and are 56 chars
  { pattern: /G[A-Z2-7]{55}/, label: 'Realistic Stellar G-strkey address' },
  
  // Note backup strings (privacylayer-note: prefix with long hex payload)
  { pattern: /privacylayer-note:[0-9a-fA-F]{200,}/, label: 'Full note backup string' },
  
  // Non-synthetic nullifiers (not using simple patterns like 0x01, 0x02, etc.)
  // This catches random-looking 31-byte hex values that don't follow test patterns
  { pattern: /"nullifier_hex"\s*:\s*"(?!0{60,}[0-9a-f]{2,})[0-9a-fA-F]{62}"/, label: 'Non-synthetic nullifier hex' },
  { pattern: /"secret_hex"\s*:\s*"(?!0{60,}[0-9a-f]{2,})[0-9a-fA-F]{62}"/, label: 'Non-synthetic secret hex' },
  
  // Real-looking private keys or seed phrases (should NEVER be in fixtures)
  { pattern: /(?:private[_-]?key|secret[_-]?key|mnemonic|seed[_-]?phrase)\s*[:=]\s*["'][^"']{20,}["']/i, label: 'Private key or seed phrase' },
];

// Test data patterns that are ACCEPTABLE (synthetic)
const ACCEPTABLE_PATTERNS = [
  /^0{60,}[0-9a-f]{1,4}$/i,  // Simple incrementing test values
  /^(0011|1111|2222|3333|aabb|dead|cafe)[0-9a-f]{56,}$/i,  // Repetitive test patterns
  /^[0-9a-f]{64}$/,  // Generic 32-byte hex (acceptable in test context)
];

function isSyntheticHex(hex) {
  return ACCEPTABLE_PATTERNS.some(pattern => pattern.test(hex));
}

function scanFile(filePath) {
  const issues = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        // Find line number
        const matchIndex = content.indexOf(matches[0]);
        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        
        // Additional validation: check if it's actually synthetic
        if (label.includes('nullifier') || label.includes('secret')) {
          const hexValue = matches[0].match(/"([0-9a-fA-F]+)"/)?.[1];
          if (hexValue && isSyntheticHex(hexValue)) {
            continue; // Acceptable synthetic pattern
          }
        }
        
        issues.push({
          file: filePath,
          line: lineNumber,
          label,
          match: matches[0].slice(0, 100),
        });
      }
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  
  return issues;
}

function scanDirectory(dir, extensions = ['.json', '.ts', '.nr']) {
  const allIssues = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        allIssues.push(...scanDirectory(fullPath, extensions));
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        allIssues.push(...scanFile(fullPath));
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err.message);
  }
  
  return allIssues;
}

function main() {
  console.log('🔍 ZK-112: Fixture Privacy Audit\n');
  
  const allIssues = [];
  
  // Scan SDK test directory
  console.log(`Scanning ${TEST_DIR}...`);
  allIssues.push(...scanDirectory(TEST_DIR));
  
  // Scan circuits directory for test vectors
  console.log(`Scanning ${CIRCUITS_DIR}...`);
  allIssues.push(...scanDirectory(CIRCUITS_DIR));
  
  if (allIssues.length === 0) {
    console.log('\n✅ No suspicious fixture content detected.');
    console.log('All test data appears to be synthetic or properly redacted.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Found potential privacy issues in fixtures:\n');
    
    for (const issue of allIssues) {
      console.log(`📁 ${issue.file}:${issue.line}`);
      console.log(`   Type: ${issue.label}`);
      console.log(`   Match: ${issue.match}...`);
      console.log('');
    }
    
    console.log('❌ Fixture audit failed. Review and fix the issues above.');
    console.log('   - Replace real addresses with synthetic test values');
    console.log('   - Remove any note backup strings from fixtures');
    console.log('   - Ensure nullifiers and secrets use predictable test patterns\n');
    process.exit(1);
  }
}

main();
