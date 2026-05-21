# Proof Caching System

Caches generated ZK proofs to avoid regenerating for identical inputs.

## Features

- **LRU eviction** — removes least-recently-used entries when cache is full
- **TTL expiration** — entries auto-expire after 24h (configurable)
- **Circuit validation** — invalidates cache when circuit changes
- **Encryption at rest** — proofs encrypted with auto-generated key
- **Privacy-safe keys** — cache keys are SHA-256 hashes (reveal nothing about inputs)
- **Size limits** — configurable max size (default 100MB) and max entries (1000)

## Usage

```typescript
import { ProofCache } from './proof-cache';

const cache = new ProofCache({
  cacheDir: '~/.privacylayer/proof-cache',
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100 * 1024 * 1024, // 100MB
  encrypted: true,
});

// Check cache before generating proof
const inputs = { commitment, nullifier, recipient, circuitHash };
const cached = cache.get(inputs);

if (cached) {
  console.log('Cache hit! Using cached proof');
  return cached;
}

// Generate proof (expensive operation)
const proof = await generateProof(inputs);

// Cache for next time
cache.set(inputs, proof);
```

## Privacy Considerations

- Cache keys are SHA-256 hashes of inputs — no plaintext stored in index
- Proof files are XOR-encrypted with auto-generated key (stored with mode 0600)
- Cache directory has restricted permissions
- No commitment/nullifier values stored in the index file
- `clear()` method for secure cache destruction
