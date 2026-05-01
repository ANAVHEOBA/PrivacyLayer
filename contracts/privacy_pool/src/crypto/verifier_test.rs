// ============================================================
// PrivacyLayer — Schema Version Validation Tests
// ============================================================
// Unit tests for validate_schema_version function.
// ============================================================

#[cfg(test)]
mod tests {
    use crate::crypto::verifier::validate_schema_version;
    use crate::types::errors::Error;
    use crate::types::state::SchemaVersion;

    // ──────────────────────────────────────────────────────────────
    // validate_schema_version() Success Cases
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_validate_schema_version_exact_match() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.2.3");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_schema_version_compatible_different_patch() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.2.4");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_schema_version_compatible_zero_patch() {
        let proof_schema = SchemaVersion::new(1, 2, 0);
        let result = validate_schema_version(&proof_schema, "1.2.5");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_schema_version_compatible_large_numbers() {
        let proof_schema = SchemaVersion::new(1, 12345, 67890);
        let result = validate_schema_version(&proof_schema, "1.12345.99999");
        assert!(result.is_ok());
    }

    // ──────────────────────────────────────────────────────────────
    // validate_schema_version() Mismatch Cases
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_validate_schema_version_mismatch_different_major() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "2.2.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::SchemaVersionMismatch);
    }

    #[test]
    fn test_validate_schema_version_mismatch_different_minor() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.3.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::SchemaVersionMismatch);
    }

    #[test]
    fn test_validate_schema_version_mismatch_different_major_and_minor() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "2.3.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::SchemaVersionMismatch);
    }

    #[test]
    fn test_validate_schema_version_mismatch_zero_vs_nonzero() {
        let proof_schema = SchemaVersion::new(0, 0, 0);
        let result = validate_schema_version(&proof_schema, "1.0.0");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::SchemaVersionMismatch);
    }

    // ──────────────────────────────────────────────────────────────
    // validate_schema_version() Invalid Format Cases
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_validate_schema_version_invalid_format_too_few_parts() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.2");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidSchemaVersion);
    }

    #[test]
    fn test_validate_schema_version_invalid_format_too_many_parts() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.2.3.4");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidSchemaVersion);
    }

    #[test]
    fn test_validate_schema_version_invalid_format_non_numeric() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.abc.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidSchemaVersion);
    }

    #[test]
    fn test_validate_schema_version_invalid_format_empty() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidSchemaVersion);
    }

    #[test]
    fn test_validate_schema_version_invalid_format_negative() {
        let proof_schema = SchemaVersion::new(1, 2, 3);
        let result = validate_schema_version(&proof_schema, "1.-2.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidSchemaVersion);
    }

    // ──────────────────────────────────────────────────────────────
    // validate_schema_version() Edge Cases
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_validate_schema_version_zero_versions_compatible() {
        let proof_schema = SchemaVersion::new(0, 0, 0);
        let result = validate_schema_version(&proof_schema, "0.0.1");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_schema_version_max_u32_values() {
        let proof_schema = SchemaVersion::new(u32::MAX, u32::MAX, u32::MAX);
        let expected = format!("{}.{}.{}", u32::MAX, u32::MAX, u32::MAX - 1);
        let result = validate_schema_version(&proof_schema, &expected);
        assert!(result.is_ok());
    }
}
