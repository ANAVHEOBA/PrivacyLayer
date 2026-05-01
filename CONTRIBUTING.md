# Contributing to PrivacyLayer

Thank you for your interest in contributing to PrivacyLayer! This project is building the first ZK-proof shielded pool on Stellar Soroban, and we welcome contributions from developers of all skill levels.

## 🎯 How to Contribute

### 1. Find an Issue

Browse the [Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) tab to find tasks:
- Look for `good first issue` labels if you're new
- Check `bounty` labels for paid tasks (USDC via Drips Wave)
- Filter by component: `circuits`, `contracts`, `sdk`, `frontend`, `documentation`

### 2. Claim an Issue

Comment on the issue saying "I'd like to work on this" and wait for assignment confirmation before starting work.

### 3. Set Up Development Environment

See the [Getting Started](README.md#getting-started) section in the README for prerequisites.

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/PrivacyLayer.git
cd PrivacyLayer

# Add upstream remote
git remote add upstream https://github.com/ANAVHEOBA/PrivacyLayer.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

Follow the coding standards for each component (see below).

### 5. Test Your Changes

```bash
# Test circuits
cd circuits/commitment && nargo test
cd ../withdraw && nargo test
cd ../merkle && nargo test

# Test contracts
cd contracts && cargo test

# Test SDK (when available)
cd sdk && npm test
```

### 6. Submit a Pull Request

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

Then open a PR on GitHub:
- Reference the issue number (e.g., "Closes #42")
- Describe what you changed and why
- Include screenshots/logs if relevant
- Ensure all tests pass

## 📝 Coding Standards

### Noir Circuits (`circuits/`)

- Use descriptive variable names
- Add comments explaining cryptographic operations
- Keep constraint count minimal
- Write tests for edge cases (zero values, max values, invalid inputs)
- Follow Noir naming conventions: `snake_case` for functions and variables

Example:
```rust
// Good
fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    // Use Poseidon hash for commitment
    poseidon2_hash([nullifier, secret])
}

// Bad
fn cc(n: Field, s: Field) -> Field {
    poseidon2_hash([n, s])
}
```

### Rust Contracts (`contracts/`)

- Follow Rust naming conventions: `snake_case` for functions, `PascalCase` for types
- Use `Result<T, Error>` for error handling
- Add doc comments (`///`) for public functions
- Keep functions small and focused
- Write unit tests for each function
- Write integration tests for user flows

Example:
```rust
/// Deposits a commitment into the privacy pool.
///
/// # Arguments
/// * `env` - The contract environment
/// * `commitment` - The Poseidon hash commitment
///
/// # Returns
/// The leaf index where the commitment was inserted
///
/// # Errors
/// Returns `Error::Paused` if the contract is paused
pub fn deposit(env: Env, commitment: U256) -> Result<u32, Error> {
    // Implementation
}
```

### TypeScript SDK (`sdk/`)

- Use TypeScript strict mode
- Follow Airbnb style guide
- Add JSDoc comments for public APIs
- Write unit tests with Jest
- Use async/await for asynchronous operations
- Export types for all public interfaces

Example:
```typescript
/**
 * Generates a new note for depositing into the privacy pool.
 * 
 * @returns A note containing nullifier, secret, and commitment
 */
export async function generateNote(): Promise<Note> {
  // Implementation
}
```

### Frontend (`frontend/`)

- Use React functional components with hooks
- Follow Next.js best practices
- Use Tailwind CSS for styling
- Make UI accessible (ARIA labels, keyboard navigation)
- Add loading states and error handling
- Write component tests with React Testing Library

## 🧪 Testing Requirements

All PRs must include tests:

- **Circuits**: Test valid inputs, edge cases, and expected failures
- **Contracts**: Unit tests for each function + integration tests for user flows
- **SDK**: Unit tests with mocked contract calls
- **Frontend**: Component tests for UI interactions

## 🔒 Security Guidelines

This project handles cryptographic operations and user funds. Please:

- Never commit private keys or secrets
- Validate all user inputs
- Use constant-time operations for sensitive comparisons
- Report security vulnerabilities privately (see SECURITY.md)
- Don't introduce dependencies without review

## 💬 Communication

- **GitHub Issues**: For bugs, features, and tasks
- **Pull Requests**: For code review and discussion
- **GitHub Discussions**: For questions and brainstorming (if enabled)

## 🎁 Bounty Program

PrivacyLayer is funded via [Drips Wave](https://www.drips.network/wave). Contributors earn USDC for completing bounty issues:

1. Look for issues tagged with `bounty`
2. Claim the issue by commenting
3. Complete the work and submit a PR
4. Once merged, receive USDC payment via Drips

Bounty amounts are listed in each issue. Payment is processed after PR merge.

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions
- No harassment, discrimination, or spam

## 🚀 Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open** a pull request
9. **Respond** to review feedback
10. **Celebrate** when merged! 🎉

## 📚 Resources


- [Soroban SDK Docs](https://docs.rs/soroban-sdk)
- [Noir Language Docs](https://noir-lang.org/docs)
- [BN254 Curve Spec](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md)
- [Poseidon Hash Spec](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md)

## ❓ Questions?

- Check existing issues and discussions
- Ask in the issue you're working on
- Open a new discussion for general questions


Thank you for contributing to PrivacyLayer! 🙏
