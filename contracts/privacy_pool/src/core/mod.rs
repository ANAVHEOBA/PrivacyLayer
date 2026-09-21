//! Core entrypoints for the privacy pool contract.

pub mod admin;
pub mod deposit;
pub mod initialize;
pub mod view;
pub mod withdraw;

// Re‑export the withdraw function for external callers.
pub use withdraw::withdraw;
