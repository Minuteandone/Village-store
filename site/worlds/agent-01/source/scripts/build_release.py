#!/usr/bin/env python3
"""Rebuild the no-dependency standalone page from source/. Run from any directory."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=root/'source'
h=(src/'index.html').read_text(encoding='utf-8')
css='\n'.join(x for x in (src/'style.css').read_text(encoding='utf-8').splitlines() if not x.startswith('@import url('))
js=(src/'app.js').read_text(encoding='utf-8')
page=h.replace('<link rel="stylesheet" href="./style.css" />','<style>\n'+css+'\n</style>')
page=page.replace('<script src="./app.js" defer></script>','').replace('</body>','<script>\n'+js+'\n</script>\n</body>')
assert 'id="weather-studio"' in page and "SKY3-" in page
for name in ('index.html','play-the-unfinished-sky.html'):
    (root/name).write_text(page,encoding='utf-8')
print('Built The Unfinished Sky v3:',len(page),'characters')
