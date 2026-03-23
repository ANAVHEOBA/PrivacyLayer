# PrivacyLayer Integration Examples

Example integrations for popular frameworks and platforms.

## Examples

| Framework | Directory | Description |
|-----------|-----------|-------------|
| React | [`react/`](./react/) | React hook + component for private transfers |
| Vue 3 | [`vue/`](./vue/) | Composition API component with reactive state |
| Angular | [`angular/`](./angular/) | Standalone component with signals |
| Node.js CLI | [`node-cli/`](./node-cli/) | Command-line tool for privacy pool operations |
| Python | [`python/`](./python/) | Python SDK wrapper for proof generation |

## Quick Start

Each example is self-contained. Pick your framework and follow the README inside.

### React
```bash
cd react && npm install && npm start
```

### Node.js CLI
```bash
cd node-cli && npm install && npx ts-node cli.ts --help
```

### Python
```bash
cd python && pip install -r requirements.txt && python privacy_client.py
```

## Architecture

All examples follow the same pattern:

```
Your App → PrivacyLayer SDK → Noir Circuit (proof gen) → Solana Program (on-chain verify)
```

1. **Initialize** — connect to the privacy pool program
2. **Deposit** — commit funds with a secret note
3. **Prove** — generate a ZK proof off-chain
4. **Withdraw** — submit proof on-chain to a new address

## Contributing

To add a new framework example:
1. Create a directory under `examples/`
2. Include a `README.md` with setup instructions
3. Follow the same deposit → prove → withdraw pattern
4. Add integration tests where possible
