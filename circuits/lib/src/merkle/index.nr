/// Decompose the leaf index into exactly TREE_DEPTH (20) bits and verify
/// that the index reconstructs to the original value.
///
/// This is the canonical range check: if the index fits in 20 bits, it is
/// in [0, 2^20 - 1]. Any field element >= 2^20 will fail because its
/// bit decomposition cannot round-trip through 20 bits.
///
/// # Arguments
/// - `index` : the leaf position to validate and decompose
///
/// # Returns
/// The 20-bit little-endian decomposition of the index.
///
/// # Panics
/// Asserts if index >= 2^TREE_DEPTH (i.e., it cannot be represented in 20 bits).
pub fn decompose_and_validate(index: Field) -> [bool; 20] {
    // Decompose into the full BN254 scalar width first, then assert that
    // all bits above TREE_DEPTH are zero to enforce index < 2^20.
    // Using full-width decomposition prevents early constraint failures that
    // bypass our explicit, deterministic range error message.
    let full_bits: [bool; 254] = index.to_le_bits();

    for i in 20..254 {
        assert(
            !full_bits[i],
            "leaf index out of range: must be < 2^20",
        );
    }

    let mut bits: [bool; 20] = [false; 20];
    for i in 0..20 {
        bits[i] = full_bits[i];
    }

    // Reconstruct the index from the decomposed bits to ensure no
    // information was lost (i.e., no bits above position 19 were set).
    let mut recomposed: Field = 0;
    let mut power: Field = 1; // 2^0 = 1
    for i in 0..20 {
        recomposed += (bits[i] as Field) * power;
        power *= 2;
    }
    assert(recomposed == index, "leaf index out of range: must be < 2^20");

    bits
}

/// Validates that the leaf index is within the valid range for the Merkle tree.
///
/// The tree has TREE_DEPTH = 20, so valid indices are [0, 2^20 - 1].
/// Uses bit decomposition for a sound in-circuit range proof rather than
/// a field comparison which could be bypassed by large field elements.
///
/// # Arguments
/// - `index` : the leaf position to validate
///
/// # Panics
/// Asserts if index >= 2^TREE_DEPTH
pub fn validate_leaf_index(index: Field) {
    let _ = decompose_and_validate(index);
}

mod tests {

    use super::decompose_and_validate;
    use super::validate_leaf_index;

    // ========== Valid index tests ==========

    #[test]
    fn test_valid_zero_index() {
        let bits = decompose_and_validate(0);
        for i in 0..20 {
            assert(!bits[i]);
        }
    }

    #[test]
    fn test_valid_max_index() {
        // 2^20 - 1 = 1,048,575 (all bits set)
        let bits = decompose_and_validate(1_048_575);
        for i in 0..20 {
            assert(bits[i]);
        }
    }

    #[test]
    fn test_valid_index_one() {
        let bits = decompose_and_validate(1);
        assert(bits[0]);
        for i in 1..20 {
            assert(!bits[i]);
        }
    }

    #[test]
    fn test_valid_power_of_two() {
        // 2^10 = 1024
        let bits = decompose_and_validate(1024);
        for i in 0..10 {
            assert(!bits[i]);
        }
        assert(bits[10]);
        for i in 11..20 {
            assert(!bits[i]);
        }
    }

    #[test]
    fn test_valid_highest_single_bit() {
        // 2^19 = 524,288 (only bit 19 set)
        let bits = decompose_and_validate(524_288);
        for i in 0..19 {
            assert(!bits[i]);
        }
        assert(bits[19]);
    }

    #[test]
    fn test_boundary_just_below_max() {
        // 2^20 - 2 = 1,048,574
        let bits = decompose_and_validate(1_048_574);
        assert(!bits[0]);
        for i in 1..20 {
            assert(bits[i]);
        }
    }

    #[test]
    fn test_valid_arbitrary_index() {
        // 42 = 0b101010
        let bits = decompose_and_validate(42);
        assert(!bits[0]);
        assert(bits[1]);
        assert(!bits[2]);
        assert(bits[3]);
        assert(!bits[4]);
        assert(bits[5]);
    }

    // ========== Invalid index tests ==========

    #[test(should_fail_with = "leaf index out of range: must be < 2^20")]
    fn test_invalid_exceeds_max() {
        validate_leaf_index(1_048_576);
    }

    #[test(should_fail_with = "leaf index out of range: must be < 2^20")]
    fn test_invalid_large_value() {
        validate_leaf_index(10_000_000);
    }

    #[test(should_fail_with = "leaf index out of range: must be < 2^20")]
    fn test_invalid_power_of_two_boundary() {
        validate_leaf_index(1_048_576);
    }

    #[test(should_fail_with = "leaf index out of range: must be < 2^20")]
    fn test_invalid_2_pow_21() {
        validate_leaf_index(2_097_152);
    }

    // ========== Bit decomposition correctness ==========

    #[test]
    fn test_bits_reconstruct_to_original() {
        let index: Field = 12345;
        let bits = decompose_and_validate(index);
        let mut recomposed: Field = 0;
        let mut power: Field = 1;
        for i in 0..20 {
            recomposed += (bits[i] as Field) * power;
            power *= 2;
        }
        assert(recomposed == index);
    }
}
