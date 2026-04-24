#!/usr/bin/env node
import { createHash } from 'crypto';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { execFileSync } from 'child_process';

const repoRoot = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const artifactsDir = join(repoRoot, 'artifacts', 'zk');
const manifestPath = join(artifactsDir, 'manifest.json');

async function readTextIfExists(path, fallback = 'unknown') {
  try {
    return (await readFile(path, 'utf8')).trim();
  } catch {
    return fallback;
  }
}

function commandVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split('\n')[0];
  } catch {
    return 'unknown';
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const noirVersion = await readTextIfExists(join(repoRoot, '.noir-version'));
const compilerVersion = commandVersion('nargo', ['--version']);
const backendVersion = commandVersion('bb', ['--version']);
const files = (await readdir(artifactsDir))
  .filter((file) => file.endsWith('.json'))
  .filter((file) => !['manifest.json', 'constraint_baselines.json'].includes(file))
  .sort();

const circuits = {};
for (const file of files) {
  const bytes = await readFile(join(artifactsDir, file));
  const circuitId = basename(file, '.json');
  circuits[circuitId] = {
    circuitId,
    artifact: file,
    path: file,
    artifactHash: sha256(bytes),
    checksum: sha256(bytes),
    backend: 'barretenberg',
    backendVersion,
    compiler: 'nargo',
    compilerVersion,
    generatedAt: new Date().toISOString(),
    metadata: {
      noirVersion,
    },
  };
}

const manifest = {
  schemaVersion: '1.0',
  circuits,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${manifestPath} with ${files.length} circuit artifact(s)`);
