# ZK Wave 2 Implementation Summary

This document summarizes the implementation of issues ZK-107, ZK-108, ZK-109, and ZK-110.

## Implementation Overview

### ZK-107: Dependency-Resolution Smoke Tests for ZK SDK Entrypoints

**File:** `sdk/test/zk_smoke.test.ts`

**Purpose:** Lightweight smoke checks that prove key ZK modules load before full test execution, catching missing runtime or type dependencies early.

**Coverage:**
- Main SDK entrypoint (`sdk/src/index.ts`)
- Poseidon hashing module (`sdk/src/poseidon.ts`)
- Noir backend entrypoint (`sdk/src/backends/noir.ts`)
- Core ZK modules (encoding, public_inputs, proof)

**Run:**
```bash
cd sdk
npm run test:smoke
# or
npm run test:zk-107
```

**Acceptance Criteria Met:**
✅ Missing dependency wiring fails in a small targeted check before dozens of suites explode
✅ The smoke surface covers the modules most likely to break basic ZK imports
✅ CI output becomes more diagnostic for broken dependency state

---

### ZK-108: Fail CI When Multiple Modules Export Competing Withdrawal Schema Orders

**File:** `sdk/test/schema_parity.test.ts`

**Purpose:** Ensures that multiple modules exporting withdrawal schema orders remain consistent. Detects schema-order drift early by comparing all schema definitions in one centralized parity check.

**Coverage:**
- `sdk/src/encoding.ts` (WITHDRAWAL_PUBLIC_INPUT_SCHEMA)
- `sdk/src/public_inputs.ts` (WITHDRAWAL_PUBLIC_INPUT_SCHEMA)
- Contract verifier schema validation

**Run:**
```bash
cd sdk
npm run test:schema-parity
# or
npm run test:zk-108
```

**Acceptance Criteria Met:**
✅ Schema-order drift is caught by one targeted test
✅ Adding a new schema export requires deliberately wiring it into the parity check
✅ Developers do not need to infer schema conflicts from unrelated downstream test failures

**Key Tests:**
- Identical schema order between encoding.ts and public_inputs.ts
- No competing schema definitions in the same module
- Schema order matches circuit documentation
- Pool-scoped nullifier semantics validation (ZK-035)

---

### ZK-109: Lint Docs, Comments, and Tests for Stale Public-Input Counts and Nullifier Semantics

**File:** `scripts/lint-zk-docs.mjs`

**Purpose:** Scans docs, comments, and tests for stale information about public-input counts, field order, and pool-scoped vs root-scoped nullifier semantics.

**Coverage:**
- README.md
- sdk/src/encoding.ts
- sdk/src/public_inputs.ts
- circuits/TEST_VECTORS.md
- ops/github/waves/zk-wave-1.mjs

**Run:**
```bash
node scripts/lint-zk-docs.mjs
```

**Acceptance Criteria Met:**
✅ Known stale invariants are checked automatically
✅ Docs and test commentary no longer contradict the current circuit/contract silently
✅ The lint output points at the specific mismatched source when it fails

**Checks:**
- Root-scoped nullifier references (should be pool-scoped per ZK-035)
- Incorrect public input counts
- Nullifier hash formula validation
- Schema field order consistency
- Documentation drift detection

---

### ZK-110: Track Current SDK and Contract ZK Failures in Machine-Readable Triage Manifest

**File:** `zk-failure-triage.json`

**Purpose:** Machine-readable tracking of current ZK test and build blockers until the system is green again.

**Structure:**
- Unique failure IDs (ZK-FAIL-XXX)
- Categorization (dependency, schema_drift, documentation, contract_compile, etc.)
- Severity levels (low, medium, high)
- Owner assignment
- Related wave issues
- Expected exit paths

**Validation:**
```bash
node scripts/zk_ticket_check.mjs --issue-key ZK-110
node scripts/zk_ticket_check.mjs --issue-key ZK-110 --run
```

**Acceptance Criteria Met:**
✅ Known ZK failures are enumerated in one machine-readable place
✅ The manifest distinguishes dependency breakage, schema drift, and contract compile failure
✅ The file is easy to shrink as issues are resolved and eventually removed

---

## Integration with CI

### Pre-Test Smoke Check (ZK-107)
Add to CI pipeline before running full test matrix:
```yaml
- name: ZK SDK Smoke Tests
  run: |
    cd sdk
    npm run test:smoke
```

### Schema Parity Check (ZK-108)
Add to CI pipeline:
```yaml
- name: ZK Schema Parity Check
  run: |
    cd sdk
    npm run test:schema-parity
```

### Documentation Lint (ZK-109)
Add to CI pipeline:
```yaml
- name: ZK Documentation Lint
  run: |
    node scripts/lint-zk-docs.mjs
```

---

## Wave Issue Keys

All implementations are associated with the following wave issues:
- **ZK-107**: Add dependency-resolution smoke tests
- **ZK-108**: Fail CI on competing withdrawal schema orders
- **ZK-109**: Lint docs for stale public-input counts and nullifier semantics
- **ZK-110**: Track ZK failures in machine-readable triage manifest

---

## Testing

### Run All New Tests
```bash
# Smoke tests
cd sdk && npm run test:smoke

# Schema parity tests
cd sdk && npm run test:schema-parity

# Documentation lint
node scripts/lint-zk-docs.mjs

# Validate with zk_ticket_check
node scripts/zk_ticket_check.mjs --issue-key ZK-107 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-108 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-109 --run
node scripts/zk_ticket_check.mjs --issue-key ZK-110 --run
```

---

## File Summary

| File | Purpose | Issue |
|------|---------|-------|
| `sdk/test/zk_smoke.test.ts` | Dependency-resolution smoke tests | ZK-107 |
| `sdk/test/schema_parity.test.ts` | Schema-order parity validation | ZK-108 |
| `scripts/lint-zk-docs.mjs` | Documentation drift detection | ZK-109 |
| `zk-failure-triage.json` | Machine-readable failure tracking | ZK-110 |
| `sdk/package.json` | Added test scripts | All |

---

## Maintenance Notes

1. **zk-failure-triage.json**: Remove entries as issues are resolved. Do not let this file grow indefinitely.
2. **Schema parity test**: If new schema exports are added, wire them into the parity check explicitly.
3. **Documentation lint**: Update CANONICAL_FACTS in lint-zk-docs.mjs when circuit schemas change.
4. **Smoke tests**: Add new critical entrypoints to the smoke test suite as the SDK grows.
