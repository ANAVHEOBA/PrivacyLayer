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
const versionedManifestPath = path.join(artifactsDir, 'manifests', 'manifest.json');
const legacyManifestPath = path.join(repoRoot, 'artifacts', 'zk', 'manifest.json');
const releaseBundlePath = path.join(artifactsDir, 'bundles', 'release-bundle.json');
const PRODUCTION_MERKLE_ROOT_DEPTH = 20;
const WITHDRAW_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
];
const CONTRACT_PUBLIC_INPUT_SCHEMA = WITHDRAW_PUBLIC_INPUT_SCHEMA.slice(1);
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

function detectBackendVersions() {
  try {
    return {
      nargo_version: commandOutput('nargo', ['--version']).trim(),
      noirc_version: commandOutput('noirc', ['--version']).trim(),
    };
  } catch {
    return {
      nargo_version: 'unknown',
      noirc_version: 'unknown',
    };
  }
}

function normalizeBackend(backend) {
  const versions = detectBackendVersions();
  if (backend && typeof backend === 'object') {
    return {
      name: backend.name ?? 'nargo/noir',
      nargo_version: backend.nargo_version ?? versions.nargo_version,
      noirc_version: backend.noirc_version ?? versions.noirc_version,
    };
  }

  return {
    name: typeof backend === 'string' && backend.length > 0 ? backend : 'nargo/noir',
    nargo_version: versions.nargo_version,
    noirc_version: versions.noirc_version,
  };
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

function buildReleaseBundle(manifest) {
  const withdraw = manifest.circuits.withdraw;
  if (!withdraw || !withdraw.public_input_schema) {
    throw new Error('Withdrawal circuit manifest entry is required to build the release bundle');
  }

  const manifestSha256 = sha256Hex(stableStringify(manifest));
  const verifierSchema = {
    circuit_id: withdraw.circuit_id,
    public_input_schema: withdraw.public_input_schema,
    public_input_arity: withdraw.public_input_schema.length,
    contract_public_input_schema: CONTRACT_PUBLIC_INPUT_SCHEMA,
    contract_public_input_arity: CONTRACT_PUBLIC_INPUT_SCHEMA.length,
    schema_version: 1,
  };

  return {
    version: 1,
    artifact_version: zkVersion,
    manifest_sha256: manifestSha256,
    manifest,
    verifier_schema,
    contract_metadata: {
      contract_name: 'privacy_pool',
      target_circuit_id: withdraw.circuit_id,
      manifest_sha256: manifestSha256,
      public_input_arity: CONTRACT_PUBLIC_INPUT_SCHEMA.length,
      schema_version: 1,
      verifier_key_storage: 'DataKey::VerifyingKey',
    },
function computeChecksums(raw, artifact) {
  return {
    artifact_sha256: sha256Hex(raw),
    bytecode_sha256: sha256Hex(String(artifact.bytecode ?? '')),
    abi_sha256: sha256Hex(stableStringify(artifact.abi ?? null)),
  };
}

function main() {
  console.log(`Refreshing ZK manifest for version ${zkVersion}...`);

  if (!fs.existsSync(path.dirname(versionedManifestPath))) {
    fs.mkdirSync(path.dirname(versionedManifestPath), { recursive: true });
  }
  if (!fs.existsSync(path.dirname(releaseBundlePath))) {
    fs.mkdirSync(path.dirname(releaseBundlePath), { recursive: true });
  }

  let manifest;
  if (fs.existsSync(versionedManifestPath)) {
    manifest = JSON.parse(fs.readFileSync(versionedManifestPath, 'utf8'));
  } else if (fs.existsSync(legacyManifestPath)) {
    manifest = JSON.parse(fs.readFileSync(legacyManifestPath, 'utf8'));
  } else {
    throw new Error('No manifest found to refresh. Run the rebuild pipeline first.');
    manifest = {
      version: zkVersion,
      backend: {
        name: 'nargo/noir',
        nargo_version: 'unknown',
        noirc_version: 'unknown'
      },
      circuits: {},
    };
  }

  manifest.version = Number.parseInt(zkVersion, 10);
  manifest.backend = normalizeBackend(manifest.backend);

  const circuits = ['withdraw', 'commitment', 'merkle'];

  for (const name of circuits) {
    const filePath = path.join(artifactsDir, 'circuits', name, `${name}.json`);
    // ZK-041: Look for circuits in versioned directory structure
    const circuitFile = `circuits/${name}/${name}.json`;
    const filePath = path.join(artifactsDir, circuitFile);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Missing artifact for ${name} at ${filePath}`);
      continue;
    }

    const raw = fs.readFileSync(filePath);
    const artifact = JSON.parse(raw.toString('utf8'));
    const circuitEntry = manifest.circuits[name] ?? (manifest.circuits[name] = {});
    circuitEntry.circuit_id = name;
    circuitEntry.path = `circuits/${name}/${name}.json`;
    circuitEntry.artifact_sha256 = sha256Hex(raw);
    circuitEntry.bytecode_sha256 = sha256Hex(String(artifact.bytecode ?? ''));
    circuitEntry.abi_sha256 = sha256Hex(stableStringify(artifact.abi ?? null));
    circuitEntry.name = artifact.name ?? name;
    circuitEntry.backend = 'nargo/noir';

    if (name === 'withdraw') {
      circuitEntry.root_depth = PRODUCTION_MERKLE_ROOT_DEPTH;
      circuitEntry.public_input_schema = WITHDRAW_PUBLIC_INPUT_SCHEMA;
    }
  }

  const extraFiles = buildExtraFileEntries();
  manifest.files = extraFiles;

  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  const releaseBundle = buildReleaseBundle(manifest);
  const releaseBundleText = JSON.stringify(releaseBundle, null, 2) + '\n';

  fs.writeFileSync(versionedManifestPath, manifestText);
  fs.writeFileSync(legacyManifestPath, manifestText);
  fs.writeFileSync(releaseBundlePath, releaseBundleText);

  console.log(`Manifest updated at ${versionedManifestPath}`);
  console.log(`Legacy manifest updated at ${legacyManifestPath}`);
  console.log(`Release bundle updated at ${releaseBundlePath}`);
    const checksums = computeChecksums(raw, artifact);

    if (!manifest.circuits[name]) {
      manifest.circuits[name] = {
        circuit_id: name,
        name: artifact.name ?? name,
        backend: 'nargo/noir'
      };
    }
    
    // ZK-041/ZK-085: Update path and checksums
    manifest.circuits[name].path = circuitFile;
    manifest.circuits[name].artifact_sha256 = checksums.artifact_sha256;
    manifest.circuits[name].bytecode_sha256 = checksums.bytecode_sha256;
    manifest.circuits[name].abi_sha256 = checksums.abi_sha256;
    
    // Production artifact depth and schema (ZK-087)
    if (name === 'withdraw') {
      manifest.circuits[name].root_depth = PRODUCTION_MERKLE_ROOT_DEPTH;
      
      const verifierSchemaPath = path.join(artifactsDir, 'verifier_schema.json');
      if (fs.existsSync(verifierSchemaPath)) {
        const schema = JSON.parse(fs.readFileSync(verifierSchemaPath, 'utf8'));
        manifest.circuits[name].public_input_schema = schema.public_inputs.map(i => i.name);
      } else {
        manifest.circuits[name].public_input_schema = WITHDRAW_PUBLIC_INPUT_SCHEMA;
      }
    }
  }

  // Update extra files
  manifest.files = buildExtraFileEntries();

  // Idempotent write
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Manifest updated at ${manifestPath}`);
}

main();
