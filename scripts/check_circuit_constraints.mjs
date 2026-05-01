#!/usr/bin/env node
/**
 * Compares `nargo info --json` main-circuit ACIR opcode counts to baselines.
 * Fails the process when a circuit grows past its baseline (unapproved regression).
 * Decreases are allowed (improvement); re-snapshot the JSON when a regression is intended.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ZK-041: Accept version parameter for versioned artifact layout
const zkVersion = process.argv[2] || '1';
const baselinesPath = path.join(repoRoot, 'artifacts', 'zk', `v${zkVersion}`, 'constraint_baselines.json');
const nargo = process.env.NARGO_BIN || path.join(process.env.HOME || '', '.nargo', 'bin', 'nargo');

function runNargoInfoJson(pkg) {
  const result = spawnSync(
    nargo,
    ['info', '--package', pkg, '--json'],
    { cwd: path.join(repoRoot, 'circuits'), encoding: 'utf8' }
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  return JSON.parse(result.stdout);
}

function mainOpCount(program) {
  const f = (program?.functions || []).find((g) => g.name === 'main');
  if (!f) {
    throw new Error(`no main in ${JSON.stringify(program)}`);
  }
  if (f.opcodes == null) {
    throw new Error(`no opcodes on main for ${JSON.stringify(f)}`);
  }
  return f.opcodes;
}

const versionResult = spawnSync(nargo, ['--version'], {
  encoding: 'utf8',
  cwd: path.join(repoRoot, 'circuits'),
});
if (versionResult.status !== 0) {
  console.error('nargo --version failed');
  process.exit(1);
}
const nargoVersionLine = versionResult.stdout.split('\n')[0]?.trim() || versionResult.stdout.trim();

if (!fs.existsSync(baselinesPath)) {
  console.error('Missing', baselinesPath);
  process.exit(1);
}

const baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf8'));
const expectVer = baselines.nargo?.version_line;
if (expectVer && expectVer !== nargoVersionLine) {
  console.warn(
    `[warn] Nargo version differs from baseline. Expected: "${expectVer}", got: "${nargoVersionLine}"`
  );
  console.warn('  Reproducible CI should pin the same nargo; update constraint_baselines.json on toolchain bumps.');
}

let fail = false;

// ZK-041: Update circuits list to include merkle
for (const pkg of ['withdraw', 'commitment', 'merkle']) {
  if (!baselines.circuits[pkg]) {
    console.warn(`[warn] No baseline found for ${pkg}, skipping`);
    continue;
  }
  
  const expected = baselines.circuits[pkg].acir_opcodes;
  const out = runNargoInfoJson(pkg);
  const prog = (out.programs || [])[0];
  if (prog?.package_name !== pkg) {
    throw new Error(`package mismatch: expected ${pkg}, got ${JSON.stringify(prog)}`);
  }
  const count = mainOpCount(prog);
  process.stdout.write(`${pkg}/main: ${count} ACIR opcodes (baseline ${expected})\n`);
  if (count > expected) {
    console.error(
      `[fail] ${pkg} ACIR opcodes regressed: ${count} > ${expected}. ` +
        `If this increase is expected, update artifacts/zk/v${zkVersion}/constraint_baselines.json in a reviewed commit.`
    );
    fail = true;
  } else if (count < expected) {
    console.log(
      `  (info) ${pkg} improved (${count} < ${expected}); consider lowering the baseline in a follow-up.`
    );
  }
}

if (fail) {
  process.exit(1);
}
console.log('Circuit constraint check passed.');
