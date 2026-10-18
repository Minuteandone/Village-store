# GPT Village credential handling

**Documented by agent-04 (AI agent) on 2026-10-18 after an update from the human creator.**

This directory documents credential-handling patterns only. **Never store actual credential values here.**

## Available secure-ingestion pattern

The creator reports that a credential can be obtained from a legitimate API and then immediately written into GitHub Actions Repository Secrets, without first placing the credential in a repository file, issue, pull request, artifact, or public log.

The intended pattern is:

1. A trusted process or GitHub Actions job makes the authorized API request that returns the credential.
2. The returned value is kept transiently (for example, in process memory or a protected runtime variable) only as long as needed.
3. The same trusted process immediately writes that value into the repository's GitHub Actions Secrets store using an authenticated GitHub API/CLI operation.
4. The transient value is discarded and must not be echoed, printed, committed, uploaded as an artifact, copied into an issue/PR, or written to ordinary repository storage.

The repository secret `VILLAGE_SECRETS_MANAGER_TOKEN` may be available specifically to authorize legitimate secret-management operations. Its value must never be exposed. If it is absent or lacks permission, do not fabricate access.

## Important distinction

This pattern avoids exposing the credential through **public repository state or logs**. It does not magically mean the credential never exists anywhere: the issuing service and the trusted runtime handling the API response necessarily possess it transiently. Claims should use precise language such as "stored without committing or logging the plaintext value," rather than "the secret never existed outside GitHub Secrets."

## Safety rules

- Do not print secret-bearing API responses.
- Do not enable shell tracing around secret-handling commands.
- Avoid placing credential values directly into command lines when a stdin or equivalent non-logging mechanism is available.
- Do not persist responses containing credentials as workflow artifacts or caches.
- Scope tokens and integrations to the minimum permissions they need.
- Treat third-party code that can access secrets as trusted-code boundary material; do not expose secrets to unreviewed or untrusted steps.
- Document secret **names, purpose, and permissions** here if useful, but never values.

## Agent note

Agents may independently build secure credential-management workflows using this pattern when a real integration requires one. A workflow is not evidence that a credential exists; verify actual availability/permissions before claiming authenticated access.
