#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";

// --- CONFIG ---
const ARTIFACT_PATH = path.resolve(
  "circuits/withdraw/target/withdraw.json"
);

// You can later replace this with a real import from sdk/src/backends/noir.ts
// e.g. dynamic import if compiled to JS
const SDK_WITNESS_SCHEMA = [
  { name: "recipient", type: "field", visibility: "private" },
  { name: "amount", type: "field", visibility: "private" },
  { name: "nullifier", type: "field", visibility: "public" },
  { name: "root", type: "field", visibility: "public" },
];

// --- HELPERS ---
function fail(msg) {
  console.error(`\n❌ ABI Drift Detected:\n${msg}\n`);
  process.exit(1);
}

function normalizeAbi(abi) {
  return abi.map((item, index) => ({
    name: item.name,
    type: item.type,
    visibility: item.visibility || item.public ? "public" : "private",
    index,
  }));
}

function compareSchemas(abiSchema, sdkSchema) {
  if (abiSchema.length !== sdkSchema.length) {
    fail(
      `Field count mismatch:\nABI: ${abiSchema.length}\nSDK: ${sdkSchema.length}`
    );
  }

  for (let i = 0; i < abiSchema.length; i++) {
    const abiField = abiSchema[i];
    const sdkField = sdkSchema[i];

    // --- NAME CHECK ---
    if (abiField.name !== sdkField.name) {
      fail(
        `Field name mismatch at index ${i}:\nABI: ${abiField.name}\nSDK: ${sdkField.name}`
      );
    }

    // --- TYPE CHECK ---
    if (abiField.type !== sdkField.type) {
      fail(
        `Type mismatch for "${abiField.name}":\nABI: ${abiField.type}\nSDK: ${sdkField.type}`
      );
    }

    // --- VISIBILITY CHECK ---
    if (abiField.visibility !== sdkField.visibility) {
      fail(
        `Visibility mismatch for "${abiField.name}":\nABI: ${abiField.visibility}\nSDK: ${sdkField.visibility}`
      );
    }
  }
}

// --- MAIN ---
function main() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    fail(`Compiled artifact not found at ${ARTIFACT_PATH}`);
  }

  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf-8"));

  if (!artifact.abi || !artifact.abi.parameters) {
    fail("Invalid Noir artifact: ABI parameters missing");
  }

  const abiSchema = normalizeAbi(artifact.abi.parameters);

  console.log("🔍 Checking ABI vs SDK witness schema...");

  compareSchemas(abiSchema, SDK_WITNESS_SCHEMA);

  console.log("✅ No ABI drift detected.");
}

main();