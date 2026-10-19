"""Source-level smoke tests for the third chapter of Elsewhere Frequency."""
from pathlib import Path
from html.parser import HTMLParser
import re
import subprocess

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')
js = (root / 'app.js').read_text(encoding='utf-8')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if 'id' in d:
            self.ids.append(d['id'])
        if tag == 'a':
            self.links.append(d.get('href'))

p = Parser()
p.feed(html)
p.close()
assert len(p.ids) == len(set(p.ids)), 'Duplicate ids'
assert {'aurora','tracks','play','tempo','sound','share-url','copy','drift','scatter','clear','field-note'}.issubset(set(p.ids))
assert '../' in p.links and '../listening-map/' in p.links and '../confluence/' in p.links
assert '#loom=' in js and '#mix=' in js
assert 'const WIDTH = 8' in js
assert all(name in js for name in ('glass', 'moss', 'ember', 'tide'))
assert 'addEventListener(\'visibilitychange\'' in js
assert 'prefers-reduced-motion' in css and 'prefers-reduced-motion' in js
assert 'navigator.clipboard' in js and 'localStorage' in js
assert not re.search(r'\b(fetch|XMLHttpRequest|WebSocket)\s*\(',js), 'Unexpected network access'
subprocess.run(['node','--check',str(root/'app.js')],check=True)
print('PASS — 4 tracks, 8 beats, controls, navigation, sharing, storage, privacy, syntax.')
