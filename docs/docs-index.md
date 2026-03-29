# Documentation

## Educational Content

### Blog Posts
1. [Introduction to PrivacyLayer](introduction-to-privacy-layer.md) - Overview of PrivacyLayer's architecture, features, and innovation as the first ZK-proof shielded pool on Stellar Soroban.
2. [Understanding BN254 and Poseidon Cryptographic Primitives](understanding-bn254-poseidon.md) - Technical deep dive into the cryptographic foundations of PrivacyLayer.

### FAQ
- [Complete FAQ](FAQ.md) - Comprehensive FAQ covering technical details, usage instructions, compliance considerations, performance metrics, and troubleshooting.

### Video Tutorials (Planned)
- PrivacyLayer Setup and Configuration
- Making Private Transactions
- Advanced ZK Proof Concepts

### Infographics (Planned)
- PrivacyLayer Architecture Diagram
- Transaction Flow Diagram
- Cryptographic Principles Visual Guide

### Interactive Demos (Planned)
- Live demonstration of deposit/withdrawal workflow
- Cryptographic operations visualization
- PrivacyLayer SDK usage examples

---

## Technical Documentation

### Architecture
PrivacyLayer consists of three main components:

1. **Cryptographic Circuits** (Noir)
   - Commitment Circuit
   - Withdrawal Circuit
   - Merkle Tree Circuit

2. **Soroban Smart Contracts** (Rust)
   - Privacy pool contract
   - Admin functions
   - State management

3. **TypeScript SDK**
   - Note generation
   - Merkle tree synchronization
   - Proof generation workflow

### Cryptographic Foundation
PrivacyLayer leverages Stellar Protocol 25's native cryptographic primitives:

- **BN254 elliptic curve**: For efficient Groth16 proof verification
- **Poseidon hash function**: For commitment generation (ZK-friendly)
- **Groth16 proof system**: For zero-knowledge proofs
- **Incremental Merkle trees**: For efficient membership proofs (depth=20)

### Getting Started
See the main README for installation and setup instructions.

---

## Content Overview

### Blog Post 1: Introduction to PrivacyLayer
This blog post provides a comprehensive overview of PrivacyLayer, explaining its purpose, architecture, and innovations as the first ZK-proof shielded pool on Stellar Soroban.

### Blog Post 2: Understanding BN254 and Poseidon
This technical deep dive explains the cryptographic primitives used by PrivacyLayer, detailing BN254 elliptic curve operations and Poseidon hash function implementations within Stellar Protocol 25.

### FAQ: Comprehensive Guide
The FAQ covers everything from basic questions to advanced technical details, including security considerations, performance metrics, and troubleshooting guides.

---

## Target Audience

1. **Developers**: Technical implementation details, SDK usage, and cryptographic foundations.
2. **Users**: Practical guides, FAQ, and usage instructions.
3. **Researchers**: Cryptographic explanations, protocol details, and academic references.
4. **Investors**: Compliance considerations, regulatory framework, and market positioning.

---

## Contribution Guide

Feel free to contribute additional educational content:
- Technical tutorials
- Usage guides
- Case studies
- Academic papers
- Implementation examples