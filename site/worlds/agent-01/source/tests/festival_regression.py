"""Agent-01 v7: browser regression for civic festivals and SKY7 sharing.

Optional development dependency: pip install playwright; Chromium must be installed.
Run: python source/tests/festival_regression.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64

ROOT = Path(__file__).resolve().parents[2]
game = ROOT / "play-the-unfinished-sky.html"
if not game.exists():
    game = ROOT / "index.html"
HTML = game.read_text(encoding="utf-8")
STORAGE = """() => { if (!window.__testStorage) window.__testStorage=new Map();
Object.defineProperty(window, 'localStorage',{configurable:true,value:{
getItem(k){return window.__testStorage.get(k)??null},
setItem(k,v){window.__testStorage.set(k,String(v))},
clear(){window.__testStorage.clear()}}}); }"""

def load(page):
    page.evaluate(STORAGE)
    page.set_content(HTML, wait_until="domcontentloaded")

def code(parts):
    data = ".".join(map(str,parts)).encode()
    return "SKY"+str(parts[0])+"-"+base64.urlsafe_b64encode(data).decode().rstrip("=")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
    try:
        page=browser.new_page(viewport={"width":1200,"height":850},reduced_motion="reduce")
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        load(page)
        assert page.locator("#festival-grid .festival-card").count()==3
        assert page.locator("#festival-grid .festival-choices button").count()==0
        for i in [3,2,5]:
            page.locator("#location-nav button").nth(i).click()
            page.locator("#dialog-choices button").first.click()
            page.locator("#dialog-continue").click()
        for i in range(4):
            page.locator("#weather-presets button").nth(i).click()
            page.locator("#visitor-grid .visitor-card").nth(i).locator("button").first.click()
        for i in range(6):
            page.locator("#community-grid .community-card").nth(i).locator("button").first.click()
        for i in [0,1]:
            page.locator("#commons-grid .commons-card").nth(i).locator("button").first.click()
        assert page.locator("#festival-grid .festival-choices button").count()==2
        page.locator("#festival-grid .festival-card").first.locator("button").first.click()
        assert page.locator("#festival-grid .festival-card").first.locator("button").count()==0
        page.locator("#commons-grid .commons-card").nth(2).locator("button").first.click()
        for i in [1,2]:
            page.locator("#festival-grid .festival-card").nth(i).locator("button").first.click()
        assert page.locator("#festival-count").inner_text()=="3 / 3 festivals remembered"
        assert page.locator("#festival-finale").is_visible()
        load(page)
        assert page.locator("#festival-count").inner_text()=="3 / 3 festivals remembered"
        page.locator("#copy-code").click()
        sky7=page.locator("#sky-code").input_value()
        assert sky7.startswith("SKY7-")
        mobile=browser.new_page(viewport={"width":390,"height":840},is_mobile=True,reduced_motion="reduce")
        load(mobile)
        mobile.locator("#sky-code").fill(sky7)
        mobile.locator("#import-code").click()
        assert mobile.locator("#import-dialog").evaluate("(n)=>n.open")
        mobile.locator("#import-confirm").click()
        assert mobile.locator("#festival-count").inner_text()=="3 / 3 festivals remembered"
        assert mobile.locator("#journal .journal-entry").count()==1
        assert mobile.evaluate("document.documentElement.scrollWidth-window.innerWidth")<5
        old=code([6,0,6,10,10,10,10,63,0,-1,24,55,44,0,0,0])
        mobile.locator("#sky-code").fill(old)
        mobile.locator("#import-code").click()
        assert mobile.locator("#import-dialog").evaluate("(n)=>n.open")
        mobile.locator("#import-confirm").click()
        assert mobile.locator("#festival-count").inner_text()=="0 / 3 festivals remembered"
        bad=code([7,0,99,10,10,10,10,63,0,-1,24,55,44,0,0,0,1])
        mobile.locator("#sky-code").fill(bad)
        mobile.locator("#import-code").click()
        assert not mobile.locator("#import-dialog").evaluate("(n)=>n.open")
        assert not errors,errors
        print("PASS: festival prerequisites, three choices, reload, SKY7, SKY6, tamper rejection, mobile")
    finally:
        browser.close()
