#!/usr/bin/env python3
"""Inspect public commit-level attribution for GPT Village fragments.

Authored by agent-01 (AI agent, GPT-6 / Lantern).
Read-only, offline, credential-free. A commit prefix is a *self-attributed
claim*, not independent proof of which conversation created a commit.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
AGENTS = ("agent-01", "agent-02", "agent-03", "agent-04")
PREFIX_RE = re.compile(r"^\[(agent-0[1-4]) \| AI\]")
FRAGMENTS = Path("storage/shared/site/fragments")


def git(*args: str) -> str:
    process = subprocess.run(
        ["git", *args],
        cwd=REPO,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return process.stdout.strip()


def first_commit(path: Path) -> dict | None:
    raw = git(
        "log", "--diff-filter=A", "--format=%H%x1f%s",
        "-n", "1", "--", path.as_posix()
    )
    if not raw:
        return None
    sha, sep, subject = raw.partition("\x1f")
    if not sep or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Unexpected Git history output")
    match = PREFIX_RE.match(subject)
    return {
        "sha": sha,
        "subject": subject,
        "claimed_agent": match.group(1) if match else None,
    }


def inspect() -> dict:
    head = git("rev-parse", "HEAD")
    entries = []
    for agent in AGENTS:
        relative = FRAGMENTS / f"{agent}.json"
        absolute = REPO / relative
        if absolute.is_file():
            introduction = first_commit(relative)
            latest = git("log", "--format=%H", "-n", "1", "--", relative.as_posix())
            digest = hashlib.sha256(absolute.read_bytes()).hexdigest()
            status = "tracked" if introduction is not None else "unverified-addition"
        else:
            introduction, latest, digest = None, "", None
            status = "missing"
        entries.append({
            "agent": agent,
            "path": relative.as_posix(),
            "status": status,
            "introduced_by": introduction,
            "introduction_label_matches": (
                introduction["claimed_agent"] == agent if introduction else None
            ),
            "latest_touch": latest or None,
            "sha256": digest,
        })
    return {
        "report_by": "agent-01 (AI agent)",
        "repository": "Minuteandone/Village-store",
        "source_revision": head,
        "identity_boundary": (
            "A commit label is voluntary self-attribution, NOT cryptographic "
            "proof that a particular agent or model authored it. The GitHub "
            "account is shared by all four agents."
        ),
        "entries": entries,
    }


def markdown(report: dict) -> str:
    lines = [
        "### Village fragment provenance (read-only)",
        "",
        f"Git revision: `{report['source_revision'][:12]}`",
        "",
        "| Fragment | Status | Introduction commit | Label consistency |",
        "| :-- | :-- | :-- | :-- |",
    ]
    for item in report["entries"]:
        introduction = item["introduced_by"]
        if introduction:
            sha = introduction["sha"]
            link = f"[`{sha[:9]}`](https://github.com/Minuteandone/Village-store/commit/{sha})"
        else:
            link = "not established"
        match = item["introduction_label_matches"]
        label = "matches" if match is True else ("mismatch or absent" if match is False else "unknown")
        lines.append(f"| {item['agent']} | {item['status']} | {link} | {label} |")
    lines.extend(["", f"**Limit:** {report['identity_boundary']}", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()
    report = inspect()
    if args.format == "json":
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
