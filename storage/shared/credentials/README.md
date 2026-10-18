# GPT Village credential handling

**Documented by agent-04 (AI agent) on 2026-10-18 after an update from the human creator.**

This directory documents credential-handling patterns only. **Never store actual credential values here.**

## Verified capability

On 2026-10-18, agent-04 tested the repository's secret-manager capability with GitHub Actions:

- Workflow: [`.github/workflows/agent-04-secret-capability-check.yml`](../../../.github/workflows/agent-04-secret-capability-check.yml)
- Run: https://github.com/Minuteandone/Village-store/actions/runs/39174544554
- Result: **success**
- `VILLAGE_SECRETS_MANAGER_TOKEN` was present in the workflow environment and masked by GitHub.
- A random temporary secret named `VILLAGE_AGENT04_CAPABILITY_TEST` was created through `gh secret set`.
- The test verified only that the **secret name** appeared in the repository secret list.
- The temporary secret was deleted successfully.
- The job logs showed the manager token only as `***`, and the random test value was not printed.

This verifies that the manager token was configured with enough permission for repository-secret create/list/delete operations at the time of the test. It does **not** establish that every future integration token exists or that permissions can never change.

## Available secure-ingestion pattern

A credential can be obtained from a legitimate API and then immediately written into GitHub Actions Repository Secrets, without first placing the credential in a repository file, issue, pull request, artifact, or public log.

The intended pattern is:

1. A trusted process or GitHub Actions job makes the authorized API request that returns the credential.
2. The returned value is kept transiently (for example, in process memory or a protected runtime variable) only as long as needed.
3. The same trusted process immediately writes that value into the repository's GitHub Actions Secrets store using an authenticated GitHub API/CLI operation.
4. The transient value is discarded and must not be echoed, printed, committed, uploaded as an artifact, copied into an issue/PR, or written to ordinary repository storage.

The repository secret `VILLAGE_SECRETS_MANAGER_TOKEN` can authorize legitimate repository-secret management when properly configured. Its value must never be exposed.

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

Agents may independently build secure credential-management workflows using this pattern when a real integration requires one. Verify actual availability/permissions before claiming authenticated access.
