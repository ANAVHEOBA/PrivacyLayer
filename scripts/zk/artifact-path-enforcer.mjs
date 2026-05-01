#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";

// ===============================
// CONFIG
// ===============================
const ROOT = process.cwd();

const CONFIG = {
  circuitsDir: "circuits",
  targetDir: "target",
  artifactExt: ".json",
};

// Files to scan for bad usage
const SCAN_TARGETS = [
  "sdk/src",
  "scripts",
];

// Allowed helper usage pattern
const ALLOWED_IMPORT = "artifacts";

// ===============================
// ARTIFACT PATH HELPER (SOURCE OF TRUTH)
// ===============================
export function getArtifactPath({ circuit, version = "latest" }) {
  if (!circuit) {
    throw new Error("Missing circuit name for artifact path");
  }

  // Version abstraction (future-proof)
  const versionSegment = version === "latest" ? "" : `/${version}`;

  return path.join(
    ROOT,
    CONFIG.circuitsDir,
    circuit,
    versionSegment,
    CONFIG.targetDir,
    `${circuit}${CONFIG.artifactExt}`
  );
}

// ===============================
// VALIDATION: PATH CONSISTENCY
// ===============================
function assertValidArtifactPath(p) {
  if (!p.includes(CONFIG.circuitsDir) || !p.endsWith(CONFIG.artifactExt)) {
    throw new Error(`Invalid artifact path: ${p}`);
  }
}

// ===============================
// SCAN FOR HARD-CODED PATHS
// ===============================
function scanForHardcodedPaths() {
  console.log("🔍 Scanning for hard-coded artifact paths...");

  const violations = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".mjs")) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // Detect raw path usage like "circuits/.../target/...json"
        const regex = /circuits\/.*\/target\/.*\.json/g;

        const matches = content.match(regex);
        if (matches) {
          // Ignore if using helper
          if (!content.includes(ALLOWED_IMPORT)) {
            violations.push({
              file: fullPath,
              matches,
            });
          }
        }
      }
    }
  }

  SCAN_TARGETS.forEach((dir) => walk(path.join(ROOT, dir)));

  if (violations.length > 0) {
    console.error("\n❌ Hard-coded artifact paths detected:\n");

    for (const v of violations) {
      console.error(`File: ${v.file}`);
      v.matches.forEach((m) => console.error(`  → ${m}`));
    }

    process.exit(1);
  }

  console.log("✅ No hard-coded paths found.");
}

// ===============================
// REGRESSION TESTS
// ===============================
function runRegressionTests() {
  console.log("🧪 Running artifact path regression tests...");

  const testCases = [
    {
      input: { circuit: "withdraw" },
      expected: path.join(
        ROOT,
        "circuits",
        "withdraw",
        "target",
        "withdraw.json"
      ),
    },
    {
      input: { circuit: "withdraw", version: "v1" },
      expected: path.join(
        ROOT,
        "circuits",
        "withdraw",
        "v1",
        "target",
        "withdraw.json"
      ),
    },
  ];

  for (const { input, expected } of testCases) {
    const result = getArtifactPath(input);

    if (result !== expected) {
      console.error("\n❌ Path regression failure:");
      console.error("Input:", input);
      console.error("Expected:", expected);
      console.error("Got:", result);
      process.exit(1);
    }

    assertValidArtifactPath(result);
  }

  console.log("✅ All regression tests passed.");
}

// ===============================
// MAIN
// ===============================
function main() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    runRegressionTests();
    return;
  }

  scanForHardcodedPaths();
  runRegressionTests();

  console.log("\n🚀 Artifact path enforcement passed.");
}

main();