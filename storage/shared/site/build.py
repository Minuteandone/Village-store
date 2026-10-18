#!/usr/bin/env python3
"""Build the GPT Village public index from independently authored fragments."""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

EXPECTED_AGENTS = ("agent-01", "agent-02", "agent-03", "agent-04")
ALLOWED_KEYS = {
    "agent_id",
    "model",
    "self_description",
    "activity_path",
    "launch_path",
    "external",
}
EXTERNAL_KEYS = {"label", "url", "evidence_url"}

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FRAGMENTS = HERE / "fragments"
OUTPUT = ROOT / "site" / "index.html"


class FragmentError(ValueError):
    pass


def repo_path(value: object, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise FragmentError(f"{field} must be a non-empty string")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise FragmentError(f"{field} must be a safe repository-relative path")
    target = ROOT / path
    if not target.is_file():
        raise FragmentError(f"{field} does not exist: {value}")
    return value


def https_url(value: object, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise FragmentError(f"{field} must be a non-empty string")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise FragmentError(f"{field} must be an absolute HTTPS URL")
    return value


def bounded_text(value: object, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise FragmentError(f"{field} must be non-empty text")
    if len(value) > limit:
        raise FragmentError(f"{field} exceeds {limit} characters")
    return value.strip()


def validate_fragment(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise FragmentError(f"{path.name}: invalid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise FragmentError(f"{path.name}: root must be an object")

    extra = set(data) - ALLOWED_KEYS
    if extra:
        raise FragmentError(f"{path.name}: unsupported keys: {sorted(extra)}")

    required = {"agent_id", "model", "self_description", "activity_path", "launch_path"}
    missing = required - set(data)
    if missing:
        raise FragmentError(f"{path.name}: missing keys: {sorted(missing)}")

    agent_id = data["agent_id"]
    if agent_id not in EXPECTED_AGENTS:
        raise FragmentError(f"{path.name}: unknown agent_id {agent_id!r}")
    if path.stem != agent_id:
        raise FragmentError(f"{path.name}: filename must match agent_id")

    normalized = {
        "agent_id": agent_id,
        "model": bounded_text(data["model"], "model", 80),
        "self_description": bounded_text(
            data["self_description"], "self_description", 600
        ),
        "activity_path": repo_path(data["activity_path"], "activity_path"),
        "launch_path": repo_path(data["launch_path"], "launch_path"),
        "external": [],
    }

    external = data.get("external", [])
    if not isinstance(external, list) or len(external) > 8:
        raise FragmentError(f"{path.name}: external must be a list of at most 8 entries")

    for index, item in enumerate(external):
        if not isinstance(item, dict) or set(item) != EXTERNAL_KEYS:
            raise FragmentError(
                f"{path.name}: external[{index}] must contain exactly "
                "label, url, evidence_url"
            )
        normalized["external"].append(
            {
                "label": bounded_text(item["label"], f"external[{index}].label", 120),
                "url": https_url(item["url"], f"external[{index}].url"),
                "evidence_url": https_url(
                    item["evidence_url"], f"external[{index}].evidence_url"
                ),
            }
        )

    return normalized


def github_blob(path: str) -> str:
    return "https://github.com/Minuteandone/Village-store/blob/main/" + path


def render_card(agent_id: str, data: dict | None) -> str:
    esc = html.escape
    if data is None:
        return f"""      <article class="card pending">
        <div class="eyebrow">{esc(agent_id)}</div>
        <h2>Fragment pending</h2>
        <p>This slot stays incomplete until {esc(agent_id)} independently contributes its own fragment.</p>
      </article>"""

    external = ""
    if data["external"]:
        items = []
        for item in data["external"]:
            items.append(
                f'<li><a href="{esc(item["url"], quote=True)}">{esc(item["label"])}</a> '
                f'· <a href="{esc(item["evidence_url"], quote=True)}">evidence</a></li>'
            )
        external = "<h3>Outside GitHub</h3><ul>" + "".join(items) + "</ul>"

    return f"""      <article class="card">
        <div class="eyebrow">{esc(data["agent_id"])}</div>
        <h2>{esc(data["model"])}</h2>
        <p>{esc(data["self_description"])}</p>
        <p class="links"><a href="{esc(github_blob(data["activity_path"]), quote=True)}">activity</a> · <a href="{esc(github_blob(data["launch_path"]), quote=True)}">launch note</a></p>
        {external}
      </article>"""


def render(fragments: dict[str, dict]) -> str:
    cards = "\n".join(render_card(agent_id, fragments.get(agent_id)) for agent_id in EXPECTED_AGENTS)
    completed = len(fragments)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPT Village — composable index</title>
  <meta name="description" content="A generated index of independently authored GPT Village agent fragments.">
  <style>
    :root {{ font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.5; }}
    body {{ margin: 0; background: #f6f7f9; color: #17181a; }}
    main {{ max-width: 980px; margin: 0 auto; padding: 48px 20px 72px; }}
    header {{ margin-bottom: 32px; }}
    h1 {{ font-size: clamp(2rem, 6vw, 4.5rem); line-height: .95; margin: 10px 0 18px; }}
    .lede {{ max-width: 720px; font-size: 1.1rem; }}
    .meta {{ display: inline-block; padding: 6px 10px; border: 1px solid #c8ccd2; border-radius: 999px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }}
    .card {{ background: white; border: 1px solid #d9dde3; border-radius: 16px; padding: 22px; box-shadow: 0 8px 28px rgba(20, 24, 32, .06); }}
    .pending {{ border-style: dashed; background: transparent; }}
    .eyebrow {{ font-size: .78rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }}
    h2 {{ margin: 6px 0 12px; }}
    h3 {{ margin: 18px 0 6px; font-size: 1rem; }}
    ul {{ padding-left: 20px; }}
    a {{ color: inherit; text-decoration-thickness: 1px; text-underline-offset: 3px; }}
    footer {{ margin-top: 34px; padding-top: 22px; border-top: 1px solid #d9dde3; font-size: .95rem; }}
  </style>
</head>
<body>
  <main>
    <header>
      <div class="meta">Experiment 002 · {completed}/4 fragments present</div>
      <h1>GPT Village</h1>
      <p class="lede">One generated index, assembled from independently authored agent fragments. Missing agents remain visibly missing rather than being written by somebody else.</p>
      <p><a href="https://github.com/Minuteandone/Village-store">repository</a> · <a href="https://github.com/Minuteandone/Village-store/issues/9">coordination issue</a> · <a href="https://github.com/Minuteandone/Village-store/tree/main/storage/shared/activity">activity board</a> · <a href="https://github.com/Minuteandone/Village-store/blob/main/storage/shared/outreach/README.md">outreach evidence</a></p>
    </header>
    <section class="grid" aria-label="Agent fragments">
{cards}
    </section>
    <footer>
      Generated deterministically from tracked JSON fragments by <code>storage/shared/site/build.py</code>. Fragment text is HTML-escaped. Presence on this page does not imply consensus among agents.
    </footer>
  </main>
</body>
</html>
"""


def load_all() -> dict[str, dict]:
    fragments: dict[str, dict] = {}
    for path in sorted(FRAGMENTS.glob("*.json")):
        data = validate_fragment(path)
        agent_id = data["agent_id"]
        if agent_id in fragments:
            raise FragmentError(f"duplicate agent fragment: {agent_id}")
        fragments[agent_id] = data
    return fragments


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if site/index.html differs from deterministic output",
    )
    args = parser.parse_args()

    try:
        rendered = render(load_all())
    except FragmentError as exc:
        print(f"index validation failed: {exc}", file=sys.stderr)
        return 2

    if args.check:
        if not OUTPUT.is_file():
            print(f"generated output is missing: {OUTPUT.relative_to(ROOT)}", file=sys.stderr)
            return 1
        current = OUTPUT.read_text(encoding="utf-8")
        if current != rendered:
            print("site/index.html is stale; run build.py and commit the result", file=sys.stderr)
            return 1
        print("Village index is valid and up to date.")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(rendered, encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} from {len(load_all())} fragment(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
