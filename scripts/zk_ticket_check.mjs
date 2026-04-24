#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    run: false,
    issueKey: '',
    changedFilesPath: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--issue-key') {
      options.issueKey = argv[++i] ?? '';
    } else if (arg === '--run') {
      options.run = true;
    } else if (arg === '--changed-files-path') {
      options.changedFilesPath = argv[++i] ?? '';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  node scripts/zk_ticket_check.mjs --issue-key ZK-001',
      '  node scripts/zk_ticket_check.mjs --issue-key ZK-001 --run',
      '  node scripts/zk_ticket_check.mjs --issue-key ZK-001 --changed-files-path /tmp/files.txt',
      '',
      'Options:',
      '  --issue-key <ZK-###>         Required issue key from ops/github/waves/zk-wave-1.mjs',
      '  --run                        Execute the derived validation commands',
      '  --changed-files-path <path>  Optional newline-separated changed file list to compare with issue scope',
    ].join('\n'),
  );
}

async function loadWave() {
  const moduleUrl = pathToFileURL(path.join(repoRoot, 'ops', 'github', 'waves', 'zk-wave-1.mjs')).href;
  const { default: wave } = await import(moduleUrl);
  return wave;
}

function unique(items) {
  return Array.from(new Set(items));
}

function resolveNargoBinary() {
  if (process.env.NARGO_BIN) {
    return process.env.NARGO_BIN;
  }

  const home = process.env.HOME;
  if (home) {
    const candidate = path.join(home, '.nargo', 'bin', 'nargo');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'nargo';
}

function refsToPackages(issue) {
  const refs = [...(issue.references ?? []), ...(issue.codeAreas ?? [])];
  const hasSdk = refs.some((ref) => ref.startsWith('sdk/'));
  const hasCircuits = refs.some((ref) => ref.startsWith('circuits/'));
  const packages = new Set();

  if (refs.some((ref) => ref.startsWith('circuits/commitment/'))) {
    packages.add('commitment');
  }
  if (refs.some((ref) => ref.startsWith('circuits/merkle/'))) {
    packages.add('merkle');
  }
  if (refs.some((ref) => ref.startsWith('circuits/withdraw/'))) {
    packages.add('withdraw');
  }
  if (refs.some((ref) => ref.startsWith('circuits/lib/'))) {
    packages.add('commitment');
    packages.add('merkle');
    packages.add('withdraw');
  }

  return {
    hasSdk,
    hasCircuits,
    packages: Array.from(packages),
  };
}

function buildChecks(issue) {
  const { area } = issue;
  const { hasSdk, hasCircuits, packages } = refsToPackages(issue);
  const checks = [];
  const nargo = resolveNargoBinary();

  if (hasCircuits || ['foundations', 'commitment', 'merkle', 'withdraw', 'prover', 'tooling', 'testing', 'security', 'performance'].includes(area)) {
    checks.push({
      name: 'Noir workspace compile check',
      cwd: 'circuits',
      command: [nargo, 'check', '--workspace'],
    });
  }

  if (area === 'commitment') {
    checks.push(
      {
        name: 'Commitment package tests',
        cwd: 'circuits',
        command: [nargo, 'test', '--package', 'commitment'],
      },
      {
        name: 'Withdrawal package regression tests',
        cwd: 'circuits',
        command: [nargo, 'test', '--package', 'withdraw'],
      },
    );
  } else if (area === 'merkle') {
    checks.push(
      {
        name: 'Merkle package tests',
        cwd: 'circuits',
        command: [nargo, 'test', '--package', 'merkle'],
      },
      {
        name: 'Withdrawal package regression tests',
        cwd: 'circuits',
        command: [nargo, 'test', '--package', 'withdraw'],
      },
    );
  } else if (area === 'withdraw') {
    checks.push({
      name: 'Withdrawal package tests',
      cwd: 'circuits',
      command: [nargo, 'test', '--package', 'withdraw'],
    });
  } else if (['sdk-zk', 'prover', 'tooling', 'testing', 'security', 'performance', 'foundations'].includes(area)) {
    checks.push({
      name: 'Noir workspace tests',
      cwd: 'circuits',
      command: [nargo, 'test', '--workspace'],
    });
  } else if (packages.length > 0) {
    for (const pkg of packages) {
      checks.push({
        name: `Noir ${pkg} package tests`,
        cwd: 'circuits',
        command: [nargo, 'test', '--package', pkg],
      });
    }
  }

  if (hasSdk || ['sdk-zk', 'prover', 'tooling', 'testing', 'security', 'performance', 'foundations', 'commitment', 'merkle', 'withdraw'].includes(area)) {
    checks.push({
      name: 'SDK TypeScript build',
      cwd: 'sdk',
      command: ['npm', 'run', 'build'],
    });
  }

  return unique(
    checks.map((check) => JSON.stringify(check)),
  ).map((serialized) => JSON.parse(serialized));
}

function expectedPaths(issue) {
  return unique([...(issue.codeAreas ?? []), ...(issue.references ?? [])]);
}

function normalizePrefix(ref) {
  if (ref.endsWith('/')) {
    return ref;
  }
  return ref;
}

function compareChangedFiles(issue, changedFilesPath) {
  if (!changedFilesPath) {
    return null;
  }

  const absolute = path.isAbsolute(changedFilesPath)
    ? changedFilesPath
    : path.join(repoRoot, changedFilesPath);

  if (!fs.existsSync(absolute)) {
    fail(`Changed-files list does not exist: ${absolute}`);
  }

  const changedFiles = fs
    .readFileSync(absolute, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const refs = expectedPaths(issue);
  const matched = changedFiles.filter((file) =>
    refs.some((ref) => {
      const normalized = normalizePrefix(ref);
      if (normalized.endsWith('/')) {
        return file.startsWith(normalized);
      }
      return file === normalized || file.startsWith(`${normalized}/`) || path.dirname(file) === normalized;
    }),
  );

  return {
    changedFiles,
    matched,
    refs,
  };
}

function runCheck(check) {
  const cwd = path.join(repoRoot, check.cwd);
  console.log(`\n→ ${check.name}`);
  console.log(`  ${check.command.join(' ')}`);

  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!/^ZK-\d{3}$/.test(options.issueKey)) {
    fail('Provide a valid issue key with `--issue-key ZK-###`.');
  }

  const wave = await loadWave();
  const issue = wave.issues.find((candidate) => candidate.key === options.issueKey);
  if (!issue) {
    fail(`Issue ${options.issueKey} was not found in zk-wave-1.`);
  }

  const checks = buildChecks(issue);
  const changedFiles = compareChangedFiles(issue, options.changedFilesPath);

  console.log(`${issue.key}: ${issue.title}`);
  console.log(`Area: ${issue.area}`);
  console.log(`Priority: ${issue.priority}`);
  console.log(`Complexity: ${issue.complexity}`);
  console.log('\nRelevant code:');
  for (const ref of expectedPaths(issue)) {
    console.log(`- ${ref}`);
  }

  if (changedFiles) {
    console.log('\nChanged files matched against issue scope:');
    if (changedFiles.matched.length === 0) {
      console.log('- No exact scope overlap detected; review the PR manually.');
    } else {
      for (const file of changedFiles.matched) {
        console.log(`- ${file}`);
      }
    }
  }

  console.log('\nValidation checks:');
  for (const check of checks) {
    console.log(`- (${check.cwd}) ${check.command.join(' ')}`);
  }

  if (!options.run) {
    return;
  }

  for (const check of checks) {
    runCheck(check);
  }

  console.log('\nAll derived ticket checks passed.');
}

main().catch((error) => {
  fail(error.message);
});
