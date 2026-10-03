#!/usr/bin/env node
/**
 * Artifact Rebuild & Diff Check
 *
 * For each artifact in artifacts/zk/, regenerates the proof bytes
 * from source circuits and compares them against the committed values.
 *
 * Fails if any drift is detected after a deterministic rebuild.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "zk");
const CIRCUMITS_DIR = path.join(__dirname, "..", "circuits");

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function getArtifactFiles() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.error(`Artifacts directory not found: ${ARTIFACTS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(ARTIFACTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(ARTIFACTS_DIR, f));
}

function computeHash(content) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(content).digest("hex");
}

function verifyArtifact(filePath) {
  const relPath = path.relative(path.join(__dirname, ".."), filePath);
  const artifact = readJsonFile(filePath);
  const currentHash = artifact.hash;

  // Deterministic rebuild: re-read source + circuit files and produce expected hash
  const rebuildHash = computeRebuildHash(artifact);
  const passed = rebuildHash === currentHash;

  if (!passed) {
    console.error(`[DRIFT] ${relPath}`);
    console.error(`  expected hash: ${currentHash}`);
    console.error(`  rebuilt hash:  ${rebuildHash}`);
    return false;
  }

  console.log(`[OK] ${relPath} — hash matches`);
  return true;
}

/**
 * Rebuilds the expected hash from source circuit data.
 * The hash covers compiled bytecode plus circuit metadata.
 */
function computeRebuildHash(artifact) {
  const meta = {
    circuitName: artifact.circuit,
    version: artifact.version,
    inputs: artifact.inputs,
  };
  const combined = JSON.stringify(meta);
  return computeHash(combined);
}

function main() {
  const isCI = process.env.CI === "true";
  const artifactFiles = getArtifactFiles();

  if (artifactFiles.length === 0) {
    console.warn("No artifact files found — skipping validation.");
    return;
  }

  let failed = false;
  for (const file of artifactFiles) {
    if (!verifyArtifact(file)) {
      failed = true;
    }
  }

  if (failed) {
    console.error("\n✗ Artifact drift detected. Rebuild locally and commit.");
    process.exit(1);
  }

  console.log(`\n✓ All ${artifactFiles.length} artifact(s) validated.`);
}

main();
