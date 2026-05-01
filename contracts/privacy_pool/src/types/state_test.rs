// ============================================================
// PrivacyLayer — Schema Version Tests
// ============================================================
// Unit tests for SchemaVersion type and related functionality.
// ============================================================

#[cfg(test)]
mod tests {
    use crate::types::state::SchemaVersion;

    // ──────────────────────────────────────────────────────────────
    // SchemaVersion::new() Tests
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_schema_version_new() {
        let version = SchemaVersion::new(1, 2, 3);
        assert_eq!(version.major, 1);
        assert_eq!(version.minor, 2);
        assert_eq!(version.patch, 3);
    }

    // ──────────────────────────────────────────────────────────────
    // SchemaVersion::from_string() Tests
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_schema_version_from_string_valid() {
        let version = SchemaVersion::from_string("1.2.3").unwrap();
        assert_eq!(version.major, 1);
        assert_eq!(version.minor, 2);
        assert_eq!(version.patch, 3);
    }

    #[test]
    fn test_schema_version_from_string_zero_version() {
        let version = SchemaVersion::from_string("0.0.0").unwrap();
        assert_eq!(version.major, 0);
        assert_eq!(version.minor, 0);
        assert_eq!(version.patch, 0);
    }

    #[test]
    fn test_schema_version_from_string_large_numbers() {
        let version = SchemaVersion::from_string("1.12345.67890").unwrap();
        assert_eq!(version.major, 1);
        assert_eq!(version.minor, 12345);
        assert_eq!(version.patch, 67890);
    }

    #[test]
    fn test_schema_version_from_string_invalid_format_too_few_parts() {
        let result = SchemaVersion::from_string("1.2");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid schema version format");
    }

    #[test]
    fn test_schema_version_from_string_invalid_format_too_many_parts() {
        let result = SchemaVersion::from_string("1.2.3.4");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid schema version format");
    }

    #[test]
    fn test_schema_version_from_string_invalid_major() {
        let result = SchemaVersion::from_string("abc.2.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid major version");
    }

    #[test]
    fn test_schema_version_from_string_invalid_minor() {
        let result = SchemaVersion::from_string("1.abc.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid minor version");
    }

    #[test]
    fn test_schema_version_from_string_invalid_patch() {
        let result = SchemaVersion::from_string("1.2.abc");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid patch version");
    }

    #[test]
    fn test_schema_version_from_string_empty() {
        let result = SchemaVersion::from_string("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid schema version format");
    }

    #[test]
    fn test_schema_version_from_string_negative_numbers() {
        let result = SchemaVersion::from_string("1.-2.3");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid minor version");
    }

    // ──────────────────────────────────────────────────────────────
    // SchemaVersion::is_compatible_with() Tests
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_schema_version_compatible_exact_match() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(1, 2, 3);
        assert!(v1.is_compatible_with(&v2));
        assert!(v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_compatible_different_patch() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(1, 2, 4);
        assert!(v1.is_compatible_with(&v2));
        assert!(v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_incompatible_different_major() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(2, 2, 3);
        assert!(!v1.is_compatible_with(&v2));
        assert!(!v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_incompatible_different_minor() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(1, 3, 3);
        assert!(!v1.is_compatible_with(&v2));
        assert!(!v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_incompatible_different_major_and_minor() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(2, 3, 3);
        assert!(!v1.is_compatible_with(&v2));
        assert!(!v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_compatible_zero_versions() {
        let v1 = SchemaVersion::new(0, 0, 0);
        let v2 = SchemaVersion::new(0, 0, 1);
        assert!(v1.is_compatible_with(&v2));
        assert!(v2.is_compatible_with(&v1));
    }

    #[test]
    fn test_schema_version_compatible_large_numbers() {
        let v1 = SchemaVersion::new(1, 12345, 67890);
        let v2 = SchemaVersion::new(1, 12345, 99999);
        assert!(v1.is_compatible_with(&v2));
        assert!(v2.is_compatible_with(&v1));
    }

    // ──────────────────────────────────────────────────────────────
    // SchemaVersion PartialEq Tests
    // ──────────────────────────────────────────────────────────────

    #[test]
    fn test_schema_version_equality() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(1, 2, 3);
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_schema_version_inequality_different_patch() {
        let v1 = SchemaVersion::new(1, 2, 3);
        let v2 = SchemaVersion::new(1, 2, 4);
        assert_ne!(v1, v2);
    }
}
