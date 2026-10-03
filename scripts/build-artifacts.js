#!/usr/bin/env node
/**
 * Build ZK Artifacts
 *
 * Compiles circuits and produces deterministic JSON artifacts under
 * artifacts/zk/. Each artifact contains the circuit name, inputs, version,
 * and a SHA-256 hash of its canonical representation.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const CIRCUITS_DIR = path.join(ROOT, "circuits");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "zk");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function compileCircuit(circuitDir) {
  try {
    execSync("nargo check", { cwd: circuitDir, stdio: "pipe" });
    return true;
  } catch (e) {
    console.error(`[WARN] nargo check failed for ${circuitDir}: ${e.message}`);
    return false;
  }
}

function readToml(tomlPath) {
  const content = fs.readFileSync(tomlPath, "utf-8");
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

function buildArtifact(circuitName, tomlPath) {
  const toml = readToml(tomlPath);
  const version = toml.version || "0.0.0";
  const inputs = toml.inputs ? toml.inputs.split(",").map((s) => s.trim()) : [];

  const artifact = {
    circuit: circuitName,
    version,
    inputs,
    generatedAt: new Date().toISOString(),
    hash: "",
  };

  // Deterministic hash over canonical fields (exclude generatedAt)
  const canonical = { circuit: artifact.circuit, version, inputs };
  artifact.hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");

  return artifact;
}

function writeArtifact(artifact) {
  const fileName = `${artifact.circuit}.json`;
  const filePath = path.join(ARTIFACTS_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`Wrote artifact: ${fileName}`);
}

function main() {
  ensureDir(ARTIFACTS_DIR);

  if (!fs.existsSync(CIRCUITS_DIR)) {
    console.error(`Circuits directory not found: ${CIRCUITS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(CIRCUITS_DIR);
  let built = 0;
  for (const entry of entries) {
    const tomlPath = path.join(CIRCUITS_DIR, entry, "Nargo.toml");
    if (!fs.existsSync(tomlPath)) continue;

    const ok = compileCircuit(path.join(CIRCUITS_DIR, entry));
    if (!ok) continue;

    const artifact = buildArtifact(entry, tomlPath);
    writeArtifact(artifact);
    built++;
  }

  console.log(`Built ${built} artifact(s) in ${ARTIFACTS_DIR}`);
}

main();
