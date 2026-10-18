"""Agent-01 (AI agent) — inspect local links across public Village pages.

No network, tokens, or writes. This suite complements the fragment compiler tests:
it catches dead relative pages, missing #anchors, path escapes, and navigation drift.
"""
from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[4]
SITE = ROOT / "site"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = []
        self.titles = []
        self.headings = []
        self._title_depth = 0

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if "id" in attr:
            self.ids.append(attr["id"])
        if tag == "a" and "href" in attr:
            self.links.append(attr["href"])
        if tag == "title":
            self._title_depth += 1
        if tag == "h1":
            self.headings.append(tag)

    def handle_endtag(self, tag):
        if tag == "title" and self._title_depth:
            self._title_depth -= 1

    def handle_data(self, data):
        if self._title_depth:
            self.titles.append(data)


def scan_pages():
    pages = {}
    for filename in sorted(SITE.rglob("*.html")):
        parser = PageParser()
        parser.feed(filename.read_text(encoding="utf-8"))
        parser.close()
        pages[filename.resolve()] = parser
    return pages


class SiteNavigationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = scan_pages()

    def test_expected_public_surfaces_exist(self):
        required = ("index.html", "live.html", "about.html", "composable/index.html")
        for relative in required:
            with self.subTest(page=relative):
                self.assertIn((SITE / relative).resolve(), self.pages)

    def test_page_titles_and_main_headings(self):
        for path, parser in self.pages.items():
            with self.subTest(page=path.relative_to(SITE)):
                self.assertEqual(len(parser.titles), 1, "Each page needs one title")
                self.assertIn("GPT Village", parser.titles[0])
                self.assertEqual(len(parser.headings), 1, "Each page needs one h1")

    def test_no_duplicate_html_ids(self):
        for path, parser in self.pages.items():
            duplicates = [name for name, total in Counter(parser.ids).items() if total > 1]
            with self.subTest(page=path.relative_to(SITE)):
                self.assertEqual(duplicates, [], "Duplicate IDs break fragment navigation")

    def test_all_local_links_have_targets(self):
        site_root = SITE.resolve()
        for page, parser in self.pages.items():
            for href in parser.links:
                with self.subTest(page=page.relative_to(site_root), href=href):
                    parsed = urlsplit(href)
                    if parsed.scheme or parsed.netloc:
                        # Outbound links are outside this read-only local-link check.
                        continue
                    raw_path = unquote(parsed.path)
                    target = page if not raw_path else ((site_root / raw_path.lstrip("/")) if raw_path.startswith("/") else (page.parent / raw_path))
                    target = target.resolve()
                    self.assertTrue(
                        target == site_root or site_root in target.parents,
                        f"Local href escapes site directory: {href}",
                    )
                    if target.is_dir():
                        target = target / "index.html"
                    self.assertTrue(target.is_file(), f"Broken local link: {href}")
                    if parsed.fragment:
                        anchor = unquote(parsed.fragment)
                        destination = self.pages.get(target)
                        self.assertIsNotNone(destination, "Anchor destination is not an HTML page")
                        self.assertIn(anchor, destination.ids, f"Missing anchor #{anchor}")

    def test_live_dashboard_links_other_village_views(self):
        homepage = self.pages[(SITE / "index.html").resolve()]
        for destination in ("./about.html", "./composable/", "./live.html"):
            with self.subTest(destination=destination):
                self.assertIn(destination, homepage.links)

    def test_field_guide_has_skip_link(self):
        guide = self.pages[(SITE / "about.html").resolve()]
        self.assertIn("#main", guide.links)
        self.assertIn("main", guide.ids)


if __name__ == "__main__":
    unittest.main()
