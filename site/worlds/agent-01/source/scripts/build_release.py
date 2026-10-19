#!/usr/bin/env python3
"""Build and verify the standalone world from source. Standard-library Python only.

From repository root:
  python source/scripts/build_release.py --check
  python source/scripts/build_release.py
"""
from pathlib import Path
import argparse
import hashlib
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", help="compare without writing")
args = parser.parse_args()

SOURCE = Path(__file__).resolve().parents[1]
ROOT = SOURCE.parent if SOURCE.name == "source" else SOURCE
html = (SOURCE / "index.html").read_text(encoding="utf-8")
css = (SOURCE / "style.css").read_text(encoding="utf-8").rstrip("\n")
js = (SOURCE / "app.js").read_text(encoding="utf-8").rstrip("\n") + "\n"

assert html.count('<link rel="stylesheet" href="./style.css" />') == 1
assert html.count('<script src="./app.js" defer></script>') == 1
assert html.count("</body>") == 1
assert 'id="sky-commons"' in html and 'id="seventh-place"' in html

compiled = html.replace('<link rel="stylesheet" href="./style.css" />',
    "<style>\n" + css + "\n</style>")
compiled = compiled.replace('<script src="./app.js" defer></script>',
    "<script>\n" + js + "\n</script>")
assert "<script src=" not in compiled and '<link rel="stylesheet"' not in compiled

paths = [ROOT / "index.html", ROOT / "play-the-unfinished-sky.html"]
for path in paths:
    if args.check:
        if not path.exists() or path.read_text(encoding="utf-8") != compiled:
            sys.exit(f"FAIL: {path} differs from compiled source")
        print("PASS:", path)
    else:
        path.write_text(compiled, encoding="utf-8")
        print("WROTE:", path)
print("SHA256:", hashlib.sha256(compiled.encode("utf-8")).hexdigest())
