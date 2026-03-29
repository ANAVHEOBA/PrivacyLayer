# GitHub Actions CI/CD Guide

This repository uses a multi-workflow GitHub Actions setup so maintainers can
review failures by area instead of debugging one giant pipeline.

## Workflows

### `circuits.yml`
- installs the Noir toolchain
- compiles all Noir workspace packages
- runs circuit tests
- uploads a simple constraint report artifact

### `contracts.yml`
- installs stable Rust and the `wasm32-unknown-unknown` target
- builds the Soroban workspace
- runs contract tests
- generates a coverage report artifact with `cargo-tarpaulin`

### `sdk.yml`
- prepares Node.js CI for the future SDK package
- skips cleanly when `sdk/package.json` does not exist yet
- runs lint, typecheck, and tests once the SDK lands

### `benchmark.yml`
- runs a lightweight contract benchmark snapshot
- uploads benchmark artifacts
- comments the benchmark summary on pull requests

### `quality.yml`
- runs Rust formatting, clippy, and `cargo audit`
- runs Node lint/format/security checks when the SDK package exists

### `docs.yml`
- verifies required Markdown files exist
- checks internal Markdown links
- uploads a docs manifest artifact

## Trigger Model

All workflows run on:
- pull requests
- pushes to `main`

That keeps the signal aligned with contributor work and post-merge regression
checks.

## Caching Strategy

The workflows cache:
- cargo registry and build artifacts
- Noir artifacts and package cache
- npm dependencies once the SDK package exists

Cache keys are derived from lock/config/source files so stale artifacts are less
likely to bleed across incompatible changes.

## Benchmarks

The benchmark workflow intentionally uses a repository-local shell script:
`scripts/ci/benchmark_contracts.sh`.

Right now it captures a reproducible build/test snapshot rather than a full gas
delta engine. That gives maintainers a baseline immediately and leaves room for
future benchmark specialization once more benchmarking code exists in the repo.

## Branch Protection

Branch protection cannot be enabled from a pull request unless the actor has
repository admin access. Maintainers should enable the following protections on
`main`:

1. require a pull request before merging
2. require at least one approving review
3. require branches to be up to date before merging
4. require status checks to pass

Recommended required checks:
- `Circuits / noir-circuits`
- `Contracts / rust-contracts`
- `SDK / sdk-checks`
- `Benchmarks / contract-benchmarks`
- `Code Quality / rust-quality`
- `Code Quality / node-quality`
- `Documentation / docs`

## Secrets

Current workflows do not require repository secrets. If future deployment steps
or external reporting are added, secrets should be stored in GitHub Actions
repository settings and referenced only through environment variables.

## Maintenance Notes

- If the SDK folder is added later, update `sdk.yml` and `quality.yml` to pin
  the package manager and concrete scripts.
- If benchmark thresholds become strict, move the threshold logic into
  `scripts/ci/benchmark_contracts.sh` so the rule lives close to the data.
- If GitHub Pages documentation is added later, extend `docs.yml` with a deploy
  job guarded behind `push` to `main`.
