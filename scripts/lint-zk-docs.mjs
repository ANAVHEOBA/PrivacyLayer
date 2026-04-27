#!/usr/bin/env node

/**
 * ZK-109: Lint Script for Stale Public-Input Counts and Nullifier Semantics
 * 
 * This script checks docs, comments, and tests for stale information about:
 * - Public-input counts (should match current schema)
 * - Field order in withdrawal schemas
 * - Pool-scoped vs root-scoped nullifier semantics
 * 
 * It ensures documentation drift gets caught closer to the change that introduced it.
 * 
 * Usage:
 *   node scripts/lint-zk-docs.mjs
 *   node scripts/lint-zk-docs.mjs --fix (future enhancement)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Canonical facts that tend to drift
const CANONICAL_FACTS = {
  // Current public input count (encoding.ts and public_inputs.ts should match)
  publicInputCount: 7, // pool_id, root, nullifier_hash, recipient, amount, relayer, fee
  publicInputCountWithDenomination: 8, // includes denomination (ZK-030)
  
  // Canonical field order (from circuits/withdraw/src/main.nr)
  publicInputOrder: [
    'pool_id',
    'root',
    'nullifier_hash',
    'recipient',
    'amount',
    'relayer',
    'fee',
  ],
  
  // Nullifier semantics: pool-scoped (ZK-035), not root-scoped
  nullifierSemantics: 'pool-scoped',
  nullifierHashFormula: 'H(DOMAIN, nullifier, pool_id)',
  
  // Contract verifier input count (subset of full schema)
  contractVerifierInputCount: 6, // root, nullifier_hash, recipient, amount, relayer, fee
};

// Files to check for stale information
const FILES_TO_CHECK = [
  'README.md',
  'sdk/src/encoding.ts',
  'sdk/src/public_inputs.ts',
  'circuits/TEST_VECTORS.md',
  'ops/github/waves/zk-wave-1.mjs',
];

// Patterns that indicate stale information
const STALE_PATTERNS = [
  // Old root-scoped nullifier references
  {
    pattern: /root.?scoped.*nullifier|nullifier.*root.?scoped/i,
    message: 'Found reference to root-scoped nullifier. Should be pool-scoped (ZK-035).',
    severity: 'error',
  },
  {
    pattern: /H\(.*nullifier.*root\)/i,
    message: 'Found nullifier hash formula using root. Should use pool_id: H(DOMAIN, nullifier, pool_id)',
    severity: 'error',
  },
  // Incorrect public input counts (check for specific numbers in comments)
  {
    pattern: /public.?(input|input?s).*(?:count|number|are)\s*6\b/i,
    message: 'Found reference to 6 public inputs. Current count is 7 (or 8 with denomination).',
    severity: 'warning',
  },
  {
    pattern: /public.?(input|input?s).*(?:count|number|are)\s*5\b/i,
    message: 'Found reference to 5 public inputs. Current count is 7 (or 8 with denomination).',
    severity: 'error',
  },
];

function checkFile(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    return {
      file: filePath,
      status: 'missing',
      issues: [`File not found: ${absolutePath}`],
    };
  }
  
  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  // Check for stale patterns
  for (const { pattern, message, severity } of STALE_PATTERNS) {
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        matches.push({ line: i + 1, content: lines[i].trim() });
      }
    }
    
    for (const match of matches) {
      issues.push({
        severity,
        message,
        line: match.line,
        content: match.content,
      });
    }
  }
  
  // Check for outdated comments about nullifier semantics
  if (filePath.includes('encoding.ts') || filePath.includes('public_inputs.ts')) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for comments mentioning nullifier hash computation
      if (line.includes('//') && line.toLowerCase().includes('nullifier') && line.toLowerCase().includes('root')) {
        // Verify it's not describing the old root-bound approach incorrectly
        if (line.includes('root-bound') || line.includes('root-scoped')) {
          issues.push({
            severity: 'error',
            message: 'Comment references root-bound/root-scoped nullifier. Should be pool-scoped (ZK-035).',
            line: i + 1,
            content: line.trim(),
          });
        }
      }
    }
  }
  
  // Check public input schema declarations in code files
  if (filePath.endsWith('.ts')) {
    let inSchemaDeclaration = false;
    let schemaFields = [];
    let schemaStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect WITHDRAWAL_PUBLIC_INPUT_SCHEMA declarations
      if (line.includes('WITHDRAWAL_PUBLIC_INPUT_SCHEMA') && line.includes('[')) {
        inSchemaDeclaration = true;
        schemaFields = [];
        schemaStartLine = i + 1;
      }
      
      if (inSchemaDeclaration) {
        // Extract field names from the schema
        const fieldMatch = line.match(/'([^']+)'/);
        if (fieldMatch) {
          schemaFields.push(fieldMatch[1]);
        }
        
        // End of declaration
        if (line.includes(']') && line.includes('as const')) {
          inSchemaDeclaration = false;
          
          // Validate the schema
          if (schemaFields.length > 0) {
            const expectedFields = CANONICAL_FACTS.publicInputOrder;
            
            // Check if denomination is included
            const hasDenomination = schemaFields.includes('denomination');
            const expectedLength = hasDenomination 
              ? CANONICAL_FACTS.publicInputCountWithDenomination 
              : CANONICAL_FACTS.publicInputCount;
            
            if (schemaFields.length !== expectedLength) {
              issues.push({
                severity: 'error',
                message: `Schema has ${schemaFields.length} fields, expected ${expectedLength}.`,
                line: schemaStartLine,
                content: `Schema fields: ${schemaFields.join(', ')}`,
              });
            }
            
            // Check field order
            for (let j = 0; j < Math.min(expectedFields.length, schemaFields.length); j++) {
              if (schemaFields[j] !== expectedFields[j]) {
                issues.push({
                  severity: 'error',
                  message: `Field order mismatch at position ${j}: expected '${expectedFields[j]}', got '${schemaFields[j]}'.`,
                  line: schemaStartLine + j,
                  content: schemaFields[j],
                });
              }
            }
          }
        }
      }
    }
  }
  
  return {
    file: filePath,
    status: issues.length === 0 ? 'pass' : 'fail',
    issues,
  };
}

function formatResults(results) {
  let output = '\n';
  output += '='.repeat(80) + '\n';
  output += 'ZK-109: Public-Input and Nullifier Semantics Lint Report\n';
  output += '='.repeat(80) + '\n\n';
  
  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  
  for (const result of results) {
    output += `File: ${result.file}\n`;
    output += `Status: ${result.status.toUpperCase()}\n`;
    
    if (result.status === 'missing') {
      output += `  ⚠ ${result.issues[0]}\n`;
    } else if (result.issues.length > 0) {
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
        output += `  ${icon} [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}\n`;
        output += `     ${issue.content}\n`;
        
        totalIssues++;
        if (issue.severity === 'error') errorCount++;
        else warningCount++;
      }
    } else {
      output += '  ✅ No issues found\n';
    }
    
    output += '\n';
  }
  
  output += '-'.repeat(80) + '\n';
  output += `Summary: ${totalIssues} issues (${errorCount} errors, ${warningCount} warnings)\n`;
  output += '-'.repeat(80) + '\n';
  
  return { output, totalIssues, errorCount, warningCount };
}

function main() {
  console.log('Running ZK-109: Public-Input and Nullifier Semantics Lint...');
  
  const results = FILES_TO_CHECK.map(checkFile);
  const { output, totalIssues, errorCount } = formatResults(results);
  
  console.log(output);
  
  if (errorCount > 0) {
    console.error(`❌ Lint failed with ${errorCount} error(s). Please fix stale documentation.`);
    process.exit(1);
  } else {
    console.log('✅ All checks passed. No stale documentation detected.');
    process.exit(0);
  }
}

main();
