const defaultOutOfScope = [
  'Soroban contract changes',
  'Frontend and wallet UI work',
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
  circuitsRoot: 'circuits/Nargo.toml',
  testVectors: 'circuits/TEST_VECTORS.md',
  libRoot: 'circuits/lib/src/lib.nr',
  hashMod: 'circuits/lib/src/hash/mod.nr',
  hashCommitment: 'circuits/lib/src/hash/commitment.nr',
  hashNullifier: 'circuits/lib/src/hash/nullifier.nr',
  hashPair: 'circuits/lib/src/hash/pair.nr',
  hashZeroes: 'circuits/lib/src/hash/zeroes.nr',
  merkleMod: 'circuits/lib/src/merkle/mod.nr',
  merkleConfig: 'circuits/lib/src/merkle/config.nr',
  merkleRoot: 'circuits/lib/src/merkle/root.nr',
  merkleVerify: 'circuits/lib/src/merkle/verify.nr',
  validationMod: 'circuits/lib/src/validation/mod.nr',
  validationFee: 'circuits/lib/src/validation/fee.nr',
  validationRelayer: 'circuits/lib/src/validation/relayer.nr',
  validationNullifier: 'circuits/lib/src/validation/nullifier.nr',
  validationCommitment: 'circuits/lib/src/validation/commitment.nr',
  commitmentCircuit: 'circuits/commitment/src/main.nr',
  commitmentPkg: 'circuits/commitment/Nargo.toml',
  merklePkg: 'circuits/merkle/Nargo.toml',
  withdrawCircuit: 'circuits/withdraw/src/main.nr',
  withdrawPkg: 'circuits/withdraw/Nargo.toml',
  sdkNote: 'sdk/src/note.ts',
  sdkProof: 'sdk/src/proof.ts',
  sdkMerkle: 'sdk/src/merkle.ts',
  sdkDeposit: 'sdk/src/deposit.ts',
  sdkWithdraw: 'sdk/src/withdraw.ts',
  sdkGas: 'sdk/src/gas.ts',
  sdkStealth: 'sdk/src/stealth.ts',
  verifierRs: 'contracts/privacy_pool/src/crypto/verifier.rs',
  issueOps: 'scripts/github_issue_ops.mjs',
  labels: 'ops/github/labels.mjs',
  artifactsDir: 'artifacts/zk/',
  scriptsDir: 'scripts/',
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
  title: 'PrivacyLayer ZK Wave 1',
  defaultLabels: ['bounty', 'wave: zk-1'],
  issues: [
    // Foundations (8)
    zkIssue({
      key: 'ZK-001',
      title: 'Define the canonical BN254 field encoding contract across Noir and TypeScript',
      area: 'foundations',
      priority: 'High',
      complexity: 'High',
      summary:
        'Lock down a single encoding contract for field values, 31-byte note secrets, pool identifiers, and public inputs so witness generation cannot drift between Noir and the SDK.',
      scope: [
        'Introduce shared TypeScript helpers for field normalization, left-padding, and hex/bytes conversion.',
        'Add Noir-side fixtures that assert the same encoded values are interpreted identically in circuit tests.',
        'Reject out-of-range, over-wide, and non-canonical encodings before witness generation starts.',
      ],
      acceptance: [
        'One canonical encoding path is used by note generation, witness preparation, and cross-stack fixtures.',
        'Round-trip tests cover valid, boundary, and invalid encodings.',
        'The withdrawal witness schema no longer relies on ad hoc string formatting.',
      ],
      references: refs('readme', 'sdkNote', 'sdkProof', 'commitmentCircuit', 'withdrawCircuit'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-002',
      title: 'Centralize ZK constants for tree depth, field widths, zero-address semantics, and amount encoding',
      area: 'foundations',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Move critical ZK constants into shared modules so circuits, tests, and SDK utilities stop re-declaring protocol values in multiple places.',
      scope: [
        'Create a single source of truth for tree depth, note byte widths, zero leaf defaults, and relayer zero-address rules.',
        'Expose the constants to both Noir packages and the TypeScript SDK.',
        'Replace hard-coded literals in existing tests and helper code.',
      ],
      acceptance: [
        'Tree depth and note-width changes require editing one logical module per language.',
        'No circuit or SDK file depends on magic numbers for core ZK parameters.',
        'All existing tests remain green after the constant migration.',
      ],
      references: refs('readme', 'libRoot', 'merkleConfig', 'sdkNote', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-003',
      title: 'Extract withdrawal test helpers and fixtures out of the monolithic circuit entrypoint',
      area: 'foundations',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The withdrawal circuit currently carries implementation, helper builders, and tests in one file. Split the test scaffolding into focused support modules so the core spend logic stays readable.',
      scope: [
        'Move path builders, witness builders, and repeated assertions into dedicated Noir helper files.',
        'Keep the public circuit interface stable while reducing `main.nr` sprawl.',
        'Organize tests by happy path, invalid witness, fee/relayer, and replay semantics.',
      ],
      acceptance: [
        'The circuit entrypoint is materially smaller and focused on spend constraints.',
        'Helpers are reusable by future fixture generators and integration tests.',
        'The package test suite remains green with the new layout.',
      ],
      references: refs('withdrawCircuit', 'withdrawPkg', 'testVectors'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-004',
      title: 'Create a canonical circuit fixture generator for notes, roots, siblings, and public inputs',
      area: 'foundations',
      priority: 'High',
      complexity: 'High',
      summary:
        'Build a machine-generated fixture set that both Noir tests and the SDK can consume for note commitments, Merkle paths, and withdrawal public inputs.',
      scope: [
        'Generate deterministic fixtures for deposit notes, Merkle insertions, and withdrawal witnesses.',
        'Store fixture metadata in a format that can be consumed by Node-based ZK tests without manual translation.',
        'Cover normal, boundary, and invalid cases so SDK and circuit tests share the same corpus.',
      ],
      acceptance: [
        'Fixture generation is scripted and reproducible.',
        'Noir and SDK tests read the same canonical vectors for at least commitment and withdrawal flows.',
        'Adding a new fixture does not require editing multiple unrelated packages.',
      ],
      references: refs('testVectors', 'commitmentCircuit', 'merkleMod', 'withdrawCircuit', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-005',
      title: 'Add a pinned build pipeline that compiles every circuit and emits reproducible artifacts',
      area: 'tooling',
      priority: 'High',
      complexity: 'High',
      summary:
        'The repo needs a reproducible ZK build path that compiles the commitment, Merkle, and withdrawal packages with pinned tool versions and a single command.',
      scope: [
        'Create a build entrypoint that compiles all Noir packages from the workspace.',
        'Emit deterministic outputs into a dedicated artifacts directory instead of scattering generated files.',
        'Fail early when the pinned Nargo or backend version is missing or incompatible.',
      ],
      acceptance: [
        'One command produces the full set of ZK artifacts from a clean checkout.',
        'Generated outputs land in a predictable directory layout suitable for SDK consumption.',
        'Version drift is surfaced as a build failure instead of a runtime mismatch.',
      ],
      references: refs('circuitsRoot', 'commitmentPkg', 'merklePkg', 'withdrawPkg', 'artifactsDir'),
    }),
    zkIssue({
      key: 'ZK-006',
      title: 'Track artifact hashes, backend versions, and circuit identifiers in a manifest',
      area: 'tooling',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Proof generation and verification need a manifest that records which circuit build and backend version produced each artifact set.',
      scope: [
        'Generate a manifest with circuit names, hashes, backend versions, and output filenames.',
        'Expose the manifest to the SDK so proof generation can validate it before running.',
        'Make the manifest part of the reproducible build output instead of a hand-maintained file.',
      ],
      acceptance: [
        'Every generated artifact set includes a machine-readable manifest.',
        'The SDK can refuse to use missing or mismatched artifacts.',
        'Artifact provenance is testable from CI.',
      ],
      dependencies: ['ZK-005'],
      references: refs('circuitsRoot', 'sdkProof', 'artifactsDir'),
    }),
    zkIssue({
      key: 'ZK-007',
      title: 'Normalize witness field names and schema shape between Noir and SDK code',
      area: 'foundations',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'The SDK witness payload still uses placeholder field names and does not line up cleanly with the Noir circuit inputs. Standardize the schema before the proof wrapper hardens around the wrong shape.',
      scope: [
        'Define a single witness schema for commitment and withdrawal circuits.',
        'Rename fields where necessary so Noir parameter names, SDK objects, and fixture data align.',
        'Eliminate placeholder fields and ambiguous naming such as mixed snake_case versus ad hoc labels.',
      ],
      acceptance: [
        'Witness preparation produces a schema that mirrors the Noir entrypoints exactly.',
        'Fixture generation and prover wrappers consume the same schema without manual remapping.',
        'The SDK no longer contains placeholder witness values.',
      ],
      references: refs('commitmentCircuit', 'withdrawCircuit', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-008',
      title: 'Add a shared public-input encoding layer for root, nullifier hash, addresses, amount, relayer, and fee',
      area: 'foundations',
      priority: 'High',
      complexity: 'High',
      summary:
        'Public inputs are the verifier boundary for the whole protocol. Add a dedicated encoding layer instead of embedding conversions across note, proof, and contract-adjacent code.',
      scope: [
        'Create a shared module that encodes each withdrawal public input into canonical field elements and serialized bytes.',
        'Wire the module into witness preparation and proof formatting.',
        'Cover zero values, boundary amounts, and invalid Stellar address input.',
      ],
      acceptance: [
        'All public-input encoding is routed through one shared API.',
        'The SDK and generated fixtures agree on encoded values for all withdrawal public inputs.',
        'The proof-formatting path documents inputs through code and tests rather than comments alone.',
      ],
      dependencies: ['ZK-001', 'ZK-007'],
      references: refs('withdrawCircuit', 'sdkProof', 'verifierRs'),
      labels: ['testing'],
    }),

    // Commitment (10)
    zkIssue({
      key: 'ZK-009',
      title: 'Replace the placeholder SDK commitment implementation with real Poseidon-compatible hashing',
      area: 'commitment',
      priority: 'High',
      complexity: 'High',
      summary:
        '`sdk/src/note.ts` still returns a zero buffer for commitments. Implement a real Poseidon-based commitment path that matches Noir semantics exactly.',
      scope: [
        'Integrate a Poseidon implementation compatible with the Noir circuit and Stellar BN254 field rules.',
        'Return real commitments from note generation instead of placeholder bytes.',
        'Add tests that compare SDK commitments against canonical fixture outputs.',
      ],
      acceptance: [
        '`Note.getCommitment()` produces the same value as the commitment circuit for the same note.',
        'The SDK rejects malformed note material before hashing.',
        'Placeholder zero commitments are fully removed from the ZK path.',
      ],
      references: refs('sdkNote', 'commitmentCircuit', 'hashCommitment'),
    }),
    zkIssue({
      key: 'ZK-010',
      title: 'Add cross-stack commitment test vectors for Noir, SDK, and generated fixtures',
      area: 'commitment',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Commitment values need one shared test corpus that proves the circuit, SDK, and fixture generator all produce identical outputs for the same notes.',
      scope: [
        'Create vectors for basic, boundary, zero, and malformed input cases.',
        'Use the vectors in both Noir tests and Node-based SDK tests.',
        'Fail CI when any implementation produces a divergent commitment.',
      ],
      acceptance: [
        'At least one shared fixture set drives both commitment package tests and SDK tests.',
        'Boundary cases around field width and zero values are covered.',
        'The test corpus is versioned with the artifacts that depend on it.',
      ],
      dependencies: ['ZK-004', 'ZK-009'],
      references: refs('testVectors', 'commitmentCircuit', 'sdkNote'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-011',
      title: 'Add explicit domain separation tags to note commitments',
      area: 'commitment',
      priority: 'High',
      complexity: 'High',
      summary:
        'Commitments should be domain-separated from Merkle node hashes and nullifier hashes so the protocol does not rely on positional conventions alone.',
      scope: [
        'Define a domain-separation scheme for note commitments inside the hash input layout.',
        'Update the Noir hash helper and SDK commitment path together.',
        'Add regression tests that prove commitment, nullifier, and Merkle hashing occupy distinct domains.',
      ],
      acceptance: [
        'Commitment hashing uses an explicit domain-separated preimage format.',
        'Cross-stack fixtures are updated to the new encoding.',
        'Regression tests catch accidental reuse of the old hash domain.',
      ],
      dependencies: ['ZK-001', 'ZK-009'],
      references: refs('hashCommitment', 'hashNullifier', 'hashPair', 'commitmentCircuit', 'sdkNote'),
    }),
    zkIssue({
      key: 'ZK-012',
      title: 'Bind pool identifiers into the note commitment preimage',
      area: 'commitment',
      priority: 'High',
      complexity: 'High',
      summary:
        'A note should be intrinsically scoped to one pool so identical note secrets cannot be replayed across pools by accident or by design.',
      scope: [
        'Extend the note preimage to include pool identity in a canonical way.',
        'Update note generation, commitment hashing, and commitment fixtures.',
        'Add regression tests for same-secret notes across different pool identifiers.',
      ],
      acceptance: [
        'Two notes with the same secret material but different pool identifiers yield different commitments.',
        'The SDK note model and commitment circuit agree on the updated preimage.',
        'Existing tests are migrated to the new pool-scoped commitment scheme.',
      ],
      dependencies: ['ZK-001', 'ZK-011'],
      references: refs('readme', 'sdkNote', 'commitmentCircuit', 'hashCommitment'),
    }),
    zkIssue({
      key: 'ZK-013',
      title: 'Bind denomination or amount class into the note commitment preimage',
      area: 'commitment',
      priority: 'High',
      complexity: 'High',
      summary:
        'The README describes fixed-denomination shielded pools. Encode denomination semantics into the note commitment so notes cannot be reused across amount classes.',
      scope: [
        'Represent denomination as a canonical field input instead of a free-form runtime string.',
        'Update note generation and commitment hashing to include the amount class.',
        'Add tests for same note secrets used under multiple denominations.',
      ],
      acceptance: [
        'Commitments differ when only the denomination changes.',
        'Witness builders and fixtures treat denomination as protocol data, not display metadata.',
        'The amount class is available for downstream withdrawal proof checks.',
      ],
      dependencies: ['ZK-001', 'ZK-012'],
      references: refs('readme', 'sdkNote', 'commitmentCircuit'),
    }),
    zkIssue({
      key: 'ZK-014',
      title: 'Implement versioned note serialization with integrity checks',
      area: 'commitment',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'The note backup format should be protocol-aware and tamper-evident, not just a raw concatenation of buffers.',
      scope: [
        'Introduce a version byte, fixed field ordering, and an integrity checksum or MAC-friendly format for note export.',
        'Preserve room for future note format changes without ambiguous decoding.',
        'Keep the serialization format compatible with deterministic fixtures.',
      ],
      acceptance: [
        'Serialized notes are versioned and validate their own structure before import.',
        'Corrupted or truncated notes fail fast with explicit errors.',
        'Round-trip tests cover legacy-free notes with pool and denomination metadata.',
      ],
      dependencies: ['ZK-012', 'ZK-013'],
      references: refs('sdkNote'),
    }),
    zkIssue({
      key: 'ZK-015',
      title: 'Harden note deserialization against malformed, truncated, and ambiguous note strings',
      area: 'commitment',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Import paths are security-sensitive. Tighten note parsing so malformed strings cannot silently produce invalid witness material.',
      scope: [
        'Validate prefix, byte length, checksum, version, and per-field bounds during note import.',
        'Reject ambiguous amount encodings and malformed pool identifiers.',
        'Add targeted negative tests for corrupted and hand-edited notes.',
      ],
      acceptance: [
        'Malformed note strings are rejected before any witness generation starts.',
        'Deserialization errors distinguish structural failure from checksum failure.',
        'The parser accepts only the canonical note format introduced by the SDK.',
      ],
      dependencies: ['ZK-014'],
      references: refs('sdkNote'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-016',
      title: 'Add deterministic note derivation for fixtures, seeded tests, and recovery flows',
      area: 'commitment',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Random note generation is correct for production, but deterministic note derivation is needed for reproducible fixtures and wallet recovery-style flows.',
      scope: [
        'Expose a seeded note derivation path separate from production randomness.',
        'Ensure derived notes still honor the canonical field-width constraints.',
        'Use the deterministic path for fixture generation and repeatable SDK tests.',
      ],
      acceptance: [
        'The same seed, pool, and denomination always produce the same note.',
        'The deterministic path is isolated from default production note generation.',
        'Fixture generation no longer depends on hand-picked hard-coded notes.',
      ],
      dependencies: ['ZK-001', 'ZK-014'],
      references: refs('sdkNote', 'testVectors'),
    }),
    zkIssue({
      key: 'ZK-017',
      title: 'Add domain-separated nullifier hashing with cross-stack fixtures',
      area: 'commitment',
      priority: 'High',
      complexity: 'High',
      summary:
        'Nullifier hashing should be treated as its own protocol domain with dedicated fixtures, rather than an incidental helper under withdrawal logic.',
      scope: [
        'Define the final nullifier hash input layout and domain separator.',
        'Implement the same behavior in Noir helpers and the SDK proof path.',
        'Build fixtures that compare nullifier hashes across both implementations.',
      ],
      acceptance: [
        'Nullifier hashing is testable in isolation from the withdrawal entrypoint.',
        'The SDK no longer carries placeholder nullifier hash values.',
        'Regression tests fail if commitment and nullifier domains are conflated.',
      ],
      dependencies: ['ZK-001', 'ZK-011'],
      references: refs('hashNullifier', 'validationNullifier', 'withdrawCircuit', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-018',
      title: 'Build an edge-case commitment regression corpus for collisions, symmetry, and near-field values',
      area: 'commitment',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Preserve the current commitment guarantees with a durable regression set that covers symmetry, adjacency, zero, and near-field-limit cases.',
      scope: [
        'Expand commitment fixtures for collision-resistance smoke tests and edge-case inputs.',
        'Assert that swapped inputs and adjacent inputs remain distinguishable.',
        'Use the corpus in both Noir tests and SDK tests.',
      ],
      acceptance: [
        'The corpus includes symmetry, near-max, zero, and incremental-delta cases.',
        'New hash changes cannot land without updating and revalidating the corpus.',
        'The same corpus is consumed by both language stacks.',
      ],
      dependencies: ['ZK-010'],
      references: refs('commitmentCircuit', 'hashCommitment', 'sdkNote'),
      labels: ['testing'],
    }),

    // Merkle (10)
    zkIssue({
      key: 'ZK-019',
      title: 'Derive zero-value Merkle nodes from a canonical seed instead of ad hoc zero siblings',
      area: 'merkle',
      priority: 'High',
      complexity: 'High',
      summary:
        'The Merkle helpers currently lean on raw zero siblings in many tests. Replace that with a canonical zero-node ladder so empty-tree semantics are explicit and reusable.',
      scope: [
        'Define a zero-leaf seed and derive per-level zero hashes deterministically.',
        'Expose the zero-node ladder to circuit helpers and SDK tree code.',
        'Update tests that currently assume direct zero siblings at every level.',
      ],
      acceptance: [
        'Zero-node derivation is centralized and reusable.',
        'Empty-tree and sparse-tree roots are reproducible across Noir and SDK code.',
        'Tests no longer rely on hidden assumptions about zero siblings.',
      ],
      references: refs('hashZeroes', 'merkleConfig', 'merkleRoot', 'merkleVerify', 'sdkMerkle'),
    }),
    zkIssue({
      key: 'ZK-020',
      title: 'Add explicit leaf-index bit decomposition and range checks for Merkle proofs',
      area: 'merkle',
      priority: 'High',
      complexity: 'High',
      summary:
        'Leaf index handling should be explicit and bounded so witnesses outside the tree range cannot flow through as arbitrary field elements.',
      scope: [
        'Decompose the leaf index into exactly 20 bits inside the Merkle verification path.',
        'Reject indices outside the fixed-depth tree range.',
        'Cover boundary indices, especially `0` and `2^20 - 1`.',
      ],
      acceptance: [
        'Indices larger than the tree capacity fail deterministically.',
        'In-circuit left/right decisions are driven by explicit bits rather than unchecked field arithmetic.',
        'Boundary tests prove index handling at the full tree range.',
      ],
      references: refs('merkleRoot', 'merkleVerify', 'withdrawCircuit'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-021',
      title: 'Create reusable Merkle path builders for non-trivial sibling sets and arbitrary leaf positions',
      area: 'merkle',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Current helpers overfit the all-zero-sibling case. Add reusable builders for realistic paths so later tests do not duplicate path math by hand.',
      scope: [
        'Add helper utilities for constructing paths with custom sibling arrays and arbitrary indices.',
        'Support both Noir tests and fixture generation from the same logical builder.',
        'Keep the helpers independent from the withdrawal entrypoint.',
      ],
      acceptance: [
        'Tests can construct realistic non-zero sibling paths without inline duplication.',
        'Fixture generation uses the same path builder logic.',
        'The Merkle package exposes helpers suitable for wider ZK test coverage.',
      ],
      dependencies: ['ZK-019', 'ZK-020'],
      references: refs('merkleRoot', 'merkleVerify', 'withdrawCircuit', 'testVectors'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-022',
      title: 'Implement a TypeScript incremental Merkle tree that exactly matches Noir hash ordering',
      area: 'merkle',
      priority: 'High',
      complexity: 'High',
      summary:
        'The SDK needs a local Merkle tree implementation for note tracking and proof generation. It must match Noir hash ordering, zero-node derivation, and index semantics exactly.',
      scope: [
        'Implement insert, root computation, path extraction, and leaf indexing in the SDK.',
        'Use the same zero-node ladder and child ordering as the circuit helpers.',
        'Add tests that compare SDK roots and paths against canonical fixtures.',
      ],
      acceptance: [
        'The SDK can reproduce the same root and path as Noir for shared fixtures.',
        'The tree implementation exposes enough metadata for withdrawal witness preparation.',
        'Left/right ordering mismatches are caught by tests.',
      ],
      dependencies: ['ZK-019', 'ZK-020'],
      references: refs('sdkMerkle', 'merkleRoot', 'merkleVerify'),
    }),
    zkIssue({
      key: 'ZK-023',
      title: 'Define the client-side Merkle synchronization format for leaves, checkpoints, and root snapshots',
      area: 'merkle',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'Proof generation will require the SDK to rebuild the tree from fetched deposits. Define a sync format that can be persisted and resumed without recomputing everything on every run.',
      scope: [
        'Specify how leaves, indices, roots, and checkpoints are represented in SDK storage.',
        'Support incremental updates and restart-safe checkpoints.',
        'Keep the format independent from any frontend persistence layer.',
      ],
      acceptance: [
        'The SDK can persist and restore local tree state from checkpoints.',
        'Leaf ordering and root snapshots are deterministic after reload.',
        'The sync format is usable by proof generation code without extra remapping.',
      ],
      dependencies: ['ZK-022'],
      references: refs('readme', 'sdkMerkle', 'sdkWithdraw'),
    }),
    zkIssue({
      key: 'ZK-024',
      title: 'Add cross-stack Merkle inclusion vectors shared by circuit and SDK tests',
      area: 'merkle',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'The Merkle implementation needs a single fixture corpus that proves roots and paths match between Noir and TypeScript for real leaves and sibling sets.',
      scope: [
        'Generate vectors for empty, sparse, and non-trivial trees.',
        'Include both valid and intentionally invalid path cases.',
        'Use the vectors in Merkle package tests, withdrawal tests, and SDK tests.',
      ],
      acceptance: [
        'At least one shared vector corpus is consumed by both stacks.',
        'Invalid paths and tampered siblings are represented in the corpus.',
        'The corpus covers non-zero indices and non-zero siblings.',
      ],
      dependencies: ['ZK-004', 'ZK-021', 'ZK-022'],
      references: refs('testVectors', 'merklePkg', 'withdrawCircuit', 'sdkMerkle'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-025',
      title: 'Generate empty-tree and bootstrap-root fixtures for each pool and denomination class',
      area: 'merkle',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Pool initialization needs canonical empty-tree roots so the SDK and circuit fixtures agree from the first deposit onward.',
      scope: [
        'Generate empty-root fixtures derived from the canonical zero-node ladder.',
        'Cover each supported pool or denomination class once commitment scoping lands.',
        'Expose the fixtures to withdrawal witness builders and SDK tests.',
      ],
      acceptance: [
        'Empty-tree roots are deterministic and fixture-backed.',
        'Bootstrap roots are derived from protocol data rather than hand-entered values.',
        'The SDK can initialize a local tree from a canonical empty-root fixture.',
      ],
      dependencies: ['ZK-019', 'ZK-012', 'ZK-013'],
      references: refs('readme', 'merkleConfig', 'sdkMerkle'),
    }),
    zkIssue({
      key: 'ZK-026',
      title: 'Support variable-depth offline tooling while keeping the production circuit depth fixed',
      area: 'merkle',
      priority: 'Low',
      complexity: 'Medium',
      summary:
        'Production remains fixed at depth 20, but tooling and tests benefit from smaller trees for fast fixture generation and debugging.',
      scope: [
        'Allow SDK and offline helpers to instantiate smaller test trees without changing the production withdrawal circuit depth.',
        'Keep depth-20 as the only supported production artifact target.',
        'Ensure the fixture generator can emit vectors for both miniature and production-sized trees.',
      ],
      acceptance: [
        'Offline tests can run against small trees without forking the main protocol logic.',
        'Depth configuration cannot accidentally change the production circuit package.',
        'Fixture tooling clearly distinguishes offline depth from production depth.',
      ],
      dependencies: ['ZK-022'],
      references: refs('merkleConfig', 'sdkMerkle', 'circuitsRoot'),
    }),
    zkIssue({
      key: 'ZK-027',
      title: 'Build a full-level sibling tamper matrix for Merkle regression testing',
      area: 'merkle',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'A single tampered-sibling test is not enough. Add a regression matrix that mutates every Merkle level so index and ordering bugs do not hide behind shallow coverage.',
      scope: [
        'Generate one invalid witness per Merkle level by mutating exactly one sibling.',
        'Cover both left and right leaf positions.',
        'Run the matrix in Noir tests and, where practical, SDK verification helpers.',
      ],
      acceptance: [
        'Each of the 20 levels has dedicated tamper coverage.',
        'The matrix distinguishes wrong sibling values from wrong indices.',
        'The regression suite is cheap enough to run in CI.',
      ],
      dependencies: ['ZK-021', 'ZK-024'],
      references: refs('merkleVerify', 'withdrawCircuit', 'sdkMerkle'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-028',
      title: 'Add randomized Merkle property tests for inserts, roots, and path validity',
      area: 'merkle',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'Augment the hand-picked vectors with randomized property tests so tree edge cases are exercised beyond the static fixture set.',
      scope: [
        'Generate random leaves and insertion orders in the SDK test suite.',
        'Compare roots and paths against deterministic recomputation and fixture-derived expectations.',
        'Focus on invariants such as path validity, root determinism, and index preservation.',
      ],
      acceptance: [
        'Property tests run deterministically from a seeded RNG.',
        'Randomized cases cover more than simple all-zero-path examples.',
        'Failures print enough state to reproduce the bad case as a fixed regression.',
      ],
      dependencies: ['ZK-022', 'ZK-024'],
      references: refs('sdkMerkle', 'merkleRoot', 'merkleVerify'),
      labels: ['testing'],
    }),

    // Withdraw (12)
    zkIssue({
      key: 'ZK-029',
      title: 'Extend the withdrawal proof schema with an explicit pool identifier input',
      area: 'withdraw',
      priority: 'High',
      complexity: 'High',
      summary:
        'Withdrawal proofs should carry explicit pool identity so proof semantics are unambiguous and pool-scoped values do not depend on off-chain conventions alone.',
      scope: [
        'Add `pool_id` to the withdrawal witness or public input schema as appropriate.',
        'Update fixture generation, witness preparation, and test coverage for pool-scoped spends.',
        'Ensure the value is encoded canonically and available at the verifier boundary.',
      ],
      acceptance: [
        'Withdrawal witness preparation requires a pool identifier.',
        'Proof fixtures differ when only `pool_id` changes.',
        'The withdrawal circuit and SDK witness schema stay aligned after the change.',
      ],
      dependencies: ['ZK-001', 'ZK-012', 'ZK-008'],
      references: refs('readme', 'withdrawCircuit', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-030',
      title: 'Bind fixed denomination semantics into the withdrawal proof instead of relying on a free-form amount',
      area: 'withdraw',
      priority: 'High',
      complexity: 'High',
      summary:
        'The protocol is built around fixed-denomination pools. Rework the withdrawal input semantics so amount class is enforced as protocol data, not a loosely formatted public input.',
      scope: [
        'Represent denomination with a canonical value that matches the note commitment model.',
        'Ensure witness generation and fixtures use the same denomination semantics as commitment generation.',
        'Add tests for same note secrets under different denominations.',
      ],
      acceptance: [
        'Withdrawal proofs are denomination-aware and consistent with note commitments.',
        'The SDK cannot prepare a withdrawal witness with mismatched note and amount class.',
        'Regression tests cover mismatched denomination scenarios.',
      ],
      dependencies: ['ZK-013', 'ZK-029'],
      references: refs('readme', 'withdrawCircuit', 'sdkProof', 'sdkNote'),
    }),
    zkIssue({
      key: 'ZK-031',
      title: 'Implement canonical Stellar address-to-field encoding for recipient and relayer inputs',
      area: 'withdraw',
      priority: 'High',
      complexity: 'High',
      summary:
        'The SDK currently passes address strings directly into witness preparation. Add a canonical address-to-field encoding layer for recipient and relayer values.',
      scope: [
        'Define how Stellar addresses map into field elements for the withdrawal circuit.',
        'Support the explicit zero-relayer case without reusing a magic string literal.',
        'Add invalid-address tests and boundary coverage for both recipient and relayer fields.',
      ],
      acceptance: [
        'Witness preparation converts addresses to canonical field inputs before proof generation.',
        'Invalid and malformed addresses fail fast.',
        'The relayer zero case is represented explicitly, not by a hard-coded address string.',
      ],
      dependencies: ['ZK-008'],
      references: refs('withdrawCircuit', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-032',
      title: 'Create a single public-input packing schema for withdrawal proofs',
      area: 'withdraw',
      priority: 'High',
      complexity: 'High',
      summary:
        'Proof formatting needs a stable public-input ordering and byte layout that both the SDK and verifier boundary understand.',
      scope: [
        'Define the exact order and encoding of withdrawal public inputs.',
        'Use the same schema for witness prep, proof formatting, and generated fixtures.',
        'Prevent accidental reordering through shared helpers and tests.',
      ],
      acceptance: [
        'One packing schema is used from witness generation through proof formatting.',
        'Golden tests fail if the input order changes.',
        'The schema covers root, nullifier hash, pool identifier, addresses, denomination, and fee-related fields.',
      ],
      dependencies: ['ZK-008', 'ZK-029', 'ZK-030', 'ZK-031'],
      references: refs('withdrawCircuit', 'sdkProof', 'verifierRs'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-033',
      title: 'Enforce the leaf-index range inside the withdrawal circuit',
      area: 'withdraw',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Leaf indices should be validated in the spend circuit itself so oversized field values cannot masquerade as in-range Merkle positions.',
      scope: [
        'Reuse the Merkle range-check machinery from the shared library inside the withdrawal entrypoint.',
        'Add explicit tests for `0`, `2^20 - 1`, and out-of-range indices.',
        'Ensure witness preparation preserves integer indices cleanly through encoding.',
      ],
      acceptance: [
        'Out-of-range indices fail before a proof can be accepted.',
        'Boundary values are covered by tests.',
        'The same index rules apply in Merkle helpers and full withdrawal proofs.',
      ],
      dependencies: ['ZK-020'],
      references: refs('withdrawCircuit', 'merkleVerify', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-034',
      title: 'Reject empty or non-canonical root values at the withdrawal proof boundary',
      area: 'withdraw',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The root input should not rely solely on downstream contract checks. Add circuit-adjacent validation for obviously invalid or non-canonical root encodings.',
      scope: [
        'Define canonical root encoding rules for witness preparation.',
        'Reject zero or structurally invalid root values before proving.',
        'Cover empty-tree and malformed-root cases in fixtures and tests.',
      ],
      acceptance: [
        'Witness generation refuses obviously invalid root inputs.',
        'The withdrawal proof path distinguishes malformed roots from valid historical roots.',
        'Fixtures include malformed-root negative cases.',
      ],
      dependencies: ['ZK-001', 'ZK-008'],
      references: refs('withdrawCircuit', 'sdkProof', 'sdkMerkle'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-035',
      title: 'Rework nullifier hashing so spend identifiers are pool-scoped rather than root-scoped',
      area: 'withdraw',
      priority: 'High',
      complexity: 'High',
      summary:
        'The current circuit derives `nullifier_hash` from the root. Rework the spend-identifier scheme so it is anchored to stable pool-scoped note semantics instead of a particular tree snapshot.',
      scope: [
        'Choose and implement the final pool-scoped nullifier derivation layout.',
        'Update the withdrawal circuit, SDK witness prep, and fixtures together.',
        'Add replay and cross-root regression tests for the new scheme.',
      ],
      acceptance: [
        'Spend identifiers remain stable across historical roots for the same note and pool.',
        'Cross-pool replays are rejected by construction.',
        'The placeholder root-bound nullifier logic is fully removed from witness preparation.',
      ],
      dependencies: ['ZK-017', 'ZK-029'],
      references: refs('hashNullifier', 'withdrawCircuit', 'sdkProof', 'validationNullifier'),
    }),
    zkIssue({
      key: 'ZK-036',
      title: 'Harden relayer and fee semantics for zero-relayer, max-fee, and malformed combinations',
      area: 'withdraw',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The spend circuit already checks basic fee rules. Expand the semantics so relayer encoding and fee combinations are explicit and regression-tested.',
      scope: [
        'Replace magic zero-relayer conventions with a canonical encoding rule.',
        'Test `fee = 0`, `fee = amount`, `fee > amount`, and malformed relayer combinations.',
        'Keep the rules aligned between validation helpers and SDK witness prep.',
      ],
      acceptance: [
        'All relayer/fee combinations follow one encoded rule set.',
        'Negative tests cover malformed zero-relayer and non-zero-fee inputs.',
        'Witness preparation cannot silently produce invalid relayer combinations.',
      ],
      dependencies: ['ZK-031'],
      references: refs('withdrawCircuit', 'validationFee', 'validationRelayer', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-037',
      title: 'Build a negative test matrix for tampered recipient, relayer, denomination, and fee inputs',
      area: 'withdraw',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Protect the proof boundary with targeted failure cases that tamper exactly one public input at a time.',
      scope: [
        'Create one failure case per major public input field.',
        'Use canonical valid witnesses and mutate only the targeted field for each test.',
        'Apply the matrix to circuit tests and, where possible, SDK witness-validation tests.',
      ],
      acceptance: [
        'Each public input has at least one dedicated tamper test.',
        'Failures are attributable to a single mutated field.',
        'The matrix is easy to extend when public inputs evolve.',
      ],
      dependencies: ['ZK-032', 'ZK-036'],
      references: refs('withdrawCircuit', 'sdkProof', 'testVectors'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-038',
      title: 'Expand withdrawal fixtures to realistic non-zero sibling paths and non-zero leaf indices',
      area: 'withdraw',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Most spend tests still gravitate toward simple paths. Add realistic fixtures that use deep non-zero siblings, non-zero indices, and varied pool contexts.',
      scope: [
        'Generate withdrawal fixtures from realistic sparse Merkle trees.',
        'Cover notes inserted at multiple indices rather than only index zero.',
        'Use the same fixture set in the SDK proof path tests.',
      ],
      acceptance: [
        'Withdrawal tests are no longer dominated by all-zero sibling cases.',
        'At least one fixture uses deep non-zero siblings and a non-zero leaf index.',
        'The SDK can prepare witnesses for the same realistic fixtures.',
      ],
      dependencies: ['ZK-021', 'ZK-024'],
      references: refs('withdrawCircuit', 'sdkProof', 'sdkMerkle', 'testVectors'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-039',
      title: 'Extract withdrawal witness builders into reusable support code for future spend variants',
      area: 'withdraw',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Prepare for future spend variants by isolating withdrawal witness assembly from the entrypoint tests and ad hoc fixture logic.',
      scope: [
        'Create reusable witness-builder helpers for valid and invalid withdrawal cases.',
        'Keep spend construction logic out of individual tests wherever possible.',
        'Use the same builder patterns in fixture generation and SDK comparison tests.',
      ],
      acceptance: [
        'Withdrawal tests use shared builders instead of repeating raw witness assembly.',
        'Future spend variants can reuse the helper structure without rewriting basic witness logic.',
        'The builder layer stays aligned with the canonical witness schema.',
      ],
      dependencies: ['ZK-003', 'ZK-007'],
      references: refs('withdrawCircuit', 'testVectors', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-040',
      title: 'Split the spend core logic from the test-heavy withdrawal package surface',
      area: 'withdraw',
      priority: 'Low',
      complexity: 'Medium',
      summary:
        'Create a clearer package boundary between spend constraints, helper code, and test scaffolding so the withdrawal module can grow without collapsing back into a single giant file.',
      scope: [
        'Separate reusable spend logic into smaller Noir modules.',
        'Keep the public entrypoint stable while reducing coupling between circuit code and tests.',
        'Make room for future variants such as alternate proof wrappers without bloating the main file.',
      ],
      acceptance: [
        'Core spend logic resides in focused modules rather than a single entrypoint file.',
        'Tests and helper code are structurally separated from core constraints.',
        'The package remains easy to navigate for wave contributors.',
      ],
      dependencies: ['ZK-003', 'ZK-039'],
      references: refs('withdrawCircuit', 'libRoot'),
    }),

    // Prover / artifacts (10)
    zkIssue({
      key: 'ZK-041',
      title: 'Create a versioned `artifacts/zk` layout for compiled circuits and proving assets',
      area: 'prover',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'The repo needs a predictable location and layout for compiled circuits, proving metadata, and generated assets consumed by the SDK.',
      scope: [
        'Define the directory structure for compiled circuits, manifests, fixtures, and future proving assets.',
        'Keep generated outputs grouped by circuit and version.',
        'Wire the layout into the ZK build script instead of relying on default tool output paths.',
      ],
      acceptance: [
        'Compiled artifacts land under one versioned directory tree.',
        'The SDK can locate artifacts without hard-coded ad hoc paths.',
        'Artifact layout changes are centralized and testable.',
      ],
      dependencies: ['ZK-005', 'ZK-006'],
      references: refs('artifactsDir', 'sdkProof', 'issueOps'),
    }),
    zkIssue({
      key: 'ZK-042',
      title: 'Generate proving and verification keys for commitment and withdrawal circuits',
      area: 'prover',
      priority: 'High',
      complexity: 'High',
      summary:
        'Move beyond compiled circuits and generate the key material needed for real proof generation and verification workflows.',
      scope: [
        'Produce proving and verification keys for the commitment and withdrawal circuits.',
        'Store the key outputs alongside the artifact manifest and compiled circuits.',
        'Add checks that key generation uses the pinned backend version.',
      ],
      acceptance: [
        'Both core circuits have generated key material in the artifact tree.',
        'Key generation is reproducible from the scripted build path.',
        'The manifest records the provenance of the generated keys.',
      ],
      dependencies: ['ZK-041'],
      references: refs('artifactsDir', 'commitmentPkg', 'withdrawPkg'),
    }),
    zkIssue({
      key: 'ZK-043',
      title: 'Implement a NoirJS or backend wrapper for witness construction and proof generation',
      area: 'prover',
      priority: 'High',
      complexity: 'High',
      summary:
        'The SDK needs a real proving adapter that consumes canonical witnesses and artifacts to produce proofs, rather than placeholder wrappers.',
      scope: [
        'Wrap witness generation, proof creation, and artifact loading in a single SDK-facing API.',
        'Keep the adapter backend-aware without leaking backend-specific assumptions through the whole SDK.',
        'Surface actionable errors for missing artifacts and malformed witnesses.',
      ],
      acceptance: [
        'A real proof generation path exists for the withdrawal circuit.',
        'The adapter consumes the canonical witness schema and artifact manifest.',
        'Proof generation failures are surfaced with typed or classified errors.',
      ],
      dependencies: ['ZK-006', 'ZK-042'],
      references: refs('sdkProof', 'sdkWithdraw', 'artifactsDir'),
    }),
    zkIssue({
      key: 'ZK-044',
      title: 'Normalize Groth16 proof bytes into the layout expected by the Soroban verifier boundary',
      area: 'prover',
      priority: 'High',
      complexity: 'High',
      summary:
        'Raw proof bytes are not yet normalized into the A/B/C point layout that the Soroban verifier boundary expects. Add a dedicated translation layer.',
      scope: [
        'Parse backend proof output into explicit Groth16 components.',
        'Encode those components into the byte layout expected by the existing verifier boundary.',
        'Add cross-checks with known-good proof artifacts and fixtures.',
      ],
      acceptance: [
        'Proof formatting is implemented in one dedicated module instead of a placeholder buffer wrapper.',
        'Golden tests confirm component extraction and byte layout.',
        'Formatting changes fail loudly against fixtures instead of silently changing proof bytes.',
      ],
      dependencies: ['ZK-032', 'ZK-043'],
      references: refs('sdkProof', 'verifierRs'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-045',
      title: 'Encode withdrawal public inputs for the verifier boundary using the canonical packing schema',
      area: 'prover',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Once the public-input order is finalized, implement the exact bytes or field list that the verifier boundary consumes so no layer improvises its own order.',
      scope: [
        'Serialize public inputs from the canonical schema into the proof payload.',
        'Share the same code path between proof generation and off-chain verification tests.',
        'Refuse missing or misordered public inputs before proof formatting completes.',
      ],
      acceptance: [
        'The verifier-facing public-input layout is produced by one shared implementation.',
        'Golden tests assert byte order and field order.',
        'Proof payload construction fails on schema mismatch.',
      ],
      dependencies: ['ZK-032', 'ZK-044'],
      references: refs('sdkProof', 'verifierRs'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-046',
      title: 'Validate artifact checksums and compatibility before proof generation',
      area: 'prover',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Artifact loading should verify manifest hashes and backend compatibility before trying to generate a proof.',
      scope: [
        'Check manifest presence, file hashes, and expected circuit identifiers before proving.',
        'Reject missing or stale artifacts with actionable errors.',
        'Ensure proof generation does not proceed with partially updated artifact sets.',
      ],
      acceptance: [
        'The SDK refuses to use artifacts that do not match the manifest.',
        'Compatibility checks run before the backend is invoked.',
        'Tests cover stale, missing, and mismatched artifact files.',
      ],
      dependencies: ['ZK-006', 'ZK-041'],
      references: refs('artifactsDir', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-047',
      title: 'Add a deterministic rebuild command for all ZK artifacts and fixtures',
      area: 'prover',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'A wave contributor should be able to regenerate every ZK artifact and fixture with one deterministic command from a clean checkout.',
      scope: [
        'Create a single scripted entrypoint for full artifact rebuilds.',
        'Include fixture generation and manifest refresh in the same rebuild path.',
        'Make rebuilds idempotent so repeat runs do not produce noisy diffs.',
      ],
      acceptance: [
        'One command refreshes artifacts, manifest data, and fixtures.',
        'Repeat runs from the same source tree are stable.',
        'The rebuild path is suitable for CI validation.',
      ],
      dependencies: ['ZK-004', 'ZK-041', 'ZK-046'],
      references: refs('artifactsDir', 'scriptsDir', 'circuitsRoot'),
    }),
    zkIssue({
      key: 'ZK-048',
      title: 'Support backend selection for Node and browser proof generation environments',
      area: 'prover',
      priority: 'Low',
      complexity: 'High',
      summary:
        'The SDK will need a proving path that can run in both server-like and browser-like environments without baking one runtime assumption into the core APIs.',
      scope: [
        'Define an abstraction for selecting or injecting the proof backend.',
        'Keep the withdrawal proof API stable across runtime environments.',
        'Avoid bundling-only assumptions in the base SDK API.',
      ],
      acceptance: [
        'The proving adapter can run in both Node and browser-oriented environments.',
        'Environment-specific differences are isolated behind one boundary.',
        'Tests cover both runtime modes at least at the API-selection layer.',
      ],
      dependencies: ['ZK-043'],
      references: refs('sdkProof', 'sdkWithdraw'),
    }),
    zkIssue({
      key: 'ZK-049',
      title: 'Classify proof-generation failures into stable error types for the SDK',
      area: 'prover',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Proof generation will fail for many reasons: bad witnesses, missing artifacts, backend errors, and encoding mismatches. Surface those failures through a stable error model.',
      scope: [
        'Introduce a small set of error categories for artifact, witness, backend, and formatting failures.',
        'Ensure placeholder exceptions are removed from the ZK path.',
        'Test that representative failures map to the expected error category.',
      ],
      acceptance: [
        'The SDK exposes stable error categories for common proving failures.',
        'Tests assert category mapping for at least four major failure modes.',
        'Raw backend exceptions are wrapped with protocol-aware context.',
      ],
      dependencies: ['ZK-043', 'ZK-046'],
      references: refs('sdkProof', 'sdkWithdraw'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-050',
      title: 'Add off-chain proof verification regressions using generated artifacts',
      area: 'prover',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'Before contract integration work, add an off-chain verification harness that proves the generated artifacts can verify the proofs created by the SDK path.',
      scope: [
        'Use generated artifacts to verify withdrawal proofs off-chain in tests.',
        'Cover both valid and tampered public-input or proof-byte cases.',
        'Keep the verification harness aligned with the same artifact manifest and packing schema as the prover.',
      ],
      acceptance: [
        'A valid proof generated by the SDK verifies successfully off-chain.',
        'Tampered proof bytes or public inputs fail verification.',
        'The harness uses the same artifact tree as the normal proof path.',
      ],
      dependencies: ['ZK-042', 'ZK-044', 'ZK-045'],
      references: refs('sdkProof', 'sdkWithdraw', 'artifactsDir'),
      labels: ['testing'],
    }),

    // SDK ZK surface (10)
    zkIssue({
      key: 'ZK-051',
      title: 'Implement `sdk/src/merkle.ts` with insert, root, and path-generation support',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'High',
      summary:
        'Add the missing SDK Merkle module so notes can be tracked locally and turned into valid withdrawal paths.',
      scope: [
        'Implement a local tree API for inserts, roots, path extraction, and checkpoint metadata.',
        'Use the same hash ordering and zero-node derivation as the circuit helpers.',
        'Expose exactly the data needed by witness preparation and proof generation.',
      ],
      acceptance: [
        'The module can build a tree from deposit commitments and produce withdrawal paths.',
        'Its outputs match canonical Merkle fixtures.',
        'The API is usable by `sdk/src/withdraw.ts` without ad hoc conversions.',
      ],
      dependencies: ['ZK-022', 'ZK-023'],
      references: refs('sdkMerkle', 'sdkWithdraw', 'merkleVerify'),
    }),
    zkIssue({
      key: 'ZK-052',
      title: 'Replace placeholder witness preparation in `sdk/src/proof.ts` with canonical field conversion and nullifier handling',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'High',
      summary:
        'The current proof helper still uses placeholder nullifier hashes and address strings. Replace it with real witness preparation built on the canonical encoding rules.',
      scope: [
        'Compute real nullifier hashes and public inputs from notes and Merkle proofs.',
        'Apply canonical field and address encoders to every witness input.',
        'Ensure naming and shape match the withdrawal circuit entrypoint exactly.',
      ],
      acceptance: [
        'No placeholder witness values remain in `sdk/src/proof.ts`.',
        'Prepared witnesses are valid inputs for the real prover wrapper.',
        'Witness preparation is covered by fixtures and golden tests.',
      ],
      dependencies: ['ZK-007', 'ZK-017', 'ZK-031', 'ZK-032'],
      references: refs('sdkProof', 'withdrawCircuit'),
    }),
    zkIssue({
      key: 'ZK-053',
      title: 'Implement `sdk/src/withdraw.ts` as an end-to-end withdrawal proof flow',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'High',
      summary:
        'The SDK needs a single withdrawal entrypoint that turns a note and local tree state into a proof payload ready for the contract boundary.',
      scope: [
        'Load note data, locate the commitment in the local tree, and assemble a canonical witness.',
        'Invoke the prover wrapper and package the proof plus public inputs.',
        'Return enough metadata for downstream transaction submission without mixing in frontend concerns.',
      ],
      acceptance: [
        'A note and local tree state can produce a full withdrawal proof payload through one SDK API.',
        'The flow uses the canonical witness schema, artifact manifest, and proof formatter.',
        'End-to-end tests cover at least one valid withdrawal fixture.',
      ],
      dependencies: ['ZK-043', 'ZK-044', 'ZK-045', 'ZK-051', 'ZK-052'],
      references: refs('sdkWithdraw', 'sdkNote', 'sdkMerkle', 'sdkProof'),
    }),
    zkIssue({
      key: 'ZK-054',
      title: 'Implement `sdk/src/deposit.ts` to produce note material and commitment payloads for deposits',
      area: 'sdk-zk',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Even before contract work resumes, the SDK should expose a clean deposit-side API that generates the right note and commitment material for the ZK system.',
      scope: [
        'Create an API that generates a note, computes its commitment, and returns deposit-side metadata.',
        'Ensure pool and denomination scoping are included in the note generation path.',
        'Keep the module focused on ZK-side outputs rather than transaction submission.',
      ],
      acceptance: [
        'The deposit helper returns canonical note material and commitment values.',
        'Generated note data is immediately usable by the Merkle sync and withdrawal proof flow.',
        'Deposit-side outputs align with the commitment fixtures and note format.',
      ],
      dependencies: ['ZK-009', 'ZK-012', 'ZK-013', 'ZK-014'],
      references: refs('sdkDeposit', 'sdkNote', 'commitmentCircuit'),
    }),
    zkIssue({
      key: 'ZK-055',
      title: 'Add `sdk/src/encoding.ts` as the shared conversion layer for fields, bytes, and addresses',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'Medium',
      summary:
        'Centralize all field, bytes, and address conversions used by note generation, Merkle sync, and witness preparation into one SDK module.',
      scope: [
        'Implement canonical conversions for field elements, fixed-width note buffers, and withdrawal public inputs.',
        'Expose helpers that are intentionally low-level and side-effect free.',
        'Route existing note and proof code through the shared encoding module.',
      ],
      acceptance: [
        'Encoding logic is no longer duplicated across multiple SDK files.',
        'Note and proof helpers use the same canonical conversion functions.',
        'The module is covered by focused unit tests and shared fixtures.',
      ],
      dependencies: ['ZK-001', 'ZK-008'],
      references: refs('sdkNote', 'sdkProof'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-056',
      title: 'Expose secure note backup import and export APIs on top of the new note format',
      area: 'sdk-zk',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Give the SDK an explicit backup API surface for notes so future app code does not serialize notes by reaching into the `Note` class internals.',
      scope: [
        'Wrap note serialization and deserialization in dedicated import/export APIs.',
        'Return structured errors for corrupt or incompatible note backups.',
        'Keep the APIs protocol-focused and frontend-agnostic.',
      ],
      acceptance: [
        'The SDK exposes stable backup import/export entrypoints.',
        'Backups use the versioned, integrity-checked note format.',
        'Tests cover backup round-trips and corrupted note imports.',
      ],
      dependencies: ['ZK-014', 'ZK-015'],
      references: refs('sdkNote'),
    }),
    zkIssue({
      key: 'ZK-057',
      title: 'Add proof caching keyed by note, root, pool, and public-input tuple',
      area: 'sdk-zk',
      priority: 'Low',
      complexity: 'Medium',
      summary:
        'Repeated withdrawal attempts for the same note and public inputs should not always require full reproving. Add an opt-in cache keyed by canonical ZK inputs.',
      scope: [
        'Define the cache key from the canonical witness or its stable digest.',
        'Make cache invalidation sensitive to root, pool, denomination, recipient, relayer, and fee.',
        'Keep the cache layer optional and independent from UI storage choices.',
      ],
      acceptance: [
        'Repeated proof requests can reuse a cached proof when the canonical inputs match exactly.',
        'Changing any public input invalidates the cached entry.',
        'Tests cover cache hits, misses, and invalidation.',
      ],
      dependencies: ['ZK-053'],
      references: refs('sdkProof', 'sdkWithdraw'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-058',
      title: 'Add browser-safe randomness and environment fallbacks for note generation',
      area: 'sdk-zk',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'The SDK currently uses Node `crypto` directly. Introduce a runtime-safe randomness boundary so note generation works across supported environments.',
      scope: [
        'Abstract randomness behind an SDK interface that supports secure browser and Node environments.',
        'Fail clearly when secure randomness is unavailable.',
        'Keep deterministic note derivation isolated from the production randomness path.',
      ],
      acceptance: [
        'Production note generation works in both Node and browser-capable environments.',
        'The default path uses secure randomness only.',
        'Tests cover runtime selection and failure modes.',
      ],
      dependencies: ['ZK-016'],
      references: refs('sdkNote'),
    }),
    zkIssue({
      key: 'ZK-059',
      title: 'Add batch leaf sync and checkpoint persistence for large local tree histories',
      area: 'sdk-zk',
      priority: 'Low',
      complexity: 'High',
      summary:
        'As the anonymity set grows, local proof generation needs efficient leaf ingestion and resumable checkpoints instead of full-tree rebuilds from scratch.',
      scope: [
        'Support ingesting batches of deposit commitments into the local tree.',
        'Persist checkpoints that can resume tree state without replaying the entire history.',
        'Keep the logic transport-agnostic so it can be used by future indexers or direct RPC readers.',
      ],
      acceptance: [
        'The SDK can restore a local tree from checkpoints and continue syncing.',
        'Batch ingestion preserves root determinism.',
        'Tests cover rebuild-versus-checkpoint equivalence.',
      ],
      dependencies: ['ZK-023', 'ZK-051'],
      references: refs('sdkMerkle', 'sdkWithdraw'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-060',
      title: 'Add an SDK ZK integration suite that runs note -> tree -> witness -> proof round trips',
      area: 'sdk-zk',
      priority: 'High',
      complexity: 'High',
      summary:
        'Add the end-to-end SDK test layer that proves the note, Merkle, witness, and proof modules work together as one ZK system.',
      scope: [
        'Run end-to-end cases from note generation through local tree insertion to proof generation.',
        'Use canonical fixtures for at least one valid and one invalid flow.',
        'Make the suite independent from frontend code or contract submission.',
      ],
      acceptance: [
        'The SDK can complete a full ZK round trip from note creation to proof payload.',
        'At least one invalid case fails for the expected reason.',
        'The suite runs from CI without manual setup beyond the pinned artifacts.',
      ],
      dependencies: ['ZK-053', 'ZK-054', 'ZK-055'],
      references: refs('sdkDeposit', 'sdkMerkle', 'sdkProof', 'sdkWithdraw'),
      labels: ['testing'],
    }),

    // Testing (5)
    zkIssue({
      key: 'ZK-061',
      title: 'Create golden vectors that cover the full path from note preimage to withdrawal public inputs',
      area: 'testing',
      priority: 'High',
      complexity: 'High',
      summary:
        'Build a single golden-vector corpus that spans note generation, commitment hashing, Merkle inclusion, nullifier derivation, and packed withdrawal public inputs.',
      scope: [
        'Emit fixtures that cover the full end-to-end ZK path.',
        'Use the same vectors in circuit tests, SDK witness tests, and proof-formatting tests.',
        'Include at least one realistic sparse-tree case.',
      ],
      acceptance: [
        'One vector corpus covers the full spend path from note to public inputs.',
        'Cross-stack tests read the same golden files.',
        'Protocol changes that affect public inputs require explicit fixture updates.',
      ],
      dependencies: ['ZK-004', 'ZK-024', 'ZK-032'],
      references: refs('testVectors', 'sdkProof', 'withdrawCircuit'),
    }),
    zkIssue({
      key: 'ZK-062',
      title: 'Add fuzz and property tests for note serialization, witness encoding, and Merkle paths',
      area: 'testing',
      priority: 'Medium',
      complexity: 'High',
      summary:
        'Complement fixed fixtures with fuzz and property tests over the most failure-prone encoding and tree-handling code.',
      scope: [
        'Fuzz note import/export, witness serialization, and Merkle path generation with seeded randomness.',
        'Promote minimal reproductions from failing fuzz cases into fixed regressions.',
        'Focus on deterministic coverage that can run in CI.',
      ],
      acceptance: [
        'Fuzz or property tests cover note parsing, witness encoding, and Merkle path logic.',
        'Failures are reproducible from saved seeds or reduced cases.',
        'The suite is stable enough for automated runs.',
      ],
      dependencies: ['ZK-015', 'ZK-028', 'ZK-055'],
      references: refs('sdkNote', 'sdkProof', 'sdkMerkle'),
    }),
    zkIssue({
      key: 'ZK-063',
      title: 'Build a mutation suite for wrong root, wrong index, wrong address, wrong fee, and wrong proof bytes',
      area: 'testing',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Add a mutation suite that starts from valid fixtures and breaks one protocol assumption at a time to preserve failure semantics across refactors.',
      scope: [
        'Mutate roots, indices, public inputs, and formatted proof bytes from valid baselines.',
        'Run the suite at both the circuit and SDK/prover boundary where relevant.',
        'Keep each mutation isolated to one assumption change.',
      ],
      acceptance: [
        'Each mutation case starts from a known-good fixture and changes only one dimension.',
        'Failures remain attributable and easy to debug.',
        'The suite guards both witness preparation and proof formatting behavior.',
      ],
      dependencies: ['ZK-037', 'ZK-044', 'ZK-050'],
      references: refs('withdrawCircuit', 'sdkProof', 'sdkWithdraw'),
    }),
    zkIssue({
      key: 'ZK-064',
      title: 'Add a pinned Noir-version compatibility gate for circuit builds and artifacts',
      area: 'testing',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Noir upgrades can change artifact formats or backend behavior. Add a compatibility gate that makes version drift explicit before it breaks proof generation.',
      scope: [
        'Pin the supported Noir or Nargo version for the repo.',
        'Add a check that rebuilds artifacts and fixtures under the pinned version only.',
        'Fail fast when contributors use a mismatched toolchain.',
      ],
      acceptance: [
        'The supported Noir version is machine-enforced.',
        'Artifact generation fails clearly on version mismatch.',
        'The compatibility gate runs in CI or scripted validation.',
      ],
      dependencies: ['ZK-005', 'ZK-047'],
      references: refs('circuitsRoot', 'commitmentPkg', 'withdrawPkg'),
    }),
    zkIssue({
      key: 'ZK-065',
      title: 'Run all ZK tests, rebuild checks, and artifact hash validation in CI',
      area: 'testing',
      priority: 'High',
      complexity: 'High',
      summary:
        'Turn the ZK wave into an enforceable pipeline by running the full circuit, SDK, fixture, and artifact validation stack in CI.',
      scope: [
        'Run Nargo tests, SDK ZK tests, artifact rebuild checks, and manifest validation in one CI workflow.',
        'Fail on dirty artifact diffs after a deterministic rebuild.',
        'Keep the workflow scoped to ZK tasks without depending on frontend or contract deployment paths.',
      ],
      acceptance: [
        'CI runs the full ZK validation stack from a clean checkout.',
        'Artifact drift is detected automatically.',
        'A contributor can reproduce the same checks locally with the scripted commands.',
      ],
      dependencies: ['ZK-047', 'ZK-050', 'ZK-060', 'ZK-064'],
      references: refs('circuitsRoot', 'sdkProof', 'artifactsDir', 'scriptsDir'),
    }),

    // Security (3)
    zkIssue({
      key: 'ZK-066',
      title: 'Add malformed-witness hardening tests for truncated paths, oversized fields, and invalid address encodings',
      area: 'security',
      priority: 'High',
      complexity: 'High',
      summary:
        'Harden the proof-generation boundary against malformed witness inputs so the SDK and fixtures reject structurally dangerous values before hitting the prover.',
      scope: [
        'Cover truncated or over-long Merkle paths, oversized field encodings, and invalid address payloads.',
        'Assert that malformed witness data fails at validation boundaries instead of deep inside the backend.',
        'Promote representative malformed cases into durable regression tests.',
      ],
      acceptance: [
        'Malformed witness cases fail before proof generation reaches the backend.',
        'Error handling distinguishes structure problems from honest proving failures.',
        'Security regressions are represented by fixed negative cases in CI.',
      ],
      dependencies: ['ZK-001', 'ZK-031', 'ZK-055'],
      references: refs('sdkProof', 'withdrawCircuit', 'sdkMerkle'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-067',
      title: 'Add privacy-regression coverage for note strings, fixtures, and witness payload metadata',
      area: 'security',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Make sure the ZK path does not leak unnecessary metadata through note strings, fixture exports, or witness payload helpers.',
      scope: [
        'Audit and test serialized note outputs for accidental plaintext metadata leaks.',
        'Review fixture and witness payload shapes for non-essential duplicated metadata.',
        'Add regression checks for sensitive metadata that should never leave the private note domain.',
      ],
      acceptance: [
        'Note backups and witness helpers expose only protocol-necessary data.',
        'Regression tests catch accidental new metadata fields in serialized outputs.',
        'Fixture exports stay useful for tests without leaking extra note internals.',
      ],
      dependencies: ['ZK-014', 'ZK-056'],
      references: refs('sdkNote', 'sdkProof', 'testVectors'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-068',
      title: 'Build an audit harness for nullifier reuse, pool mismatches, and replay-oriented adversarial cases',
      area: 'security',
      priority: 'High',
      complexity: 'High',
      summary:
        'Prepare a focused adversarial test harness that concentrates on the core privacy and spend-safety invariants of the protocol.',
      scope: [
        'Encode adversarial cases around nullifier reuse, cross-pool mismatches, and malformed public-input replays.',
        'Run the harness against the full witness-generation and proof-formatting stack where practical.',
        'Keep the harness reusable for later audit prep without coupling it to contract work.',
      ],
      acceptance: [
        'The adversarial suite exercises the highest-risk spend invariants explicitly.',
        'Replay-oriented regressions are part of automated testing.',
        'The harness is reusable for future audit and hardening passes.',
      ],
      dependencies: ['ZK-035', 'ZK-037', 'ZK-066'],
      references: refs('withdrawCircuit', 'sdkProof', 'sdkWithdraw'),
      labels: ['testing'],
    }),

    // Performance (2)
    zkIssue({
      key: 'ZK-069',
      title: 'Add constraint-count snapshotting and regression gates for commitment and withdrawal circuits',
      area: 'performance',
      priority: 'Medium',
      complexity: 'Medium',
      summary:
        'Track circuit size as the ZK wave evolves so expensive constraint regressions are visible before they land.',
      scope: [
        'Record baseline constraint counts for the commitment and withdrawal circuits.',
        'Fail validation when counts regress beyond an agreed threshold without explicit approval.',
        'Keep the snapshotting path reproducible under the pinned toolchain.',
      ],
      acceptance: [
        'Both main circuits have tracked baseline constraint counts.',
        'Constraint regressions are surfaced automatically in validation.',
        'Baseline updates require intentional review rather than silent drift.',
      ],
      dependencies: ['ZK-005', 'ZK-064'],
      references: refs('commitmentPkg', 'withdrawPkg', 'artifactsDir'),
      labels: ['testing'],
    }),
    zkIssue({
      key: 'ZK-070',
      title: 'Benchmark proving time and memory across Node and browser-oriented proof flows',
      area: 'performance',
      priority: 'Low',
      complexity: 'High',
      summary:
        'Measure practical proving cost for the withdrawal flow so the SDK can make informed tradeoffs about caching, backend selection, and future optimization work.',
      scope: [
        'Benchmark proof generation time and memory for the main withdrawal circuit.',
        'Compare runtime behavior across Node and browser-oriented environments where supported.',
        'Store benchmark baselines in a format suitable for regression tracking.',
      ],
      acceptance: [
        'The repo includes reproducible proving benchmarks for the withdrawal flow.',
        'Benchmark output distinguishes environment and artifact version.',
        'Performance regressions can be detected over time from saved baselines.',
      ],
      dependencies: ['ZK-048', 'ZK-050'],
      references: refs('sdkProof', 'sdkWithdraw', 'artifactsDir'),
      labels: ['testing'],
    }),
  ],
};

if (wave.issues.length !== 70) {
  throw new Error(`Expected 70 issues in zk-wave-1, found ${wave.issues.length}`);
}

export default wave;
