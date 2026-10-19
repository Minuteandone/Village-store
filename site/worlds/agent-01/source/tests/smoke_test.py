"""Browser smoke tests for The Unfinished Sky. Run: python tests/smoke_test.py.

Some sandboxed Chromium builds block all navigations. This test uses set_content
with the real stylesheet and game engine inlined, and a mock localStorage object.
The normal site remains ordinary static HTML, CSS, and JavaScript.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
css=(ROOT/'style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400,40,1;0,9..144,600,40,1;1,9..144,400,40,1&display=swap');", '')
js=(ROOT/'app.js').read_text()
markup=html.replace('<link rel="stylesheet" href="./style.css" />', '<style>'+css+'</style>').replace('<script src="./app.js" defer></script>', '').replace('</body>','<script>'+js+'</script></body>')
MOCK_STORAGE="""() => {
  if (!window.__testStorage) window.__testStorage = new Map();
  Object.defineProperty(window, 'localStorage', {configurable:true, value:{
    getItem(k){return window.__testStorage.get(k) ?? null},
    setItem(k,v){window.__testStorage.set(k,String(v))},
    removeItem(k){window.__testStorage.delete(k)},
    clear(){window.__testStorage.clear()}
  }});
}"""

def load(page):
    page.evaluate(MOCK_STORAGE)
    page.set_content(markup, wait_until='domcontentloaded')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    try:
        context = browser.new_context(viewport={'width':1440, 'height':900}, accept_downloads=True)
        page = context.new_page()
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        load(page)
        assert page.title() == 'The Unfinished Sky · agent-01'
        assert page.locator('#location-nav button').count() == 6
        assert page.locator('#item-count').inner_text() == '0 / 6'
        page.locator('#help-btn').click()
        assert page.locator('#guide-dialog').evaluate('(el)=>el.open')
        page.locator('#guide-close').click()
        assert not page.locator('#guide-dialog').evaluate('(el)=>el.open')
        
        # Every island has three story choices, a relic, and distinct lore.
        for i in range(6):
            page.locator('#location-nav button').nth(i).click()
            assert page.locator('#story-dialog').evaluate('(el)=>el.open')
            assert page.locator('#dialog-choices button').count() == 3
            page.locator('#dialog-choices button').nth(i % 3).click()
            assert page.locator('#dialog-result').is_visible()
            assert 'RELIC FOUND:' in page.locator('#dialog-result').inner_text()
            page.locator('#dialog-continue').click()
            assert page.locator('#item-count').inner_text() == f'{i+1} / 6'
        assert page.locator('#loom-count').inner_text() == '0 / 15 secret routes woven'
        assert page.locator('#loom-a option').count() == 7
        # 15 pairwise routes must have distinct stories and be discoverable.
        seen_names=set()
        for i in range(6):
            for j in range(i+1,6):
                a=['orchard','reef','library','market','archive','garden'][i]
                b=['orchard','reef','library','market','archive','garden'][j]
                page.locator('#loom-a').select_option(a)
                page.locator('#loom-b').select_option(b)
                assert page.locator('#weave-btn').is_enabled()
                page.locator('#weave-btn').click()
                name=page.locator('#loom-result h3').inner_text()
                assert name not in seen_names
                seen_names.add(name)
        assert len(seen_names)==15
        assert page.locator('#loom-count').inner_text() == '15 / 15 secret routes woven'
        assert page.locator('#loom-gallery button').count() == 15
        old_steps = page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1')).steps")
        page.locator('#loom-a').select_option('orchard')
        page.locator('#loom-b').select_option('reef')
        page.locator('#weave-btn').click() # replay cannot farm steps or traits
        assert page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1')).steps") == old_steps
        page.locator('#loom-gallery button').last.click()
        assert page.locator('#loom-gallery button[aria-pressed="true"]').count() == 1
        load(page)
        assert page.locator('#loom-count').inner_text() == '15 / 15 secret routes woven'
        assert page.locator('#loom-gallery button[aria-pressed="true"]').count() == 1
        assert 'seventh place' in page.locator('#map-message').inner_text().lower()
        assert page.locator('#seventh-place').is_visible()
        assert page.locator('#seventh-choices button').count() == 4
        # The unlocked secret has four permanent-but-revisable promises.
        page.locator('#seventh-choices button').first.click()
        assert 'A lantern catches fire' in page.locator('#seventh-outcome').inner_text()
        assert 'Seventh Place' in page.locator('#journal').inner_text()
        page.locator('#seventh-choices button').nth(3).click()
        assert 'every star flashes out of order' in page.locator('#seventh-outcome').inner_text()
        load(page)
        assert 'every star flashes out of order' in page.locator('#seventh-outcome').inner_text(), 'Secret promise should survive reload' 
        assert page.locator('#inventory-list .relic').count() == 6
        load(page)
        assert page.locator('#item-count').inner_text() == '6 / 6', 'Refresh should retain local state'
        
        # Revisit has smaller trait change; relics must not duplicate.
        page.locator('#location-nav button').first.click()
        page.locator('#dialog-choices button').first.click()
        assert 'Another possible version' in page.locator('#dialog-result').inner_text()
        page.locator('#dialog-continue').click()
        assert page.locator('#inventory-list .relic').count() == 6

        # Weather phases are cyclic and do not erase the world.
        phase=page.locator('#world-clock').inner_text()
        for _ in range(6):
            page.locator('#shift-sky').click()
        assert page.locator('#world-clock').inner_text() == phase
        assert page.locator('#item-count').inner_text() == '6 / 6'

        # Traveler codes can safely restore in a second isolated browser.
        page.locator('#copy-code').click()
        code = page.locator('#sky-code').input_value()
        assert code.startswith('SKY2-')
        new_context = browser.new_context(viewport={'width':900,'height':750})
        second = new_context.new_page()
        load(second)
        second.locator('#sky-code').fill('malformed')
        second.locator('#import-code').click()
        assert 'valid' in second.locator('#code-status').inner_text()
        second.locator('#sky-code').fill(code)
        second.locator('#import-code').click()
        assert second.locator('#import-dialog').evaluate('(el)=>el.open')
        second.locator('#import-confirm').click()
        assert second.locator('#item-count').inner_text() == '6 / 6'
        assert second.locator('#traits').inner_text() == page.locator('#traits').inner_text()
        assert second.locator('#loom-count').inner_text() == '15 / 15 secret routes woven'
        assert second.locator('#loom-gallery button[aria-pressed="true"]').count() == 1
        assert second.locator('#journal .journal-entry').count() == 1, 'Private journal must not transfer'
        assert second.locator('#seventh-outcome').is_hidden(), 'Secret promise should not transfer by traveler code'
        # Legacy SKY1 imports remain valid; they simply have no woven routes.
        old_code = page.evaluate("""() => {
          const old='1.0.6.10.10.10.10.63';
          return 'SKY1-'+btoa(old).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
        }""")
        second.locator('#sky-code').fill(old_code)
        second.locator('#import-code').click()
        assert second.locator('#import-dialog').evaluate('(el)=>el.open')
        second.locator('#import-confirm').click()
        assert second.locator('#loom-count').inner_text() == '0 / 15 secret routes woven'
        # A crafted SKY2 route without its matching relics must be rejected.
        bad_code = second.evaluate("""() => 'SKY2-'+btoa('2.0.2.10.10.10.10.3.16384.14').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')""")
        second.locator('#sky-code').fill(bad_code)
        second.locator('#import-code').click()
        assert not second.locator('#import-dialog').evaluate('(el)=>el.open')
        new_context.close()

        # Postcard download is complete and contains transferable code.
        with page.expect_download() as download_info:
            page.locator('#export-btn').click()
        assert download_info.value.suggested_filename == 'my-unfinished-sky-postcard.txt'
        
        # Confirm reset explicitly, not on opening the dialogue.
        page.locator('#reset-btn').click()
        assert page.locator('#item-count').inner_text() == '6 / 6'
        page.locator('#reset-cancel').click()
        page.locator('#reset-btn').click()
        page.locator('#reset-confirm').click()
        assert page.locator('#item-count').inner_text() == '0 / 6'
        assert page.locator('#loom-count').inner_text() == '0 / 15 secret routes woven'
        load(page)
        assert page.locator('#item-count').inner_text() == '0 / 6'
        assert not errors, f'JavaScript errors: {errors}'
        print('PASS desktop: 6 islands, 18 choices, 15 woven routes, secret Seventh Place, persistence, SKY2+SKY1 sharing, postcard, reset, no JS exceptions')
        
        # Phone size: map, buttons and modal are usable without horizontal viewport overflow.
        mobile_context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mobile = mobile_context.new_page()
        mobile.on('pageerror', lambda err: errors.append('mobile: '+str(err)))
        load(mobile)
        mobile.locator('#location-nav button').nth(2).click()
        assert mobile.locator('#story-dialog').evaluate('(el)=>el.open')
        mobile.locator('#dialog-choices button').nth(1).click()
        mobile.locator('#dialog-continue').click()
        assert mobile.locator('#item-count').inner_text() == '1 / 6'
        overflow = mobile.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        assert overflow < 5, f'Mobile horizontal overflow by {overflow}px'
        assert not errors, f'JavaScript errors: {errors}'
        print('PASS mobile: story choices, 1 relic, no horizontal overflow, no JS exceptions')
        mobile_context.close()
        context.close()
    finally:
        browser.close()
        pass
