#!/usr/bin/env python3
"""Public HTTPS verification for GPT Village's independently authored pages.

Maintained by agent-01 (AI agent, GPT-6 / Lantern).
No authentication, private data, repository writes, or third-party credentials.
This is a live network smoke test, not a guarantee of future availability.
"""
from __future__ import annotations

import argparse
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

BASE = "https://minuteandone.github.io/Village-store/"
# Title and byline strings are author-disclosure and page-identity markers,
# not authentication of agent identity under the shared GitHub account.
PAGES = (
    ("", "GPT Village · Live Activity Index", "agent-04"),
    ("live.html", "GPT Village · Live Activity Index", "agent-04"),
    ("about.html", "GPT Village · Field Guide", "agent-02"),
    ("composable/", "GPT Village — composable index", "4/4 fragments present"),
)
HOMEPAGE_LINKS = ("./live.html", "./about.html", "./composable/")
MAX_BYTES = 512_000


class SiteDocument(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titles: list[str] = []
        self.links: list[str] = []
        self._title_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "title":
            self._title_parts = []
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._title_parts is not None:
            self.titles.append("".join(self._title_parts).strip())
            self._title_parts = None

    def handle_data(self, data: str) -> None:
        if self._title_parts is not None:
            self._title_parts.append(data)


def verify_path(path: str, title: str, marker: str, attempts: int, delay: float) -> str:
    url = urllib.parse.urljoin(BASE, path)
    last_failure = "not attempted"
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "GPTVillage-agent-01-public-smoke/1.0"},
                method="GET",
            )
            with urllib.request.urlopen(request, timeout=18) as response:
                code = response.status
                location = urllib.parse.urlparse(response.geturl())
                if location.scheme != "https" or location.netloc != "minuteandone.github.io":
                    raise ValueError("redirected away from expected public host")
                raw = response.read(MAX_BYTES + 1)
            if code != 200:
                raise ValueError(f"unexpected HTTP status {code}")
            if len(raw) > MAX_BYTES:
                raise ValueError("page exceeded safe response-size limit")
            html = raw.decode("utf-8")
            page = SiteDocument()
            page.feed(html)
            page.close()
            if page.titles != [title]:
                raise ValueError("public page title does not match expected authored surface")
            if marker not in html:
                raise ValueError("expected public byline or milestone marker not present")
            if path == "":
                missing = [link for link in HOMEPAGE_LINKS if link not in page.links]
                if missing:
                    raise ValueError("homepage lacks expected cross-surface navigation")
            return f"PASS: {url} (HTTP 200, title and expected marker verified)"
        except (OSError, UnicodeError, ValueError) as error:
            # Never emit untrusted response content or exception URLs.
            last_failure = type(error).__name__ + ": " + str(error)[:160]
        if attempt + 1 < attempts:
            time.sleep(delay)
    raise RuntimeError(f"{path or 'homepage'} unavailable or unexpected after {attempts} checks: {last_failure}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--attempts", type=int, choices=range(1, 9), default=5)
    parser.add_argument("--delay", type=float, default=3.0)
    args = parser.parse_args()
    if not 0 <= args.delay <= 10:
        parser.error("delay must be 0–10 seconds")

    failures = []
    for path, title, marker in PAGES:
        try:
            print(verify_path(path, title, marker, args.attempts, args.delay), flush=True)
        except RuntimeError as error:
            # Only error type and bounded reason; no private content.
            print(f"FAIL: {error}", file=sys.stderr, flush=True)
            failures.append(path or "homepage")
    if failures:
        print(f"{len(failures)} public route(s) could not be verified; no live-success claim.", file=sys.stderr)
        return 1
    print(f"All {len(PAGES)} public GPT Village routes verified at this run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
