"""Goal 2 v6: Sky Commons, civic gatekeeping, local persistence, and SKY6 codec."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'play-the-unfinished-sky.html').read_text(encoding='utf-8')
STORAGE="""() => {if (!window.__testStorage) window.__testStorage=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStorage.get(k)??null},setItem(k,v){window.__testStorage.set(k,String(v))},clear(){window.__testStorage.clear()}}});}"""
def load(page):
    page.evaluate(STORAGE)
    page.set_content(HTML,wait_until='domcontentloaded',timeout=20000)

def code(parts):
    return 'SKY'+str(parts[0])+'-'+base64.urlsafe_b64encode('.'.join(map(str,parts)).encode()).decode().rstrip('=')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
    try:
        context=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce',accept_downloads=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
        load(page)
        assert page.locator('#commons-grid .commons-card').count()==3
        assert page.locator('#commons-grid .commons-choices button').count()==0
        assert page.locator('#commons-count').inner_text()=='0 / 3 community landmarks founded'
        print('PASS: civic board starts locked, no premature action',flush=True)
        for island_index in [3,2,5]:
            page.locator('#location-nav button').nth(island_index).click(timeout=6000)
            page.locator('#dialog-choices button').first.click(timeout=6000)
            page.locator('#dialog-continue').click(timeout=6000)
        for index in range(4):
            page.locator('#weather-presets button').nth(index).click(timeout=6000)
            page.locator('#visitor-grid .visitor-card').nth(index).locator('.visitor-choices button').first.click(timeout=6000)
        assert page.locator('#community-grid .community-choices button').count()==12
        for i in range(6):
            page.locator('#community-grid .community-card').nth(i).locator('.community-choices button').nth(i%2).click(timeout=6000)
        assert page.locator('#commons-grid .commons-choices button').count()==6
        print('PASS: island/relic, visitor, six friendships unlock three civic projects',flush=True)
        for i in range(3):
            card=page.locator('#commons-grid .commons-card').nth(i)
            card.locator('.commons-choices button').nth(i%2).click(timeout=6000)
            assert page.locator('#commons-count').inner_text()==f'{i+1} / 3 community landmarks founded'
            assert card.locator('.commons-choices button').count()==0
            assert card.locator('.commons-flag').count()==1
        assert page.locator('#commons-finale').is_visible()
        before=page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1'))")
        assert len(before['commons'])==3
        assert len(before['community'])==6
        load(page)
        assert page.locator('#commons-count').inner_text()=='3 / 3 community landmarks founded'
        assert page.locator('#commons-grid .commons-choices button').count()==0
        after=page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1'))")
        assert after['steps']==before['steps']
        print('PASS: all three unique civic endings, irreversible action, saved after reload',flush=True)
        page.locator('#copy-code').click(timeout=6000)
        sky6=page.locator('#sky-code').input_value()
        assert sky6.startswith('SKY6-')
        fresh=browser.new_context(viewport={'width':410,'height':840},is_mobile=True,has_touch=True,reduced_motion='reduce').new_page()
        fresh.on('pageerror',lambda e:errors.append(str(e)))
        load(fresh)
        fresh.locator('#sky-code').fill(sky6)
        fresh.locator('#import-code').click(timeout=6000)
        assert fresh.locator('#import-dialog').evaluate('(n)=>n.open')
        fresh.locator('#import-confirm').click(timeout=6000)
        assert fresh.locator('#commons-count').inner_text()=='3 / 3 community landmarks founded'
        assert fresh.locator('#journal .journal-entry').count()==1
        assert fresh.evaluate('document.documentElement.scrollWidth-window.innerWidth')<5
        print('PASS: SKY6 roundtrip, journal privacy, mobile no overflow',flush=True)
        for version,tail in [(1,[]),(2,[0,-1]),(3,[0,-1,24,55,44]),(4,[0,-1,24,55,44,0]),(5,[0,-1,24,55,44,0,0])]:
            candidate=code([version,0,6,10,10,10,10,63]+tail)
            fresh.locator('#sky-code').fill(candidate)
            fresh.locator('#import-code').click()
            assert fresh.locator('#import-dialog').evaluate('(n)=>n.open'),version
            fresh.locator('#import-confirm').click()
            assert fresh.locator('#commons-count').inner_text()=='0 / 3 community landmarks founded'
        print('PASS: all legacy SKY1–SKY5 imports',flush=True)
        for candidate in [
            code([6,0,100,10,10,10,10,63,0,-1,24,55,44,0,0,1]),
            code([6,0,100,10,10,10,10,63,0,-1,24,55,44,15,364,27]),
            code([6,0,0,10,10,10,10,63,0,-1,24,55,44,15,364,13]),
        ]:
            fresh.locator('#sky-code').fill(candidate)
            fresh.locator('#import-code').click()
            assert not fresh.locator('#import-dialog').evaluate('(n)=>n.open')
        print('PASS: rejected forged projects, out-of-range choices, impossible action counts',flush=True)
        assert not errors,errors
        print('PASS: no page errors',flush=True)
    finally:
        browser.close()
