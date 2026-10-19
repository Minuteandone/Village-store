#!/usr/bin/env python3
"""Rebuild the single-file game, release archives, and a reproducible manifest.

Usage: python scripts/build_release.py
No external dependencies. The standalone game needs no server and no CDN.
"""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/mnt/data')

html = (ROOT/'index.html').read_text(encoding='utf-8')
css = (ROOT/'style.css').read_text(encoding='utf-8')
js = (ROOT/'app.js').read_text(encoding='utf-8')
assert 'id="seventh-place"' in html, 'Secret finale markup missing from source'
assert '<link rel="stylesheet" href="./style.css" />' in html
assert '<script src="./app.js" defer></script>' in html
# Remove optional CDN font loading for genuinely offline operation.
css = '\n'.join(line for line in css.splitlines() if not line.startswith('@import url('))
release = html.replace('<link rel="stylesheet" href="./style.css" />', '<style>\n'+css+'\n</style>')
release = release.replace('<script src="./app.js" defer></script>', '')
release = release.replace('</body>', '<script>\n'+js+'\n</script>\n</body>')
# The public wall is an online-only, separate page. On a standalone file, link
# directly to the published public GitHub Issues contribution form instead.
release = release.replace('href="./guestbook.html">Visit the Constellation Wall ↗',
    'href="https://gpt-village.github.io/agent-01-unfinished-sky/guestbook.html" '
    'target="_blank" rel="noopener noreferrer">Visit the public Constellation Wall ↗')
assert '<script src="' not in release and '<link rel="stylesheet"' not in release
assert 'id="seventh-place"' in release
paths = [ROOT/'play-the-unfinished-sky.html',ROOT/'standalone.html',
         ROOT/'dist/unfinished-sky-offline.html',ROOT/'dist/the-unfinished-sky-offline.html',OUT/'unfinished-sky-offline.html',
         OUT/'agent01-standalone.html']
for p in paths:
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(release,encoding='utf-8')

# Keep source archive small and understandable while including all internal
# project files needed to reproduce and test the app; leave out transitory junk.
exclude_names = {'.DS_Store','__pycache__'}
source_files = [p for p in ROOT.rglob('*') if p.is_file() and p.name not in exclude_names
    and '__pycache__' not in p.parts and p.suffix not in ('.pyc', '.tmp')]
manifest = {
    'project':'The Unfinished Sky', 'agent':'agent-01',
    'edition':'2026-10-19 / Goal 2, The Sky Commons v6',
    'standalone_sha256':hashlib.sha256(release.encode('utf-8')).hexdigest(),
    'seventh_place':True,
    'loom_routes':15,
    'weather_studio':{'dials':3,'presets':4,'png_export':True},
    'weatherbound_visitors':{'total':4,'postmarks':4,'aurora_finale':True},
    'living_constellations':{'pair_stories':6,'choices_per_story':2,'friendship_finale':True},
    'sky_commons':{'projects':3,'choices_per_project':2,'map_landmarks':True,'civic_finale':True},
    'traveler_code':'SKY6 with SKY1 through SKY5 legacy import',
    'source_files':len(source_files),
}
(ROOT/'RELEASE.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
source_files = [p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc','.tmp')]
for output in [OUT/'the-unfinished-sky-agent-01.zip',OUT/'agent01-unfinished-sky-source.zip']:
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7) as z:
        for file in sorted(source_files):
            z.write(file,arcname=f'agent01-unfinished-sky/{file.relative_to(ROOT).as_posix()}')
    with zipfile.ZipFile(output) as z:
        assert z.testzip() is None
print('RELEASE',manifest['standalone_sha256'])
print('SOURCE FILES',len(source_files),'STANDALONE BYTES',len(release.encode()))
for p in paths[:1]+[OUT/'the-unfinished-sky-agent-01.zip']:
    print(p, p.stat().st_size)
