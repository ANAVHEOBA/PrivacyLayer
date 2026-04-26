import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ZK-041: Accept version parameter for versioned artifact layout
const zkVersion = process.argv[2] || '1';
const artifactsDir = path.join(repoRoot, 'artifacts', 'zk', `v${zkVersion}`);
const manifestPath = path.join(artifactsDir, 'manifests', 'manifest.json');
const PRODUCTION_MERKLE_ROOT_DEPTH = 20;
const CIRCUIT_ORDER = ['withdraw', 'commitment'];
const WITHDRAW_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
];
const EXTRA_FILES = {
  commitment_vectors: {
    path: 'commitment_vectors.json',
    version: 1,
  },
};

function sha256Hex(data) {
  return '0x' + createHash('sha256').update(data).digest('hex');
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function commandOutput(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Failed to read version from ${command}`);
  }
  return result.stdout;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildCircuitEntry(name) {
  const filePath = path.join(artifactsDir, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing artifact file: ${path.relative(repoRoot, filePath)}`);
  }

  const raw = fs.readFileSync(filePath);
  const artifact = JSON.parse(raw.toString('utf8'));
  const entry = {
    circuit_id: name,
    path: `${name}.json`,
    artifact_sha256: sha256Hex(raw),
    bytecode_sha256: sha256Hex(String(artifact.bytecode ?? '')),
    abi_sha256: sha256Hex(stableStringify(artifact.abi ?? null)),
    name: artifact.name ?? name,
    backend: 'nargo/noir',
  };

  if (name === 'withdraw') {
    entry.root_depth = PRODUCTION_MERKLE_ROOT_DEPTH;
    entry.public_input_schema = WITHDRAW_PUBLIC_INPUT_SCHEMA;
  }

  return entry;
}

function buildExtraFileEntries() {
  return Object.fromEntries(
    Object.entries(EXTRA_FILES).map(([key, file]) => {
      const filePath = path.join(artifactsDir, file.path);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing manifest file dependency: ${path.relative(repoRoot, filePath)}`);
      }

      return [
        key,
        {
          path: file.path,
          sha256: sha256Hex(fs.readFileSync(filePath)),
          version: file.version,
        },
      ];
    })
  );
}

function main() {
  console.log(`Refreshing ZK manifest for version ${zkVersion}...`);

  // ZK-041: Create manifests directory if it doesn't exist
  if (!fs.existsSync(path.dirname(manifestPath))) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  }

  // ZK-041: Initialize manifest structure if it doesn't exist
  let manifest;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } else {
    manifest = {
      version: zkVersion,
      backend: 'barretenberg',
      circuits: {},
    };
  }

  // ZK-041: Update circuits list to include merkle
  const circuits = ['withdraw', 'commitment', 'merkle'];

  for (const name of circuits) {
    // ZK-041: Look for circuits in versioned directory structure
    const filePath = path.join(artifactsDir, 'circuits', name, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Missing artifact for ${name} at ${filePath}`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const checksum = computeChecksum(artifact);

    if (!manifest.circuits[name]) {
      manifest.circuits[name] = {};
    }
    // ZK-041: Update path to reflect new directory structure
    manifest.circuits[name].path = `circuits/${name}/${name}.json`;
    manifest.circuits[name].checksum = checksum;
    
    // Production artifact depth is fixed for this protocol version.
    if (name === 'withdraw') {
      manifest.circuits[name].root_depth = PRODUCTION_MERKLE_ROOT_DEPTH;
    }
  }

  // Idempotent write
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Manifest updated at ${manifestPath}`);
}

main();
