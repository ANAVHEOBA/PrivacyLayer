#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    version: '1',
    bundlePath: '',
    targetMetadataPath: '',
    targetMetadataJson: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--version') {
      options.version = argv[++i] ?? '1';
    } else if (arg === '--bundle-path') {
      options.bundlePath = argv[++i] ?? '';
    } else if (arg === '--target-metadata-path') {
      options.targetMetadataPath = argv[++i] ?? '';
    } else if (arg === '--target-metadata-json') {
      options.targetMetadataJson = argv[++i] ?? '';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log([
    'Usage:',
    '  node scripts/zk_release_preflight.mjs --version 1 --target-metadata-path pool-config.json',
    '  node scripts/zk_release_preflight.mjs --bundle-path artifacts/zk/v1/bundles/release-bundle.json --target-metadata-json "{...}"',
    '',
    'Target metadata must contain:',
    '  circuit_id, manifest_sha256, public_input_arity',
    '',
    'Optional target metadata field:',
    '  schema_version',
  ].join('\n'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveBundlePath(options) {
  if (options.bundlePath) {
    return path.isAbsolute(options.bundlePath)
      ? options.bundlePath
      : path.join(repoRoot, options.bundlePath);
  }

  return path.join(repoRoot, 'artifacts', 'zk', `v${options.version}`, 'bundles', 'release-bundle.json');
}

function loadBundle(bundlePath) {
  if (!fs.existsSync(bundlePath)) {
    fail(`Release bundle not found: ${bundlePath}`);
  }

  return readJson(bundlePath);
}

function loadTargetMetadata(options) {
  if (options.targetMetadataJson) {
    return JSON.parse(options.targetMetadataJson);
  }

  if (options.targetMetadataPath) {
    const targetPath = path.isAbsolute(options.targetMetadataPath)
      ? options.targetMetadataPath
      : path.join(repoRoot, options.targetMetadataPath);

    if (!fs.existsSync(targetPath)) {
      fail(`Target metadata file not found: ${targetPath}`);
    }

    return readJson(targetPath);
  }

  fail('Provide either --target-metadata-path or --target-metadata-json.');
}

function compareBundleToTarget(bundle, target) {
  const expected = bundle.verifier_schema ?? {};
  const contractMetadata = bundle.contract_metadata ?? {};
  const mismatches = [];

  if (target.circuit_id !== expected.circuit_id) {
    mismatches.push({ field: 'circuit_id', expected: expected.circuit_id, actual: target.circuit_id });
  }

  if (target.manifest_sha256 !== contractMetadata.manifest_sha256) {
    mismatches.push({ field: 'manifest_sha256', expected: contractMetadata.manifest_sha256, actual: target.manifest_sha256 });
  }

  if (target.public_input_arity !== expected.contract_public_input_arity) {
    mismatches.push({ field: 'public_input_arity', expected: expected.contract_public_input_arity, actual: target.public_input_arity });
  }

  if (
    typeof target.schema_version === 'number' &&
    target.schema_version !== expected.schema_version
  ) {
    mismatches.push({ field: 'schema_version', expected: expected.schema_version, actual: target.schema_version });
  }

  return mismatches;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const bundlePath = resolveBundlePath(options);
  const bundle = loadBundle(bundlePath);
  const target = loadTargetMetadata(options);

  const mismatches = compareBundleToTarget(bundle, target);
  console.log(`Release bundle: ${bundlePath}`);
  console.log(`Target circuit: ${target.circuit_id}`);

  if (mismatches.length > 0) {
    console.error('Release preflight failed:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch.field}: expected ${mismatch.expected}, got ${mismatch.actual}`);
    }
    process.exit(1);
  }

  console.log('Release preflight passed.');
}

main();
