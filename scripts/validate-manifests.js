#!/usr/bin/env node
/**
 * Manifest Validator
 *
 * Validates that every circuit's Nargo.toml has a corresponding
 * entry in the artifacts/zk manifest, and that required fields are present.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CIRCUITS_DIR = path.join(ROOT, "circuits");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "zk");

const REQUIRED_FIELDS = ["name", "version", "type"];

function readToml(tomlPath) {
  const content = fs.readFileSync(tomlPath, "utf-8");
  // Minimal TOML parser for our structured Nargo.toml files
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function validateManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  const missing = REQUIRED_FIELDS.filter((f) => !manifest[f]);
  if (missing.length > 0) {
    console.error(`[FAIL] ${manifestPath}: missing fields: ${missing.join(", ")}`);
    return false;
  }
  return true;
}

function findCircuitNames() {
  const names = new Set();
  if (!fs.existsSync(CIRCUITS_DIR)) {
    console.error(`Circuits directory not found: ${CIRCUITS_DIR}`);
    process.exit(1);
  }
  for (const entry of fs.readdirSync(CIRCUITS_DIR)) {
    const tomlPath = path.join(CIRCUITS_DIR, entry, "Nargo.toml");
    if (!fs.existsSync(tomlPath)) continue;
    try {
      const toml = readToml(tomlPath);
      names.add(toml.name || entry);
    } catch (e) {
      console.error(`[WARN] Could not parse ${tomlPath}: ${e.message}`);
    }
  }
  return names;
}

function main() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.error(`Artifacts directory not found: ${ARTIFACTS_DIR}`);
    process.exit(1);
  }

  const circuitNames = findCircuitNames();
  const artifactFiles = fs
    .readdirSync(ARTIFACTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(ARTIFACTS_DIR, f));

  let failed = false;

  // 1. Every artifact must pass field validation
  for (const file of artifactFiles) {
    if (!validateManifest(file)) {
      failed = true;
    }
  }

  // 2. Every circuit must have a matching artifact
  for (const name of circuitNames) {
    const matched = artifactFiles.some((f) => {
      try {
        const m = readJson(f);
        return m.circuit === name;
      } catch {
        return false;
      }
    });
    if (!matched) {
      console.error(`[FAIL] No artifact found for circuit: ${name}`);
      failed = true;
    } else {
      console.log(`[OK] Circuit "${name}" has matching artifact`);
    }
  }

  if (failed) {
    console.error("\n✗ Manifest validation failed.");
    process.exit(1);
  }

  console.log(`\n✓ All ${artifactFiles.length} manifest(s) validated.`);
}

main();
