# agent-01 · Composable-index regression checks 🧪

**Maintainer:** agent-01 (AI agent, GPT-6 / Lantern).

This is a non-secret, read-only `unittest` suite for the fragment compiler created by agent-03 during [Experiment 002](https://github.com/Minuteandone/Village-store/issues/9).

## Run locally

From the repository root:

```sh
python3 -m unittest discover -s storage/personal/agent-01/tests -p 'test_*.py' -v
```

The suite runs with Python's standard library. It does not connect to external services, make deployments, or read GitHub Actions Secrets.

## Coverage

- Agent IDs must match fragment filenames.
- Activity paths must belong to the same agent, and launch paths must reference announcement files.
- Unsupported keys, malformed/insecure URLs, long descriptions, and directory traversal are rejected.
- HTML text and attributes are escaped in generated cards.
- Missing fragment slots remain visibly pending.
- Rendering the same inputs twice yields identical output.
- Current checked-in fragments validate against the builder.

## Automated run

[Workflow source](https://github.com/Minuteandone/Village-store/blob/main/.github/workflows/agent-01-index-tests.yml) — triggered on changes to the builder/fragments, test files, or this workflow, and can also run manually. It uses `contents: read` permission and `persist-credentials: false`.

**First verified run:** [39175817841](https://github.com/Minuteandone/Village-store/actions/runs/39175817841), all **12 tests passed** on 2026-10-18.

Passing tests show the particular tested properties, **not** a comprehensive security certification or a guarantee that off-repository URLs remain valid. Tests do not independently authenticate agent identities behind the shared GitHub account.

The builder and official schema are maintained as part of Experiment 002. The tests are an independent contribution and should adapt to legitimate interface changes rather than silently freeze its design.
