<!-- Just created This is an updated PR you can delete. -->


## PR Title

ZK Release Integrity & VK Rotation Hardening (ZK-119, ZK-120, ZK-127, ZK-128)

## PR Description

### Overview

This PR introduces a deterministic ZK release management and verification workflow by adding structured release bundles, deployment preflight validation, benchmark baseline persistence, and append-only verifying-key (VK) rotation evidence tracking.

Together, these changes strengthen operational safety, reproducibility, and auditability for PrivacyLayer ZK deployments and VK rotations.

---

## Included Issues

### ZK-119 — Release Bundle System

Introduced a deterministic release bundle format that couples:

* circuit artifacts
* proving/verifying metadata
* verifier schema
* contract-facing metadata

The release bundle is now generated directly from the rebuild pipeline and validated for compatibility across SDK consumers and deployment tooling.

#### Key Improvements

* Deterministic artifact packaging
* Manifest-linked bundle versioning
* Unified artifact structure for operators and SDK consumers
* Validation support for SDK and deployment loaders

---

### ZK-120 — Deployment Preflight Validation

Added deployment/VK-update preflight checks that automatically compare:

* local release bundle metadata
* target pool VK metadata
* expected verifier schema contract

The preflight now fails fast on critical mismatches before any admin transaction is signed.

#### Checks Added

* circuit ID mismatch detection
* manifest hash verification
* public input arity validation
* schema compatibility verification

#### Benefits

* safer VK rotations
* deterministic dry-run validation workflows
* reduced operator error from manual diffing

---

### ZK-127 — Benchmark Baseline Persistence

Implemented benchmark baseline persistence and regression validation during release rehearsal workflows.

Benchmarks are now stored alongside release artifacts and compared against configurable regression thresholds.

#### Metrics Captured

* cold-start performance
* warm-start performance
* proof generation throughput
* memory usage

#### Improvements

* machine-readable benchmark baseline format
* deterministic benchmark comparisons
* regression failure reporting during release checks
* artifact-linked performance history

---

### ZK-128 — VK Rotation Evidence Bundles

Added append-only verifying-key rotation evidence generation for each pool.

Each rotation now produces a machine-readable evidence bundle containing both pre-rotation and post-rotation metadata.

#### Evidence Includes

* pool ID
* old/new VK hashes
* manifest hash
* circuit ID
* schema version
* operator identity
* timestamps
* rollback context

#### Additional Improvements

* reusable preflight validation integration
* append-only rotation audit records
* human-readable + machine-readable logs
* improved rollback investigation support

---

## Validation

Run validation checks:

```bash
node scripts/zk_ticket_check.mjs --issue-key ZK-119 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-120 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-127 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-128 --run
```

---

## Impact

This PR improves:

* release determinism
* deployment safety
* operational auditability
* regression visibility
* VK rotation traceability
* tooling consistency across SDK and deployment workflows

---

## Wave Issue Keys

* ZK-119
* ZK-120
* ZK-127
* ZK-128
