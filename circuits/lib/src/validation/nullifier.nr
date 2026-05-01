/// Validate nullifier hash matches the computed value.
pub fn validate_nullifier_hash(computed: Field, expected: Field) {
    assert(computed == expected, "nullifier_hash mismatch: invalid nullifier or wrong pool_id");
}
