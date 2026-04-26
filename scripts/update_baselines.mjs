import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ZK-041: Accept version parameter for versioned artifact layout
const zkVersion = process.argv[2] || '1';
const baselinesPath = path.join(repoRoot, 'artifacts', 'zk', `v${zkVersion}`, 'constraint_baselines.json');
const nargo = process.env.NARGO_BIN || 'nargo';

function runNargoInfoJson(pkg) {
  const result = spawnSync(
    nargo,
    ['info', '--package', pkg, '--json'],
    { cwd: path.join(repoRoot, 'circuits'), encoding: 'utf8' }
  );
  if (result.status !== 0) {
    console.error(`nargo info failed for ${pkg}`);
    return null;
  }
  return JSON.parse(result.stdout);
}

function mainOpCount(program) {
  const f = (program?.functions || []).find((g) => g.name === 'main');
  return f ? f.opcodes : null;
}

function main() {
  console.log(`Updating constraint baselines for version ${zkVersion}...`);
  
  // ZK-041: Create directory if it doesn't exist
  if (!fs.existsSync(path.dirname(baselinesPath))) {
    fs.mkdirSync(path.dirname(baselinesPath), { recursive: true });
  }

  // ZK-041: Initialize baselines structure if it doesn't exist
  let baselines;
  if (fs.existsSync(baselinesPath)) {
    baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf8'));
  } else {
    baselines = {
      version: zkVersion,
      nargo: {},
      circuits: {},
    };
  }

  const versionResult = spawnSync(nargo, ['--version'], { encoding: 'utf8' });
  if (versionResult.status === 0) {
    baselines.nargo.version_line = versionResult.stdout.split('\n')[0]?.trim();
  }

  // ZK-041: Update circuits list to include merkle
  for (const pkg of ['withdraw', 'commitment', 'merkle']) {
    if (!baselines.circuits[pkg]) {
      baselines.circuits[pkg] = {};
    }
    
    const out = runNargoInfoJson(pkg);
    if (!out) continue;
    const prog = (out.programs || [])[0];
    const count = mainOpCount(prog);
    if (count !== null) {
      console.log(`  ${pkg}: ${count} opcodes`);
      baselines.circuits[pkg].acir_opcodes = count;
    }
  }

  fs.writeFileSync(baselinesPath, JSON.stringify(baselines, null, 2) + '\n');
  console.log('Baselines updated.');
}

main();
