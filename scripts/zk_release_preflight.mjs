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
    benchmarkCurrentPath: '',
    benchmarkBaselinePath: '',
    benchmarkOutputPath: '',
    benchmarkThresholdsJson: '',
    rotationRecordPath: '',
    rotationBundlePath: '',
    rotationLogPath: '',
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
    } else if (arg === '--benchmark-current-path') {
      options.benchmarkCurrentPath = argv[++i] ?? '';
    } else if (arg === '--benchmark-baseline-path') {
      options.benchmarkBaselinePath = argv[++i] ?? '';
    } else if (arg === '--benchmark-output-path') {
      options.benchmarkOutputPath = argv[++i] ?? '';
    } else if (arg === '--benchmark-thresholds-json') {
      options.benchmarkThresholdsJson = argv[++i] ?? '';
    } else if (arg === '--rotation-record-path') {
      options.rotationRecordPath = argv[++i] ?? '';
    } else if (arg === '--rotation-bundle-path') {
      options.rotationBundlePath = argv[++i] ?? '';
    } else if (arg === '--rotation-log-path') {
      options.rotationLogPath = argv[++i] ?? '';
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
    '  node scripts/zk_release_preflight.mjs --benchmark-current-path current.json --benchmark-baseline-path artifacts/zk/v1/bundles/benchmark-baselines.json',
    '  node scripts/zk_release_preflight.mjs --rotation-record-path rotation.json --rotation-bundle-path artifacts/zk/v1/bundles/rotation-evidence/<pool>/rotation-bundle.json --rotation-log-path artifacts/zk/v1/bundles/rotation-evidence/<pool>/rotation-log.md',
    '',
    'Target metadata must contain:',
    '  circuit_id, manifest_sha256, public_input_arity',
    '',
    'Optional target metadata field:',
    '  schema_version',
    '',
    'Benchmark thresholds may be supplied as JSON with keys:',
    '  witnessPreparationMs, proofGenerationMs, totalMs, memoryUsedMB, peakMemoryMB, proofSizeBytes, proofsPerSecond',
  ].join('\n'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolvePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(repoRoot, inputPath);
}

function resolveBundlePath(options) {
  if (options.bundlePath) {
    return resolvePath(options.bundlePath);
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
    const targetPath = resolvePath(options.targetMetadataPath);

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

  if (typeof target.schema_version === 'number' && target.schema_version !== expected.schema_version) {
    mismatches.push({ field: 'schema_version', expected: expected.schema_version, actual: target.schema_version });
  }

  return mismatches;
}

function benchmarkKey(record) {
  return [record.artifactVersion, record.backendName, record.runtime, record.scenario].join('::');
}

function loadBenchmarkArchive(filePath) {
  const payload = readJson(filePath);

  if (payload && typeof payload === 'object') {
    if (payload.baselines && typeof payload.baselines === 'object') {
      return {
        schemaVersion: payload.schemaVersion ?? 1,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
        baselines: payload.baselines,
      };
    }

    if (Array.isArray(payload.records)) {
      return {
        schemaVersion: payload.schemaVersion ?? 1,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
        baselines: Object.fromEntries(payload.records.map((record) => [benchmarkKey(record), record])),
      };
    }

    if (payload.artifactVersion && payload.backendName && payload.runtime && payload.scenario) {
      return {
        schemaVersion: payload.schemaVersion ?? 1,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
        baselines: { [benchmarkKey(payload)]: payload },
      };
    }
  }

  fail(`Unrecognized benchmark archive format: ${filePath}`);
}

function normalizeThresholds(input) {
  return {
    witnessPreparationMs: input?.witnessPreparationMs ?? 0.1,
    proofGenerationMs: input?.proofGenerationMs ?? 0.1,
    totalMs: input?.totalMs ?? 0.1,
    memoryUsedMB: input?.memoryUsedMB ?? 0.1,
    peakMemoryMB: input?.peakMemoryMB ?? 0.1,
    proofSizeBytes: input?.proofSizeBytes ?? 0,
    proofsPerSecond: input?.proofsPerSecond ?? 0.1,
  };
}

function relativeChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : 1;
  }

  return (current - previous) / previous;
}

function compareBenchmarks(currentArchive, baselineArchive, thresholds) {
  const failures = [];
  const lines = [];
  const thresholdSet = normalizeThresholds(thresholds);

  for (const [key, current] of Object.entries(currentArchive.baselines)) {
    const previous = baselineArchive.baselines[key];
    if (!previous) {
      failures.push(`Missing baseline for ${key}`);
      continue;
    }

    const proofGenerationChange = relativeChange(current.metrics.proofGenerationMs.mean, previous.metrics.proofGenerationMs.mean);
    const memoryChange = relativeChange(current.metrics.memoryUsedMB.mean, previous.metrics.memoryUsedMB.mean);
    const totalChange = relativeChange(current.metrics.totalMs.mean, previous.metrics.totalMs.mean);
    const peakMemoryChange = relativeChange(current.metrics.peakMemoryMB.mean, previous.metrics.peakMemoryMB.mean);
    const proofSizeChange = relativeChange(current.metrics.proofSizeBytes.mean, previous.metrics.proofSizeBytes.mean);
    const throughputChange = relativeChange(current.metrics.proofsPerSecond.mean, previous.metrics.proofsPerSecond.mean);
    const witnessChange = relativeChange(current.metrics.witnessPreparationMs.mean, previous.metrics.witnessPreparationMs.mean);

    const hasRegression =
      proofGenerationChange > thresholdSet.proofGenerationMs ||
      memoryChange > thresholdSet.memoryUsedMB ||
      totalChange > thresholdSet.totalMs ||
      peakMemoryChange > thresholdSet.peakMemoryMB ||
      proofSizeChange > thresholdSet.proofSizeBytes ||
      witnessChange > thresholdSet.witnessPreparationMs ||
      throughputChange < -thresholdSet.proofsPerSecond;

    lines.push([
      `Benchmark: ${key}`,
      `  proofGenerationMs: ${(proofGenerationChange * 100).toFixed(2)}%`,
      `  memoryUsedMB: ${(memoryChange * 100).toFixed(2)}%`,
      `  totalMs: ${(totalChange * 100).toFixed(2)}%`,
      `  peakMemoryMB: ${(peakMemoryChange * 100).toFixed(2)}%`,
      `  proofSizeBytes: ${(proofSizeChange * 100).toFixed(2)}%`,
      `  proofsPerSecond: ${(throughputChange * 100).toFixed(2)}%`,
      `  witnessPreparationMs: ${(witnessChange * 100).toFixed(2)}%`,
      `  threshold: ${JSON.stringify(thresholdSet)}`,
      `  regression: ${hasRegression ? 'YES' : 'NO'}`,
    ].join('\n'));

    if (hasRegression) {
      failures.push(`Regression detected for ${key}`);
    }
  }

  return { failures, lines };
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function normalizeRotationRecords(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && Array.isArray(value.rotations)) {
    return value.rotations;
  }

  if (value && typeof value === 'object') {
    return [value];
  }

  fail('Rotation record payload must be an object or an array of objects.');
}

function loadRotationArchive(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      rotations: [],
    };
  }

  const payload = readJson(filePath);
  if (payload && typeof payload === 'object' && Array.isArray(payload.rotations)) {
    return {
      schemaVersion: payload.schemaVersion ?? 1,
      generatedAt: payload.generatedAt ?? new Date().toISOString(),
      rotations: payload.rotations,
    };
  }

  if (Array.isArray(payload)) {
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      rotations: payload,
    };
  }

  fail(`Unrecognized rotation archive format: ${filePath}`);
}

function appendRotationLog(logPath, records) {
  const exists = fs.existsSync(logPath);
  const header = [
    '# VK Rotation Log',
    '',
    '| Timestamp | Pool ID | Circuit ID | Schema Version | Old VK SHA-256 | New VK SHA-256 | Manifest SHA-256 | Operator | Release Bundle |',
    '|---|---|---|---|---|---|---|---|---|',
  ].join('\n');

  const lines = records.map((record) => [
    `| ${record.recordedAt} | ${record.poolId} | ${record.circuitId} | ${record.schemaVersion} | ${record.oldVkSha256} | ${record.newVkSha256} | ${record.manifestSha256} | ${record.operatorIdentity} | ${record.releaseBundlePath} |`,
  ].join('\n'));

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, `${exists ? fs.readFileSync(logPath, 'utf8').trimEnd() + '\n\n' : header + '\n'}${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`);
}

function processRotation(bundle, target, options) {
  if (!options.rotationRecordPath) {
    return;
  }

  const recordPath = resolvePath(options.rotationRecordPath);
  if (!fs.existsSync(recordPath)) {
    fail(`Rotation record file not found: ${recordPath}`);
  }

  const input = readJson(recordPath);
  const records = normalizeRotationRecords(input).map((record) => ({
    ...record,
    recordedAt: record.recordedAt ?? new Date().toISOString(),
    artifactVersion: record.artifactVersion ?? bundle.artifact_version,
    releaseBundlePath: record.releaseBundlePath ?? (options.bundlePath || resolveBundlePath(options)),
    manifestSha256: record.manifestSha256 ?? bundle.manifest_sha256,
    circuitId: record.circuitId ?? target.circuit_id,
    schemaVersion: record.schemaVersion ?? bundle.verifier_schema.schema_version,
    targetMetadata: target,
    verifiedAgainstReleaseBundle: true,
  }));

  if (!options.rotationBundlePath || !options.rotationLogPath) {
    fail('Provide both --rotation-bundle-path and --rotation-log-path when recording rotation evidence.');
  }

  const bundleArchivePath = resolvePath(options.rotationBundlePath);
  const archive = loadRotationArchive(bundleArchivePath);
  archive.rotations.push(...records);
  archive.generatedAt = new Date().toISOString();
  writeJsonFile(bundleArchivePath, archive);
  appendRotationLog(resolvePath(options.rotationLogPath), records);

  console.log(`Rotation evidence appended to ${bundleArchivePath}`);
  console.log(`Rotation log appended to ${resolvePath(options.rotationLogPath)}`);
}

function processBenchmarks(options) {
  if (!options.benchmarkCurrentPath && !options.benchmarkBaselinePath) {
    return;
  }

  if (!options.benchmarkCurrentPath || !options.benchmarkBaselinePath) {
    fail('Provide both --benchmark-current-path and --benchmark-baseline-path.');
  }

  const currentPath = resolvePath(options.benchmarkCurrentPath);
  const baselinePath = resolvePath(options.benchmarkBaselinePath);

  if (!fs.existsSync(currentPath)) {
    fail(`Benchmark current archive not found: ${currentPath}`);
  }

  if (!fs.existsSync(baselinePath)) {
    fail(`Benchmark baseline archive not found: ${baselinePath}`);
  }

  const currentArchive = loadBenchmarkArchive(currentPath);
  const baselineArchive = loadBenchmarkArchive(baselinePath);
  const thresholds = options.benchmarkThresholdsJson ? JSON.parse(options.benchmarkThresholdsJson) : undefined;
  const result = compareBenchmarks(currentArchive, baselineArchive, thresholds);

  for (const line of result.lines) {
    console.log(line);
  }

  if (options.benchmarkOutputPath) {
    writeJsonFile(resolvePath(options.benchmarkOutputPath), currentArchive);
    console.log(`Benchmark archive written to ${resolvePath(options.benchmarkOutputPath)}`);
  }

  if (result.failures.length > 0) {
    fail(['Benchmark regression check failed:', ...result.failures.map((entry) => `- ${entry}`)].join('\n'));
  }

  console.log('Benchmark regression check passed.');
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

  processBenchmarks(options);
  processRotation(bundle, target, options);

  console.log('Release preflight passed.');
}

main();
