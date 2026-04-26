const defaultOutOfScope = [
  'New wallet UI design and non-ZK frontend polish',
  'Non-pool Soroban features unrelated to proof, artifact, or verifier parity',
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
  labels: 'ops/github/labels.mjs',
  wave2: 'ops/github/waves/zk-wave-2.mjs',
  issueOps: 'scripts/github_issue_ops.mjs',
  zkTicketCheck: 'scripts/zk_ticket_check.mjs',
  rebuildZk: 'scripts/rebuild-zk.sh',
  sdkArtifacts: 'sdk/src/artifacts.ts',
  sdkEncoding: 'sdk/src/encoding.ts',
  sdkPublicInputs: 'sdk/src/public_inputs.ts',
  sdkProof: 'sdk/src/proof.ts',
  sdkWithdraw: 'sdk/src/withdraw.ts',
  sdkDeposit: 'sdk/src/deposit.ts',
  sdkTypes: 'sdk/src/index.ts',
  sdkTests: 'sdk/test/',
  frontendSdk: 'frontend/lib/sdk.ts',
  contractRs: 'contracts/privacy_pool/src/contract.rs',
  contractState: 'contracts/privacy_pool/src/types/state.rs',
  contractEvents: 'contracts/privacy_pool/src/types/events.rs',
  contractConfigStorage: 'contracts/privacy_pool/src/storage/config.rs',
  contractInitialize: 'contracts/privacy_pool/src/core/initialize.rs',
  contractWithdraw: 'contracts/privacy_pool/src/core/withdraw.rs',
  contractDeposit: 'contracts/privacy_pool/src/core/deposit.rs',
  contractUnitTest: 'contracts/privacy_pool/src/test.rs',
  contractIntegrationTest: 'contracts/privacy_pool/src/integration_test.rs',
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
  title: 'PrivacyLayer ZK Wave 3',
  defaultLabels: ['bounty', 'wave: zk-3'],
  issues: [
    zkIssue({
      key: 'ZK-121',
      title: 'Define canonical pool ID derivation from token, denomination, and network domain',
      area: 'foundations',
      priority: 'High',
      complexity: 'High',
      summary:
        'The codebase treats `pool_id` as a first-class value but still does not lock down how it is derived. Add a canonical derivation contract so SDK, contract initialization, fixtures, and operators stop hand-picking pool IDs.',
      scope: [
        'Specify a canonical derivation formula for pool identifiers that binds token identity, denomination, and network domain.',
        'Expose matching helper implementations for Rust and TypeScript so pool creation and proof preparation share the same derivation rules.',
        'Generate cross-stack fixtures that prove the same inputs produce the same pool identifier everywhere.',
      ],
      acceptance: [
        'Pool IDs no longer depend on ad hoc test helpers or manually chosen byte arrays.',
        'Rust and TypeScript derivation helpers agree on canonical pool IDs for the same token and denomination inputs.',
        'Fixtures and tests cover at least XLM and one token-contract-style pool identifier path.',
      ],
      dependencies: ['ZK-029', 'ZK-079'],
      references: refs('readme', 'sdkEncoding', 'sdkDeposit', 'sdkWithdraw', 'contractInitialize', 'contractState', 'contractIntegrationTest'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-122',
      title: 'Add SDK pool-config preflight that validates on-chain pool metadata before deposit and withdraw',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'The SDK should not blindly trust a locally supplied pool identifier and denomination tuple. Add a preflight layer that loads on-chain pool metadata and validates it against the local artifact, schema, and note assumptions before funds or proofs move.',
      scope: [
        'Define a pool-metadata fetch and validation interface for SDK deposit and withdraw flows.',
        'Verify pool existence, denomination, paused state, and verifier metadata before generating commitments or proofs.',
        'Surface stable preflight failures that distinguish missing pool, wrong denomination, stale verifier metadata, and paused-pool conditions.',
      ],
      acceptance: [
        'SDK callers can run one preflight step before deposit or withdraw and receive typed validation errors.',
        'Pool metadata mismatches are caught before proof generation or token transfer attempts begin.',
        'The preflight layer reuses the contract-facing pool config model instead of inventing a parallel schema.',
      ],
      dependencies: ['ZK-074', 'ZK-079', 'ZK-120'],
      references: refs('sdkDeposit', 'sdkWithdraw', 'sdkArtifacts', 'sdkTypes', 'contractRs', 'contractConfigStorage', 'contractState'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-123',
      title: 'Generate Soroban ABI parity snapshots for `PoolId`, `PublicInputs`, `Proof`, and `VerifyingKey`',
      area: 'tooling',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The repo already has witness and verifier-schema drift checks, but the Soroban ABI shapes used by SDK integrations still are not pinned explicitly. Generate ABI parity snapshots for the core contract-facing ZK types and compare them against SDK serializers.',
      scope: [
        'Extract or snapshot the Soroban ABI shape for pool identifiers, public inputs, proof payloads, and verifying keys.',
        'Compare the ABI snapshots against SDK-side serializers and path helpers in automated checks.',
        'Fail clearly on field-order, byte-width, or struct-shape drift rather than waiting for deeper integration failures.',
      ],
      acceptance: [
        'Core contract-facing ZK types have machine-readable ABI snapshots checked into the repo or generated deterministically.',
        'SDK serialization tests compare against ABI snapshots directly.',
        'Reviewers can see when a change altered the contract-facing ZK ABI without reconstructing it manually.',
      ],
      dependencies: ['ZK-071', 'ZK-087'],
      references: refs('sdkArtifacts', 'sdkProof', 'sdkPublicInputs', 'contractRs', 'contractState', 'contractEvents', 'contractUnitTest'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-124',
      title: 'Add a ZK release rehearsal command that rebuilds artifacts, runs stack checks, and dry-runs deployment preflight',
      area: 'tooling',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'The repo has the ingredients for a release bundle and deployment preflight, but not one rehearsable command that exercises them together. Add a release rehearsal path so operators can validate the full ZK stack before a publish or VK rotation.',
      scope: [
        'Chain artifact rebuild, manifest refresh, SDK checks, contract checks, and deployment preflight into one dry-run release rehearsal command.',
        'Emit a compact summary that records artifact version, schema version, verifier metadata, and failing stage if the rehearsal stops early.',
        'Keep the command deterministic enough for CI or release-candidate verification workflows.',
      ],
      acceptance: [
        'One command can rehearse the end-to-end ZK release path without mutating production state.',
        'The rehearsal output identifies whether failure came from artifact rebuild, SDK parity, contract parity, or deployment preflight.',
        'Release engineers no longer need to stitch together multiple scripts manually for a ZK publish dry run.',
      ],
      dependencies: ['ZK-119', 'ZK-120'],
      references: refs('rebuildZk', 'issueOps', 'zkTicketCheck', 'sdkArtifacts', 'sdkTests', 'contractUnitTest', 'contractIntegrationTest', 'frontendSdk'),
      labels: ['testing', 'documentation'],
    }),
  ],
};

if (wave.issues.length !== 4) {
  throw new Error(`Expected 4 issues in zk-wave-3, found ${wave.issues.length}`);
}

export default wave;
