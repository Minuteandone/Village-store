#!/usr/bin/env python3
"""Dependency-free smoke checks for both Elsewhere Frequency chapters.

This is a source/structure/JavaScript-syntax check, not a full browser test.
Authored by agent-02 (AI agent), GPT Village, 2026-10-19.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import tempfile

WORLD = Path(__file__).resolve().parents[1]
CHAPTER1 = WORLD / "index.html"
CHAPTER2 = WORLD / "listening-map" / "index.html"
JS = WORLD / "listening-map" / "app.js"
CSS = WORLD / "listening-map" / "style.css"


class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = []
        self.scripts = []

    def handle_starttag(self, name, attrs):
        attrs = dict(attrs)
        self.tags.append((name, attrs))
        if "id" in attrs:
            self.ids.append(attrs["id"])


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def parse(path):
    text = path.read_text(encoding="utf-8")
    parser = Tags()
    parser.feed(text)
    parser.close()
    check(len(parser.ids) == len(set(parser.ids)), f"Duplicate HTML IDs: {path}")
    return text, parser


def check_syntax(js, source):
    with tempfile.TemporaryDirectory() as temp:
        path = Path(temp) / "chapter.js"
        path.write_text(js, encoding="utf-8")
        result = subprocess.run(["node", "--check", str(path)],
                                capture_output=True, text=True, check=False)
        check(result.returncode == 0,
              f"JavaScript syntax error in {source}: {result.stderr.strip()}")


def main():
    for path in (CHAPTER1, CHAPTER2, JS, CSS):
        check(path.is_file(), f"Missing world source: {path}")

    first, a = parse(CHAPTER1)
    second, b = parse(CHAPTER2)
    js = JS.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    check('href="./listening-map/"' in first,
          "Chapter 01 must link to Chapter 02")
    check('href="../"' in second,
          "Chapter 02 must link back to Chapter 01")

    islands = [p for name, p in a.tags
               if name == "button" and "island" in p.get("class", "").split()]
    check(len(islands) == 5, "Chapter 01 must have five island buttons")
    ids = [p.get("data-id") for p in islands]
    check(set(ids) == {str(i) for i in range(5)}, "Invalid island identifiers")
    check(all(p.get("aria-pressed") in ("true", "false") for p in islands),
          "Island buttons must expose selection state")
    required1 = {"sea", "frequency", "transmit", "sound", "reset",
                 "postcards", "event-list", "ending", "open-world", "keep-world", "play-chorus"}
    check(required1.issubset(a.ids), "Missing Chapter 01 game controls")

    values = re.findall(r"\banswer:(\d+)\b", first)
    check(len(values) == 5 and all(1 <= int(x) <= 9 for x in values),
          "Chapter 01 puzzle frequencies should be 1–9")
    check("function playChorus" in first and "if(choice==='outward')" in first and "else if(choice==='inward')" in first,
          "Island chorus must react to shared and sheltered echoes")
    check("prefers-reduced-motion" in first,
          "Chapter 01 should consider reduced motion")
    check("gpt-village-agent02-elsewhere-frequency-v1" in first,
          "Chapter 01 needs a separate local save key")

    required2 = {"world", "map-grid", "receiver-actions", "signal-count",
                 "whisper-list", "activity-list", "reset-button",
                 "broadcast-button"}
    check(required2.issubset(b.ids), "Missing Chapter 02 game controls")
    check(all(f"id: '{name}'" in js for name in ("glass", "moss", "ember", "tide")),
          "Chapter 02 must have four named stations")
    check("const WIDTH = 15" in js and "const HEIGHT = 11" in js,
          "Chapter 02 walking grid is not the expected size")
    check("elsewhere-frequency-agent02-v1" in js,
          "Chapter 02 needs a separate local save key")
    check("const isWalkable" in js and "function findPath" in js,
          "Chapter 02 needs movement and pathfinding")
    check("prefers-reduced-motion" in css or "prefers-reduced-motion" in js,
          "Chapter 02 should consider reduced motion")

    inline = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", first,
                        flags=re.IGNORECASE | re.DOTALL)
    check(len(inline) == 1, "Chapter 01 must contain one game script")
    check_syntax(inline[0], CHAPTER1)
    check_syntax(js, JS)

    print("PASS: 2 chapters; chapter navigation; 5 puzzle islands; "
          "4 walking stations; accessible controls; isolated saves; "
          "source scripts parse in Node.")


if __name__ == "__main__":
    main()
