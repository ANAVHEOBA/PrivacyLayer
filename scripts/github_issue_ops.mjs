#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const positionals = [];
  const options = {
    author: '@me',
    dryRun: false,
    yes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--repo') {
      options.repo = argv[++i];
    } else if (arg === '--author') {
      options.author = argv[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--yes') {
      options.yes = true;
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, options };
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(output || `${command} ${args.join(' ')} failed`);
  }

  return capture ? result.stdout.trim() : '';
}

function inferRepo() {
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  const match = remote.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/);
  if (!match) {
    fail(`Unable to infer GitHub repository from origin remote: ${remote}`);
  }

  return match[1];
}

function ensureGh() {
  try {
    run('gh', ['--version']);
  } catch {
    fail('GitHub CLI is not installed or not available in PATH.');
  }
}

function ensureGhAuth() {
  try {
    run('gh', ['auth', 'status'], { capture: true });
  } catch (error) {
    fail(
      [
        'GitHub CLI authentication is not valid.',
        'Run `gh auth login -h github.com` in your terminal, then rerun this command.',
        '',
        error.message,
      ].join('\n'),
    );
  }
}

async function loadLabels() {
  const moduleUrl = pathToFileURL(path.join(repoRoot, 'ops', 'github', 'labels.mjs')).href;
  const { default: labels } = await import(moduleUrl);
  return labels;
}

async function loadWave(waveId) {
  const modulePath = path.join(repoRoot, 'ops', 'github', 'waves', `${waveId}.mjs`);
  const moduleUrl = pathToFileURL(modulePath).href;

  try {
    const { default: wave } = await import(moduleUrl);
    return wave;
  } catch (error) {
    fail(`Unable to load wave definition "${waveId}": ${error.message}`);
  }
}

function renderSection(title, items) {
  if (!items || items.length === 0) {
    return '';
  }

  return [`## ${title}`, ...items.map((item) => `- ${item}`), ''].join('\n');
}

function renderValidation(issue) {
  return [
    '## Validation',
    `- Inspect derived checks: \`node scripts/zk_ticket_check.mjs --issue-key ${issue.key}\``,
    `- Run derived checks: \`node scripts/zk_ticket_check.mjs --issue-key ${issue.key} --run\``,
    `- Pull requests should include \`Wave Issue Key: ${issue.key}\` in the title or body.`,
    '',
  ].join('\n');
}

function renderBody(wave, issue) {
  const metadata = [
    `Wave: ${wave.title}`,
    `Issue Key: ${issue.key}`,
    `Area: ${issue.area}`,
    `Priority: ${issue.priority}`,
    `Drips Complexity: ${issue.complexity}`,
  ];

  const sections = [
    metadata.join('\n'),
    '',
    '## Summary',
    issue.summary,
    '',
    renderSection('Relevant Code', issue.codeAreas),
    renderSection('Scope', issue.scope),
    renderSection('Acceptance Criteria', issue.acceptance),
    renderSection('Out of Scope', issue.outOfScope),
    renderSection('Dependencies', issue.dependencies?.length ? issue.dependencies : ['None']),
    renderValidation(issue),
    renderSection('References', issue.references),
  ].filter(Boolean);

  return sections.join('\n');
}

function issueLabels(wave, issue) {
  return Array.from(
    new Set([
      'Stellar Wave',
      ...wave.defaultLabels,
      `area: ${issue.area}`,
      `priority: ${issue.priority.toLowerCase()}`,
      `complexity: ${issue.complexity.toLowerCase()}`,
      ...(issue.labels ?? []),
    ]),
  );
}

async function createLabels(repo, dryRun) {
  ensureGh();
  ensureGhAuth();

  const labels = await loadLabels();

  for (const label of labels) {
    const args = [
      'label',
      'create',
      label.name,
      '--color',
      label.color,
      '--description',
      label.description,
      '--force',
      '-R',
      repo,
    ];

    if (dryRun) {
      console.log(`[dry-run] gh ${args.join(' ')}`);
    } else {
      run('gh', args);
    }
  }
}

function listIssues(repo, author) {
  const args = [
    'issue',
    'list',
    '--state',
    'all',
    '--limit',
    '500',
    '--json',
    'number,title,url',
    '-R',
    repo,
  ];

  if (author) {
    args.push('--author', author);
  }

  const output = run('gh', args, { capture: true });
  return JSON.parse(output || '[]');
}

async function deleteIssues(repo, author, dryRun, yes) {
  ensureGh();
  ensureGhAuth();

  const issues = listIssues(repo, author);
  console.log(`Found ${issues.length} issues to delete in ${repo}.`);

  if (!dryRun && !yes) {
    fail('Deletion is destructive. Re-run with `--yes` after reviewing the issue count.');
  }

  for (const issue of issues) {
    const args = ['issue', 'delete', String(issue.number), '--yes', '-R', repo];

    if (dryRun) {
      console.log(`[dry-run] gh ${args.join(' ')}  # ${issue.title}`);
    } else {
      console.log(`Deleting #${issue.number}: ${issue.title}`);
      run('gh', args);
    }
  }
}

async function createWave(repo, waveId, dryRun) {
  ensureGh();
  ensureGhAuth();

  const wave = await loadWave(waveId);
  console.log(`Creating ${wave.issues.length} issues for ${wave.title}.`);

  for (const issue of wave.issues) {
    const labels = issueLabels(wave, issue);
    const args = [
      'issue',
      'create',
      '--title',
      `${issue.key}: ${issue.title}`,
      '--body',
      renderBody(wave, issue),
      '-R',
      repo,
    ];

    for (const label of labels) {
      args.push('--label', label);
    }

    if (dryRun) {
      console.log(`[dry-run] gh issue create --title "${issue.key}: ${issue.title}" ...`);
    } else {
      console.log(`Creating ${issue.key}: ${issue.title}`);
      run('gh', args);
    }
  }
}

async function resetWave(repo, waveId, author, dryRun, yes) {
  await deleteIssues(repo, author, dryRun, yes);
  await createWave(repo, waveId, dryRun);
}

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2));
  const [command, waveId] = positionals;
  const repo = options.repo ?? inferRepo();

  if (!command) {
    fail(
      [
        'Usage:',
        '  node scripts/github_issue_ops.mjs labels [--repo OWNER/REPO] [--dry-run]',
        '  node scripts/github_issue_ops.mjs create-wave <wave-id> [--repo OWNER/REPO] [--dry-run]',
        '  node scripts/github_issue_ops.mjs delete-issues [--repo OWNER/REPO] [--author USER|@me] [--dry-run] [--yes]',
        '  node scripts/github_issue_ops.mjs reset-wave <wave-id> [--repo OWNER/REPO] [--author USER|@me] [--dry-run] [--yes]',
      ].join('\n'),
    );
  }

  if (command === 'labels') {
    await createLabels(repo, options.dryRun);
    return;
  }

  if (command === 'delete-issues') {
    await deleteIssues(repo, options.author, options.dryRun, options.yes);
    return;
  }

  if (!waveId) {
    fail(`Command "${command}" requires a wave id.`);
  }

  if (command === 'create-wave') {
    await createWave(repo, waveId, options.dryRun);
    return;
  }

  if (command === 'reset-wave') {
    await resetWave(repo, waveId, options.author, options.dryRun, options.yes);
    return;
  }

  fail(`Unknown command: ${command}`);
}

main().catch((error) => {
  fail(error.message);
});
