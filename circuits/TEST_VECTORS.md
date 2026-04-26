# PrivacyLayer Circuit Test Vectors

Documentation of all test cases across the three Noir circuits.  
Run tests with: `cd circuits && nargo test`

---

## Overview

| Circuit        | File                                 | Tests  |
| -------------- | ------------------------------------ | ------ |
| Commitment     | `commitment/src/main.nr`             | 16     |
| Withdrawal     | `withdraw/src/main.nr`               | 21     |
| Merkle Library | `merkle/src/lib.nr`                  | 12     |
| Test Helpers   | `lib/src/validation/test_helpers.nr` | 4      |
| **Total**      |                                      | **53** |

---

## Commitment Circuit Tests (`commitment/src/main.nr`)

### Happy Path

| ID      | Test Name                              | Scenario                                        | Expected |
| ------- | -------------------------------------- | ----------------------------------------------- | -------- |
| TC-C-01 | `test_valid_commitment`                | Small field values (nullifier=1, secret=2)      | PASS     |
| TC-C-02 | `test_valid_commitment_large_values`   | Hex-encoded values (100, 1000)                  | PASS     |
| TC-C-03 | `test_valid_commitment_near_max_field` | Values near BN254 field limit (2^253)           | PASS     |
| TC-C-04 | `test_commitment_is_deterministic`     | Same inputs called twice yield equal commitment | PASS     |

### Zero / Boundary Values

| ID      | Test Name                             | Scenario                                | Expected |
| ------- | ------------------------------------- | --------------------------------------- | -------- |
| TC-C-05 | `test_zero_inputs_valid_commitment`   | nullifier=0, secret=0 → H(0,0) is valid | PASS     |
| TC-C-06 | `test_zero_nullifier_nonzero_secret`  | nullifier=0, secret=12345               | PASS     |
| TC-C-07 | `test_nonzero_nullifier_zero_secret`  | nullifier=99999, secret=0               | PASS     |
| TC-C-08 | `test_identical_nullifier_and_secret` | nullifier == secret == 7777             | PASS     |

### Collision / Uniqueness

| ID      | Test Name                                               | Scenario            | Expected                |
| ------- | ------------------------------------------------------- | ------------------- | ----------------------- |
| TC-C-09 | `test_no_commitment_collision_different_inputs`         | H(1,2) ≠ H(3,4)     | PASS (distinct outputs) |
| TC-C-10 | `test_commitment_is_not_symmetric`                      | H(10,20) ≠ H(20,10) | PASS (non-symmetric)    |
| TC-C-11 | `test_adjacent_nullifiers_produce_distinct_commitments` | H(1,k) ≠ H(2,k)     | PASS (distinct)         |

### Attack / Failure Cases

| ID      | Test Name                                           | Scenario                                | Expected                    |
| ------- | --------------------------------------------------- | --------------------------------------- | --------------------------- |
| TC-C-12 | `test_wrong_nullifier_fails`                        | Wrong nullifier, real commitment        | FAIL: "commitment mismatch" |
| TC-C-13 | `test_wrong_secret_fails`                           | Wrong secret, real commitment           | FAIL: "commitment mismatch" |
| TC-C-14 | `test_swapped_inputs_fails`                         | (secret, nullifier) — swapped order     | FAIL: "commitment mismatch" |
| TC-C-15 | `test_zero_inputs_with_fabricated_commitment_fails` | nullifier=0, secret=0, commitment=12345 | FAIL: "commitment mismatch" |
| TC-C-16 | `test_off_by_one_commitment_fails`                  | Real commitment + 1                     | FAIL: "commitment mismatch" |

---

## Withdrawal Circuit Tests (`withdraw/src/main.nr`)

### Happy Path

| ID      | Test Name                            | Scenario                        | Expected |
| ------- | ------------------------------------ | ------------------------------- | -------- |
| TC-W-01 | `test_valid_withdrawal`              | Standard withdrawal, no relayer | PASS     |
| TC-W-02 | `test_withdrawal_with_relayer_fee`   | Relayer with 1 XLM fee          | PASS     |
| TC-W-03 | `test_withdrawal_fee_equals_amount`  | fee == amount (max legal fee)   | PASS     |
| TC-W-04 | `test_withdrawal_nonzero_leaf_index` | Leaf at index=7 (binary 0b0111) | PASS     |

### Merkle / Inclusion Tests

| ID      | Test Name                               | Scenario                                       | Expected                 |
| ------- | --------------------------------------- | ---------------------------------------------- | ------------------------ |
| TC-W-05 | `test_wrong_secret_fails`               | Wrong secret changes commitment → Merkle fails | FAIL: "leaf not in tree" |
| TC-W-06 | `test_wrong_root_fails`                 | Fabricated root, valid path                    | FAIL: "leaf not in tree" |
| TC-W-07 | `test_wrong_leaf_index_fails`           | Path for index=0 but claim index=1             | FAIL: "leaf not in tree" |
| TC-W-08 | `test_tampered_auth_path_fails`         | Level-3 sibling overwritten                    | FAIL: "leaf not in tree" |
| TC-W-09 | `test_zero_commitment_valid_if_in_tree` | H(0,0) is a leaf; circuit accepts it           | PASS                     |
| TC-W-10 | `test_max_leaf_index`                   | Index = 2^20 - 1 (all bits set, depth 20)      | PASS                     |

### Nullifier Hash Tests

| ID      | Test Name                                            | Scenario                                         | Expected                        |
| ------- | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| TC-W-11 | `test_wrong_nullifier_hash_fails`                    | Fabricated nullifier_hash (54321)                | FAIL: "nullifier_hash mismatch" |
| TC-W-12 | `test_nullifier_hash_from_different_nullifier_fails` | Hash derived from nullifier=9999                 | FAIL: "nullifier_hash mismatch" |
| TC-W-13 | `test_nullifier_hash_bound_to_root`                  | Cross-root replay — stale root in nullifier_hash | FAIL: "nullifier_hash mismatch" |
| TC-W-14 | `test_zero_nullifier_hash_fails`                     | Attacker submits nullifier_hash=0                | FAIL: "nullifier_hash mismatch" |

### Fee / Relayer Validation

| ID      | Test Name                                  | Scenario                       | Expected                                            |
| ------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------- |
| TC-W-15 | `test_fee_exceeds_amount_fails`            | fee=100 > amount=10            | FAIL: "fee cannot exceed withdrawal amount"         |
| TC-W-16 | `test_nonzero_relayer_with_zero_fee_fails` | relayer≠0, fee=0               | FAIL: "relayer must be zero address if fee is zero" |
| TC-W-17 | `test_zero_fee_zero_relayer_valid`         | No relayer, no fee             | PASS                                                |
| TC-W-18 | `test_unit_amount_unit_fee_valid`          | amount=1, fee=1 (min boundary) | PASS                                                |

### Boundary / Miscellaneous

| ID      | Test Name                                  | Scenario                                           | Expected        |
| ------- | ------------------------------------------ | -------------------------------------------------- | --------------- |
| TC-W-19 | `test_withdrawal_large_field_values`       | Witnesses near BN254 field limit                   | PASS            |
| TC-W-20 | `test_two_notes_same_root_both_valid`      | Two notes at index 0 and 1, shared root            | PASS            |
| TC-W-21 | `test_nullifier_hash_differs_across_roots` | Same nullifier, different roots → different hashes | PASS (distinct) |

---

## Merkle Library Tests (`merkle/src/lib.nr`)

### Root Computation

| ID      | Test Name                                  | Scenario                                              | Expected |
| ------- | ------------------------------------------ | ----------------------------------------------------- | -------- |
| TC-M-01 | `test_single_leaf_tree`                    | Leaf=42 at index=0, manually verified root hash chain | PASS     |
| TC-M-02 | `test_nonempty_leaf_produces_nonzero_root` | Leaf=12345, all-zero path → root ≠ 0                  | PASS     |
| TC-M-03 | `test_right_child_position`                | Index=1 → H(sibling, leaf) at level 0                 | PASS     |
| TC-M-04 | `test_same_leaf_same_root`                 | Determinism check with non-trivial path               | PASS     |
| TC-M-05 | `test_max_index_root_computable`           | Index = 1048575 (all 20 bits set)                     | PASS     |

### Inclusion Verification

| ID      | Test Name                                      | Scenario                             | Expected                 |
| ------- | ---------------------------------------------- | ------------------------------------ | ------------------------ |
| TC-M-06 | `test_verify_inclusion_correct_root`           | Round-trip: compute root then verify | PASS                     |
| TC-M-07 | `test_verify_inclusion_wrong_root_fails`       | Wrong root (9999)                    | FAIL: "leaf not in tree" |
| TC-M-08 | `test_verify_inclusion_wrong_index_fails`      | Root for index=0 claimed at index=1  | FAIL: "leaf not in tree" |
| TC-M-09 | `test_verify_inclusion_tampered_sibling_fails` | Level-5 sibling overwritten          | FAIL: "leaf not in tree" |

### Hash Consistency

| ID      | Test Name                                          | Scenario                                                | Expected              |
| ------- | -------------------------------------------------- | ------------------------------------------------------- | --------------------- |
| TC-M-10 | `test_left_vs_right_child_produce_different_roots` | Same leaf at index=0 vs index=1                         | PASS (distinct roots) |
| TC-M-11 | `test_sibling_leaf_swap_changes_root`              | Leaf_A sibling=Leaf_B vs Leaf_B sibling=Leaf_A          | PASS (distinct roots) |
| TC-M-12 | `test_zero_leaf_nonzero_path`                      | Leaf=0, non-zero path → root≠0, verify_inclusion passes | PASS                  |

---

## Test Helper Vectors (`lib/src/validation/test_helpers.nr`)

### Canonical KAT Values

| Symbol           | Value         | Description                              |
| ---------------- | ------------- | ---------------------------------------- |
| `KAT_NULLIFIER`  | `1`           | Default nullifier for fixture generation |
| `KAT_SECRET`     | `2`           | Default secret for fixture generation    |
| `KAT_LEAF_INDEX` | `0`           | Default leaf position                    |
| `KAT_AMOUNT`     | `100_0000000` | 100 XLM in stroops                       |
| `KAT_RECIPIENT`  | `0xABCD`      | Canonical recipient field value          |

### Helper Self-Tests

| ID      | Test Name                                | Scenario                                            | Expected |
| ------- | ---------------------------------------- | --------------------------------------------------- | -------- |
| TC-H-01 | `test_build_valid_fixture_is_consistent` | Fixture root and nullifier_hash are self-consistent | PASS     |
| TC-H-02 | `test_build_two_leaf_tree_shared_root`   | Both leaves produce the same root                   | PASS     |
| TC-H-03 | `test_tamper_path_changes_root`          | Tampered sibling at level 3 changes root            | PASS     |
| TC-H-04 | `test_build_fixture_at_high_index`       | Fixture at index=524288 (bit 19 only) is consistent | PASS     |

---

## Cross-Stack Merkle Inclusion Vectors (`sdk/test/golden/merkle_vectors.json`)

Added in ZK-022 / ZK-024.  Depth-4 fixture trees consumed by both the SDK
Merkle tests (`sdk/test/merkle_cross_stack.test.ts`) and serve as the
specification for equivalent Noir circuit tests.

### Vectors

| ID     | Description                                      | Tree leaves | Prove index | Status   |
| ------ | ------------------------------------------------ | ----------- | ----------- | -------- |
| MV-001 | Empty tree — all zero leaves                     | 0           | —           | No proof |
| MV-002 | Single leaf at index 0 (sparse)                  | 1           | 0           | VALID    |
| MV-003 | Two leaves at indices 0 and 1                    | 2           | 0           | VALID    |
| MV-004 | Four leaves, prove leaf[2]                       | 4           | 2           | VALID    |
| MV-005 | Full depth-4 tree (16 leaves), prove leaf[15]    | 16          | 15          | VALID    |
| MV-006 | Single leaf, tampered sibling at level 0         | 1           | 0           | INVALID  |
| MV-007 | Eight leaves, prove leaf[7] (bits 0111)          | 8           | 7           | VALID    |

### Cross-stack invariants verified

1. **Zero-node ladder** — `computeMerkleZeroLadder(depth)` produces the same
   per-level zero hashes as `circuits/lib/src/hash/zeroes.nr`.
2. **Left/right ordering** — bit `i` of `leaf_index` determines whether `current`
   is placed left (`bit=0`) or right (`bit=1`) when hashing with its sibling.
3. **Root recomputation** — recomputing the root from any SDK-generated path must
   equal `tree.getRoot()`.
4. **Tamper detection** — overwriting any sibling with a different value changes
   the recomputed root, making invalid inclusion detectable.

---

## Shared Commitment Vectors (`artifacts/zk/commitment_vectors.json`)

The commitment package and the SDK now consume one generated commitment corpus.
`scripts/generate_commitment_vectors.mjs` emits:

- `artifacts/zk/commitment_vectors.json` for Node/Jest tests
- `circuits/commitment/src/fixtures.nr` for Noir tests

### Coverage

| ID     | Scenario                             | Status  |
| ------ | ------------------------------------ | ------- |
| CV-001 | Basic small-field note               | VALID   |
| CV-002 | All-zero note material               | VALID   |
| CV-003 | Near-max 31-byte nullifier boundary  | VALID   |
| CV-004 | Near-modulus pool identifier         | VALID   |
| CI-001 | Nullifier too short                  | INVALID |
| CI-002 | Secret too wide                      | INVALID |
| CI-003 | Pool identifier not 32 bytes         | INVALID |
| CI-004 | Pool identifier outside BN254 field  | INVALID |

### Cross-stack invariants verified

1. `Note.getCommitment()` matches the Noir commitment circuit for the same
   `(nullifier, secret, pool_id)` tuple.
2. The fixture generator uses one canonical encoding path:
   note scalars are 31-byte values left-padded into BN254 field hex, while
   pool identifiers must already be canonical 32-byte field encodings.
3. Malformed note material is rejected before hashing on the SDK side.

---

## Golden Vector Corpus (`sdk/test/golden/vectors.json`)

The machine-readable golden corpus spans the full end-to-end ZK spend path and is
shared across the circuit test suite, SDK witness tests, and proof-formatting tests.

### Location

```
sdk/test/golden/vectors.json
```

### Coverage

| ID     | Scenario                      | Leaf index | Relayer fee |
| ------ | ----------------------------- | ---------- | ----------- |
| TV-001 | Standard single-note spend    | 0          | none        |
| TV-002 | Non-zero sibling in auth path | 7          | 1 XLM       |
| TV-003 | Fee equals amount (boundary)  | 0          | full amount |
| TV-004 | Sparse tree — bit 19 only     | 524288     | none        |

### Format

Each vector captures:

1. **Depth metadata** — `production_tree_depth` (fixed protocol depth, currently 20)
   and `offline_tree_depth` (tooling/test depth used when vectors were emitted)
2. **Note preimage** — `nullifier_hex`, `secret_hex`, `pool_id`, `amount`
3. **Field encodings** — canonical 64-char hex for nullifier and secret, with
   note scalars left-padded from 31 bytes into BN254 field elements
4. **Merkle witness** — `leaf_index`, `path_elements` (20 × 32 bytes), `root`
5. **Nullifier hash** — `H(nullifier_field, root_field)` using the same algorithm
   as the circuit (`compute_nullifier_hash` in `circuits/lib/src/hash/nullifier.nr`)
6. **Packed public inputs** — ordered as the circuit entrypoint expects:
   `pool_id | root | nullifier_hash | recipient | amount | relayer | fee`

The corpus intentionally does **not** embed portable note backup strings, legacy
serialized note strings, full prepared witness payloads, or cache-helper blobs.
Tests reconstruct those from the minimal fixture fields when needed so the vector
file remains useful without normalizing extra note metadata into exported artifacts.

> **Hash note**: Commitment fixtures now use Poseidon2 for the note commitment
> path, while some broader SDK placeholder paths still use structural stand-ins.
> Any hash-algorithm migration requires regenerating the affected corpora.
> Any change to public-input encoding **requires** an explicit fixture update —
> the test suite will catch stale vectors.

### Running cross-stack fixture tests

```bash
# SDK fixture tests (Jest)
cd sdk && npm test

# Circuit tests (Noir — uses the same canonical KAT values)
cd circuits && nargo test
```

---

## References

- [Tornado Cash test vectors](https://github.com/tornadocash/tornado-core/tree/master/test)
- [Penumbra TCT specification](https://protocol.penumbra.zone/main/crypto/tct.html)
- [Noir standard library test patterns](https://github.com/noir-lang/noir-examples)
- [BN254 scalar field](https://hackmd.io/@jpw/bn254) — prime r ≈ 2^254

---

> **Coverage target**: ≥ 90% of circuit branches exercised.  
> **Hash implementation**: Pedersen (BN254) via `std::hash::pedersen_hash`.  
> **Tree depth**: 20 levels — supports up to 2^20 = 1,048,576 notes.
