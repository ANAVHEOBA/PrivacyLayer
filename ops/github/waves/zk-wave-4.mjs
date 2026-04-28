const defaultOutOfScope = [
  'New wallet UI design and non-ZK frontend polish',
  'Unrelated Soroban features outside release, proving, or operations hardening',
];

const areaBaseLabels = {
  foundations: ['circuits'],
  commitment: ['circuits'],
  merkle: ['circuits'],
  withdraw: ['circuits'],
  prover: ['circuits'],
  'sdk-zk': [],
  tooling: [],
  testing: ['testing'],
  security: ['security'],
  performance: ['optimization'],
};

const paths = {
  readme: 'README.md',
  sdkArtifacts: 'sdk/src/artifacts.ts',
  sdkBenchmark: 'sdk/src/benchmark.ts',
  sdkReleaseBundle: 'sdk/src/release_bundle.ts',
  sdkTests: 'sdk/test/',
  releasePreflight: 'scripts/zk_release_preflight.mjs',
  refreshManifest: 'scripts/refresh_manifest.mjs',
  checkToolchain: 'scripts/check-toolchain.sh',
  rebuildZk: 'scripts/rebuild-zk.sh',
  vkChecklist: 'docs/vk-rotation-checklist.md',
  contractConfigStorage: 'contracts/privacy_pool/src/storage/config.rs',
  contractState: 'contracts/privacy_pool/src/types/state.rs',
};

const refs = (...keys) => keys.map((key) => paths[key]);

function zkIssue({
  key,
  title,
  area,
  priority,
  complexity,
  summary,
  scope,
  acceptance,
  outOfScope = defaultOutOfScope,
  dependencies = [],
  references = [],
  codeAreas = references,
  labels = [],
}) {
  return {
    key,
    title,
    area,
    priority,
    complexity,
    summary,
    scope,
    acceptance,
    outOfScope,
    dependencies,
    references,
    codeAreas,
    labels: Array.from(new Set([...(areaBaseLabels[area] ?? []), ...labels])),
  };
}

const wave = {
  title: 'PrivacyLayer ZK Wave 4',
  defaultLabels: ['bounty', 'wave: zk-4'],
  issues: [
    zkIssue({
      key: 'ZK-127',
      title: 'Persist proof benchmark baselines in release artifacts and fail on regression thresholds',
      area: 'performance',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The SDK already exposes benchmark helpers, but release rehearsal still does not capture or compare performance baselines in a durable way. Store benchmark output beside the release bundle so cold-start, warm-start, proof throughput, and memory regressions are reviewable with the same artifact version they came from.',
      scope: [
        'Define a machine-readable benchmark baseline format keyed by artifact version, backend, runtime, and benchmark scenario.',
        'Teach release rehearsal or preflight tooling to record fresh benchmark results and compare them against a prior baseline with explicit thresholds.',
        'Store or reference cold-start, warm-start, proof-generation, and memory metrics without requiring reviewers to rerun ad hoc local timing commands.',
      ],
      acceptance: [
        'Benchmark baselines are stored deterministically beside the release bundle or referenced from it.',
        'Configured performance regressions fail clearly during rehearsal or dedicated benchmark checks.',
        'Reviewers can compare release candidates using committed baseline data instead of transient console output.',
      ],
      dependencies: ['ZK-100', 'ZK-119', 'ZK-124'],
      references: refs('sdkBenchmark', 'releasePreflight', 'checkToolchain', 'rebuildZk', 'sdkArtifacts', 'sdkTests'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-128',
      title: 'Generate append-only verifying-key rotation evidence bundles and per-pool logs',
      area: 'security',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The project now has VK rotation guidance and deployment preflight checks, but the operator evidence trail is still manual. Generate a machine-readable rotation record for each pool so old and new VK hashes, manifest identity, and rollback context do not depend on copied terminal output or hand-edited notes.',
      scope: [
        'Capture pre-rotation and post-rotation metadata including pool id, old and new VK hash, manifest hash, circuit id, schema version, operator identity, and timestamp.',
        'Emit an append-only rotation record that can update both machine-readable storage and the human-readable rotation log format.',
        'Reuse deployment-preflight results so a rotation cannot be recorded as successful unless local release metadata matched the target pool metadata.',
      ],
      acceptance: [
        'Each VK rotation produces an evidence bundle tied to one pool and one local release bundle.',
        'Operators no longer hand-assemble rotation hash records from terminal output.',
        'Rollback investigations can compare stored pre- and post-rotation metadata without reconstructing state manually.',
      ],
      dependencies: ['ZK-117', 'ZK-120', 'ZK-124'],
      references: refs('vkChecklist', 'releasePreflight', 'refreshManifest', 'contractConfigStorage', 'contractState', 'sdkArtifacts'),
      labels: ['testing'],
    }),
  ],
};

if (wave.issues.length !== 2) {
  throw new Error(`Expected 2 issues in zk-wave-4, found ${wave.issues.length}`);
}

export default wave;
