"""Offline checks for legacy-Pages forwarding and public smoke-test behavior.

By agent-01 (AI agent / Lantern). Uses only public tracked HTML fixtures and
mock HTTP responses; makes no real network calls.
"""
from __future__ import annotations

import importlib.util
import sys
import unittest
import urllib.parse
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "storage/personal/agent-01/tools/public_pages_check.py"
spec = importlib.util.spec_from_file_location("village_public_pages_check", SOURCE)
assert spec and spec.loader
checker = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = checker
spec.loader.exec_module(checker)

FORWARDS = {
    "index.html": "site/",
    "live.html": "site/live.html",
    "about.html": "site/about.html",
    "composable/index.html": "../site/composable/",
}


class FakeResponse:
    def __init__(self, url, body):
        self.url = url
        self.body = body.encode("utf-8")
        self.status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def geturl(self):
        return self.url

    def read(self, size=-1):
        return self.body[:size]


class LegacyPagesForwardingTests(unittest.TestCase):
    def test_forwarding_files_resolve_to_real_source_pages(self):
        for path, expected in FORWARDS.items():
            with self.subTest(path=path):
                html = (ROOT / path).read_text(encoding="utf-8")
                parser = checker.SiteDocument()
                parser.feed(html)
                parser.close()
                self.assertEqual(parser.refresh, expected)
                self.assertEqual(len(parser.titles), 1)
                self.assertIn("GPT Village", parser.titles[0])
                self.assertIn("agent-01 (AI agent)", html)
                self.assertNotIn("<script", html.lower())
                source_url = urllib.parse.urljoin(checker.BASE, path)
                target_url = urllib.parse.urljoin(source_url, parser.refresh)
                relative = urllib.parse.urlsplit(target_url).path.removeprefix("/Village-store/")
                final = ROOT / relative
                if final.is_dir():
                    final = final / "index.html"
                self.assertTrue(final.is_file(), f"{path} does not lead to tracked page")

    def test_verifier_checks_real_page_after_local_forwarding(self):
        homepage_url = checker.BASE
        forwarded_url = checker.BASE + "site/"
        forwarding_html = (ROOT / "index.html").read_text(encoding="utf-8")
        actual_html = (ROOT / "site/index.html").read_text(encoding="utf-8")
        requested = []

        def fetch(request, timeout):
            requested.append(request.full_url)
            if request.full_url == homepage_url:
                return FakeResponse(homepage_url, forwarding_html)
            if request.full_url == forwarded_url:
                return FakeResponse(forwarded_url, actual_html)
            raise AssertionError("unexpected HTTP target")

        with patch.object(checker.urllib.request, "urlopen", side_effect=fetch):
            outcome = checker.verify_path(
                "", "GPT Village · Live Activity Index", "agent-04",
                attempts=1, delay=0,
            )
        self.assertIn("PASS:", outcome)
        self.assertEqual(requested, [homepage_url, forwarded_url])

    def test_verifier_rejects_external_html_forwarding(self):
        homepage = checker.BASE
        payload = '<html><head><meta http-equiv="refresh" content="0; url=https://evil.invalid/"></head></html>'
        calls = []

        def fetch(request, timeout):
            calls.append(request.full_url)
            return FakeResponse(homepage, payload)

        with patch.object(checker.urllib.request, "urlopen", side_effect=fetch):
            with self.assertRaises(RuntimeError) as ctx:
                checker.verify_path("", "GPT Village · Live Activity Index", "agent-04", attempts=1, delay=0)
        self.assertIn("unsafe or off-site HTML forwarding target", str(ctx.exception))
        self.assertEqual(calls, [homepage])


if __name__ == "__main__":
    unittest.main()
