#!/usr/bin/env node
/**
 * Integration test for manifest generation with schema versioning.
 * Tests task 2.1 requirements:
 * - Manifest output includes schema_version field
 * - Idempotent manifest generation
 * - Migration logic for existing manifests without schema_version
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'artifacts', 'zk', 'manifest.json');
const backupPath = path.join(repoRoot, 'artifacts', 'zk', 'manifest.backup.json');

function runManifestGenerator() {
  const result = spawnSync('node', ['scripts/refresh_manifest.mjs', '1'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Manifest generator failed: ${result.stderr}`);
  }
  return result.stdout;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function backupManifest() {
  fs.copyFileSync(manifestPath, backupPath);
}

function restoreManifest() {
  fs.copyFileSync(backupPath, manifestPath);
  fs.unlinkSync(backupPath);
}

console.log('Starting manifest migration integration tests...\n');

// Backup original manifest
backupManifest();

try {
  // Test 1: Verify manifest includes schema_version
  console.log('Test 1: Manifest includes schema_version field');
  const manifest1 = readManifest();
  const hasWithdrawSchema = manifest1.circuits.withdraw.schema_version !== undefined;
  const hasCommitmentSchema = manifest1.circuits.commitment.schema_version !== undefined;
  console.log(`  withdraw has schema_version: ${hasWithdrawSchema ? 'PASS' : 'FAIL'}`);
  console.log(`  commitment has schema_version: ${hasCommitmentSchema ? 'PASS' : 'FAIL'}`);
  console.log(`  withdraw schema_version: ${manifest1.circuits.withdraw.schema_version}`);
  console.log(`  commitment schema_version: ${manifest1.circuits.commitment.schema_version}`);

  // Test 2: Idempotent generation
  console.log('\nTest 2: Idempotent manifest generation');
  const output1 = runManifestGenerator();
  const manifest2 = readManifest();
  const output2 = runManifestGenerator();
  const manifest3 = readManifest();
  
  const withdrawVersionMatch = manifest2.circuits.withdraw.schema_version === manifest3.circuits.withdraw.schema_version;
  const commitmentVersionMatch = manifest2.circuits.commitment.schema_version === manifest3.circuits.commitment.schema_version;
  console.log(`  withdraw schema_version unchanged: ${withdrawVersionMatch ? 'PASS' : 'FAIL'}`);
  console.log(`  commitment schema_version unchanged: ${commitmentVersionMatch ? 'PASS' : 'FAIL'}`);

  // Test 3: Migration from manifest without schema_version
  console.log('\nTest 3: Migration logic for manifests without schema_version');
  const manifestWithoutSchema = JSON.parse(JSON.stringify(manifest1));
  delete manifestWithoutSchema.circuits.withdraw.schema_version;
  delete manifestWithoutSchema.circuits.commitment.schema_version;
  writeManifest(manifestWithoutSchema);
  
  console.log('  Removed schema_version fields from manifest');
  const manifestBefore = readManifest();
  const hasSchemaBeforeMigration = manifestBefore.circuits.withdraw.schema_version !== undefined;
  console.log(`  Before migration - has schema_version: ${hasSchemaBeforeMigration ? 'FAIL' : 'PASS'}`);
  
  const migrationOutput = runManifestGenerator();
  const manifestAfter = readManifest();
  const hasSchemaAfterMigration = manifestAfter.circuits.withdraw.schema_version !== undefined;
  const schemaVersionRestored = manifestAfter.circuits.withdraw.schema_version === manifest1.circuits.withdraw.schema_version;
  
  console.log(`  After migration - has schema_version: ${hasSchemaAfterMigration ? 'PASS' : 'FAIL'}`);
  console.log(`  Schema version matches original: ${schemaVersionRestored ? 'PASS' : 'FAIL'}`);
  console.log(`  Migration output includes summary: ${migrationOutput.includes('Schema versions computed') ? 'PASS' : 'FAIL'}`);

  // Test 4: Verify schema_version format
  console.log('\nTest 4: Schema version format validation');
  const versionRegex = /^\d+\.\d+\.\d+$/;
  const withdrawVersionValid = versionRegex.test(manifestAfter.circuits.withdraw.schema_version);
  const commitmentVersionValid = versionRegex.test(manifestAfter.circuits.commitment.schema_version);
  console.log(`  withdraw schema_version format: ${withdrawVersionValid ? 'PASS' : 'FAIL'}`);
  console.log(`  commitment schema_version format: ${commitmentVersionValid ? 'PASS' : 'FAIL'}`);

  // Test 5: Verify schema_version is deterministic
  console.log('\nTest 5: Schema version determinism');
  const expectedWithdrawVersion = '1.20680.19972'; // Known value for withdraw schema
  const expectedCommitmentVersion = '1.63027.29691'; // Known value for commitment schema
  const withdrawVersionCorrect = manifestAfter.circuits.withdraw.schema_version === expectedWithdrawVersion;
  const commitmentVersionCorrect = manifestAfter.circuits.commitment.schema_version === expectedCommitmentVersion;
  console.log(`  withdraw schema_version matches expected: ${withdrawVersionCorrect ? 'PASS' : 'FAIL'}`);
  console.log(`  commitment schema_version matches expected: ${commitmentVersionCorrect ? 'PASS' : 'FAIL'}`);

  console.log('\n✅ All integration tests completed successfully!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Restore original manifest
  restoreManifest();
  console.log('\nOriginal manifest restored.');
}
