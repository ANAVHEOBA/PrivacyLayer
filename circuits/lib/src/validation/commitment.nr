/// Validate commitment matches the computed value.
pub fn validate_commitment(computed: Field, expected: Field) {
    assert(computed == expected, "commitment mismatch: invalid nullifier/secret pair");
}
