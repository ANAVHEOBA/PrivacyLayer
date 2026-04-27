import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ZK-041: Accept version parameter for versioned artifact layout
const zkVersion = process.argv[2] || '2';
const artifactsDir = path.join(repoRoot, 'artifacts', 'zk');
const manifestPath = path.join(artifactsDir, 'manifest.json');
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
const COMMITMENT_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'commitment',
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

/**
 * Computes a deterministic schema version from a public input schema array.
 * 
 * Algorithm:
 * 1. Serialize the schema array using stable JSON serialization (sorted keys, no whitespace)
 * 2. Compute SHA-256 hash of the serialized schema
 * 3. Derive semantic version from hash:
 *    - Major version: 1 (fixed for initial release)
 *    - Minor version: First 4 hex digits of hash as decimal (0-65535)
 *    - Patch version: Next 4 hex digits of hash as decimal (0-65535)
 * 
 * This ensures:
 * - Identical schemas produce identical versions
 * - Different schemas produce different versions with high probability
 * - Version format is human-readable semantic versioning
 * 
 * @param {string[]} publicInputSchema - Ordered array of public input field names
 * @returns {string} Semantic version string (e.g., "1.2345.6789")
 */
function computeSchemaVersion(publicInputSchema) {
  if (!Array.isArray(publicInputSchema) || publicInputSchema.length === 0) {
    throw new Error('publicInputSchema must be a non-empty array');
  }

  // Validate that all elements are strings
  for (const field of publicInputSchema) {
    if (typeof field !== 'string') {
      throw new Error(`Invalid schema field: expected string, got ${typeof field}`);
    }
  }

  // Use stable serialization to ensure deterministic hashing
  const serialized = stableStringify(publicInputSchema);
  
  // Compute SHA-256 hash (without 0x prefix for parsing)
  const hash = createHash('sha256').update(serialized).digest('hex');
  
  // Derive semantic version from hash
  const major = 1; // Fixed for initial release
  const minor = parseInt(hash.substring(0, 4), 16); // First 4 hex digits (0-65535)
  const patch = parseInt(hash.substring(4, 8), 16); // Next 4 hex digits (0-65535)
  
  return `${major}.${minor}.${patch}`;
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

  // Add circuit-specific fields
  if (name === 'withdraw') {
    entry.root_depth = PRODUCTION_MERKLE_ROOT_DEPTH;
    entry.public_input_schema = WITHDRAW_PUBLIC_INPUT_SCHEMA;
    // Compute schema version for circuits with public input schema
    entry.schema_version = computeSchemaVersion(WITHDRAW_PUBLIC_INPUT_SCHEMA);
  } else if (name === 'commitment') {
    entry.public_input_schema = COMMITMENT_PUBLIC_INPUT_SCHEMA;
    // Compute schema version for circuits with public input schema
    entry.schema_version = computeSchemaVersion(COMMITMENT_PUBLIC_INPUT_SCHEMA);
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

  // Load existing manifest to detect migration scenarios
  let existingManifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not parse existing manifest. Treating as new manifest.');
    }
  }

  // Try to get backend versions, but don't fail if tools aren't available
  let backendInfo;
  try {
    const nargoVersion = commandOutput('nargo', ['--version']);
    const noircVersion = commandOutput('noirc', ['--version']);
    backendInfo = {
      name: 'nargo/noir',
      nargo_version: nargoVersion.trim(),
      noirc_version: noircVersion.trim(),
    };
  } catch (error) {
    console.warn('Warning: Could not detect nargo/noirc versions. Using existing backend info from manifest.');
    // Try to preserve existing backend info if manifest exists
    if (existingManifest) {
      backendInfo = existingManifest.backend || { name: 'nargo/noir' };
    } else {
      backendInfo = { name: 'nargo/noir' };
    }
  }

  const manifest = {
    version: parseInt(zkVersion, 10),
    backend: backendInfo,
    circuits: Object.fromEntries(
      CIRCUIT_ORDER.map((name) => [name, buildCircuitEntry(name)])
    ),
    files: buildExtraFileEntries(),
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Manifest updated at ${manifestPath}`);
  
  // Detect migration: circuits that now have schema_version but didn't before
  const migratedCircuits = [];
  const allCircuitsWithSchema = [];
  
  for (const [name, entry] of Object.entries(manifest.circuits)) {
    if (entry.schema_version) {
      allCircuitsWithSchema.push({ name, version: entry.schema_version });
      
      // Check if this circuit had schema_version in the old manifest
      const oldEntry = existingManifest?.circuits?.[name];
      if (oldEntry && oldEntry.public_input_schema && !oldEntry.schema_version) {
        migratedCircuits.push({ name, version: entry.schema_version });
      }
    }
  }
  
  // Output summary
  if (allCircuitsWithSchema.length > 0) {
    console.log('\nSchema versions computed:');
    for (const { name, version } of allCircuitsWithSchema) {
      console.log(`  ${name}: ${version}`);
    }
  }
  
  // Output migration summary if any circuits were migrated
  if (migratedCircuits.length > 0) {
    console.log('\nMigration summary:');
    console.log(`Added schema_version to ${migratedCircuits.length} existing circuit(s):`);
    for (const { name, version } of migratedCircuits) {
      console.log(`  ${name}: ${version} (migrated from no schema_version)`);
    }
  }
}

main();
