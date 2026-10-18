#!/usr/bin/env python3
"""Read-only, high-confidence credential check for tracked public Village files.

By agent-02 (AI agent). This is a precautionary signal, not a guarantee that
no credential can ever be committed. No matched text is printed.
"""

from __future__ import annotations

import hashlib
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
MAX_TEXT_BYTES = 2_000_000
# Only plain filenames may be printed. Token-shaped names, controls, and
# unusual punctuation are represented by a stable one-way label instead.
SAFE_PATH = re.compile(r"[A-Za-z0-9_./@+ -]+\Z")

# Keep these rules high-confidence. Patterns are assembled from fixed parts
# and never loaded from a credential or an outside service.
RULES = (
    ("private-key-pem", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----")),
    ("github-legacy-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("github-fine-grained-pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{60,}\b")),
    ("aws-access-key-id", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("agentboard-credential", re.compile(r"\bagb_[A-Za-z0-9_-]{24,}\b")),
    ("openai-style-credential", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b")),
)

# Generic secret scanning is noisy. This narrow rule only catches a long
# literal value assigned to an explicitly sensitive key, never expressions
# such as a GitHub Actions secret reference or a legitimate secret name.
LITERAL_ASSIGNMENT = re.compile(
    r"""(?ix)
    \b(?:api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)
    ["']?\s*[:=]\s*
    (["'])
    [A-Za-z0-9_./+=:-]{24,}
    \1
    """
)

@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    rule: str


def safe_path_label(path: str) -> str:
    """Never print a path that itself resembles a credential or log injection.

    The complete path remains inside the local Finding for in-process use, but
    the log receives a hash rather than any suspicious raw filename bytes.
    """
    if SAFE_PATH.fullmatch(path) and not any(
        pattern.search(path) for _, pattern in RULES
    ):
        return path
    digest = hashlib.sha256(path.encode("utf-8", "surrogateescape")).hexdigest()[:16]
    return "tracked-file-sha256-" + digest


def format_finding(finding: Finding) -> str:
    """Safe, fixed-format diagnostic; never include matched source text."""
    location = safe_path_label(finding.path)
    return f"{location}:{finding.line}: possible credential ({finding.rule})"


def scan_text(text: str, path: str) -> list[Finding]:
    findings: list[Finding] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for rule_id, pattern in RULES:
            if pattern.search(line):
                findings.append(Finding(path, line_number, rule_id))
        if LITERAL_ASSIGNMENT.search(line):
            findings.append(Finding(path, line_number, "long-literal-secret-assignment"))
    return findings


def tracked_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z", "--cached"],
        check=True, capture_output=True,
    )
    return [root / item.decode("utf-8", "surrogateescape")
            for item in result.stdout.split(b"\0") if item]


def audit(root: Path) -> tuple[list[Finding], int, int]:
    findings: list[Finding] = []
    checked = 0
    skipped = 0
    for path in tracked_files(root):
        # Even filenames can accidentally contain sensitive tokens. Check names
        # without printing them; report an opaque digest for unsafe names.
        relative = path.relative_to(root).as_posix()
        for rule_id, pattern in RULES:
            if pattern.search(relative):
                findings.append(Finding(relative, 0, "filename-" + rule_id))
        # Tracked symlinks may resolve *outside* the checkout on a local run.
        # Never follow them, even when their target appears to be a text file.
        if path.is_symlink():
            skipped += 1
            continue
        if not path.is_file():
            continue
        try:
            raw = path.read_bytes()
        except OSError:
            skipped += 1
            continue
        if len(raw) > MAX_TEXT_BYTES or b"\0" in raw:
            skipped += 1
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            skipped += 1
            continue
        checked += 1
        findings.extend(scan_text(text, relative))
    return findings, checked, skipped


def main() -> int:
    try:
        findings, checked, skipped = audit(ROOT)
    except (OSError, subprocess.CalledProcessError):
        # Do not print potentially sensitive process output.
        print("Credential check could not inspect tracked repository files.", file=sys.stderr)
        return 2
    print(f"Credential check inspected {checked} tracked text files; skipped {skipped} non-text, unreadable or oversized files.")
    if findings:
        for finding in findings:
            # Deliberately DO NOT print the matched line, token or surrounding context.
            print(format_finding(finding), file=sys.stderr)
        print(f"FAILED: {len(findings)} possible credential occurrence(s). Review the source privately and rotate any actual leaked value.", file=sys.stderr)
        return 1
    print("PASS: No matches for the configured high-confidence credential signatures.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
