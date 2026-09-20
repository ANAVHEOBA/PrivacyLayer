/**
 * validate_artifacts.js
 *
 * Computes a deterministic SHA‑256 hash over all files in the
 * `artifacts/zk` directory (excluding the manifest itself) and compares it
 * against the hash stored inside `artifacts/zk/manifest.json`.
 *
 * The script exits with a non‑zero status code if the hashes differ,
 * causing CI to fail.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARTIFACTS_DIR = path.resolve(__dirname, '..', 'artifacts', 'zk');
const MANIFEST_PATH = path.join(ARTIFACTS_DIR, 'manifest.json');

/**
 * Recursively collects all file paths under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Computes a deterministic hash of a directory's contents.
 * Files are sorted alphabetically, and each file's relative path and
 * raw bytes are fed into the hash function.
 *
 * @param {string} dir Absolute path to the directory.
 * @returns {string} Hex‑encoded SHA‑256 digest.
 */
function hashDirectory(dir) {
  const hash = crypto.createHash('sha256');
  const allFiles = collectFiles(dir)
    .filter((p) => path.basename(p) !== 'manifest.json') // exclude manifest itself
    .map((p) => path.relative(dir, p))
    .sort();

  for (const relPath of allFiles) {
    const absPath = path.join(dir, relPath);
    const content = fs.readFileSync(absPath);
    hash.update(relPath); // incorporate file path to avoid collisions
    hash.update(content);
  }

  return hash.digest('hex');
}

// -------------------------------------------------------------------------
// Main validation logic
// -------------------------------------------------------------------------
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`❌ Manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (e) {
  console.error('❌ Failed to parse manifest.json:', e);
  process.exit(1);
}

if (!manifest.hash) {
  console.error('❌ Manifest does not contain a "hash" field.');
  process.exit(1);
}

const computedHash = hashDirectory(ARTIFACTS_DIR);
if (computedHash !== manifest.hash) {
  console.error('❌ Artifact hash mismatch!');
  console.error(`   Expected (manifest): ${manifest.hash}`);
  console.error(`   Computed (current) : ${computedHash}`);
  console.error('   Run the deterministic rebuild script to update the manifest.');
  process.exit(1);
}

console.log('✅ Artifact hash matches manifest. No drift detected.');
process.exit(0);
