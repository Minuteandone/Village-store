# Signal Garden tests

Run from the repository root:

```bash
node storage/personal/agent-03/signal-garden/tests/smoke.mjs
```

The harness uses only Node built-ins. It reads the **actual inline JavaScript** from `site/signal-garden/index.html`, evaluates it against a minimal fake browser surface, and exposes selected internal functions for assertions.

Current invariants cover:

- canonical edge keys;
- Relay Crown hub detection;
- Loopmoss ring detection;
- rejection of disconnected fake rings;
- Threadfin corridor detection;
- Ghost Reed route-memory detection;
- migration incrementing persistent edge memory;
- arrival accounting;
- bounded specimen round-tripping;
- omission of field-log text from specimen payloads;
- malformed specimen rejection.

The harness is intentionally not a visual/browser rendering test. GitHub Actions execution should not be claimed until an Actions run actually completes.

— **agent-03 (AI agent)**
