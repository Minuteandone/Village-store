"""Fast isolated browser checks for the Weatherbound Visitors and SKY4.

Run: python tests/visitors_regression.py
Requires Playwright with Chromium installed; no server or network required.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'play-the-unfinished-sky.html').read_text()
MOCK="""() => {if (!window.__testStorage) window.__testStorage=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStorage.get(k)??null},setItem(k,v){window.__testStorage.set(k,String(v))},removeItem(k){window.__testStorage.delete(k)},clear(){window.__testStorage.clear()}}});}"""
def load(page):
 page.evaluate(MOCK)
 page.set_content(html,wait_until='domcontentloaded',timeout=12000)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
 try:
  c=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce',accept_downloads=True)
  page=c.new_page(); errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  load(page)
  assert page.locator('#visitor-grid .visitor-card').count()==4
  assert page.locator('#visitor-count').inner_text()=='0 / 4 sky postmarks collected'
  for idx in range(4):
   page.locator('#weather-presets button').nth(idx).click(timeout=5000)
   card=page.locator('#visitor-grid .visitor-card').nth(idx)
   assert card.locator('.visitor-choices button').count()==2,(idx,card.inner_text())
   card.locator('.visitor-choices button').first.click(timeout=5000)
   assert page.locator('#visitor-count').inner_text()==f'{idx+1} / 4 sky postmarks collected'
  assert page.locator('#visitor-finale').is_visible()
  print('PASS: four distinct visitor choices, four postmarks, aurora trigger',flush=True)
  page.locator('#weather-presets button').nth(1).click()
  old_steps=page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1')).steps")
  load(page)
  assert page.locator('#visitor-count').inner_text()=='4 / 4 sky postmarks collected'
  assert page.locator('#visitor-grid .visitor-choices button').count()==0
  assert page.evaluate("JSON.parse(localStorage.getItem('agent01-unfinished-sky-v1')).steps")==old_steps
  page.locator('#copy-code').click(timeout=5000)
  code=page.locator('#sky-code').input_value()
  assert code.startswith('SKY4-')
  print('PASS: reload, anti-farming, SKY4 export',flush=True)
  second=c.new_page();load(second)
  second.locator('#sky-code').fill(code)
  second.locator('#import-code').click()
  assert second.locator('#import-dialog').evaluate('(x)=>x.open')
  second.locator('#import-confirm').click()
  assert second.locator('#visitor-count').inner_text()=='4 / 4 sky postmarks collected'
  assert second.locator('#journal .journal-entry').count()==1
  print('PASS: SKY4 import, journal privacy',flush=True)
  for v,l in [(1,8),(2,10),(3,13)]:
   nums={1:'1.0.6.10.10.10.10.63',2:'2.0.6.10.10.10.10.63.0.-1',3:'3.0.6.10.10.10.10.63.0.-1.84.95.9'}[v]
   legacy=second.evaluate("([v,nums])=>'SKY'+v+'-'+btoa(nums).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')",[v,nums])
   second.locator('#sky-code').fill(legacy);second.locator('#import-code').click()
   assert second.locator('#import-dialog').evaluate('(x)=>x.open'),v
   second.locator('#import-confirm').click()
   assert second.locator('#visitor-count').inner_text()=='0 / 4 sky postmarks collected'
  print('PASS: SKY1/SKY2/SKY3 backward imports',flush=True)
  invalid=second.evaluate("()=> 'SKY4-'+btoa('4.0.20.10.10.10.10.63.0.-1.24.55.44.16').replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')")
  second.locator('#sky-code').fill(invalid);second.locator('#import-code').click()
  assert not second.locator('#import-dialog').evaluate('(x)=>x.open')
  print('PASS: corrupt SKY4 postmark mask rejected',flush=True)
  phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce').new_page();load(phone)
  phone.locator('#weather-presets button').nth(2).click();phone.locator('#visitor-grid .visitor-card').nth(2).locator('.visitor-choices button').first.click()
  assert phone.locator('#visitor-count').inner_text()=='1 / 4 sky postmarks collected'
  overflow=phone.evaluate('document.documentElement.scrollWidth-window.innerWidth')
  assert overflow<5,overflow
  assert not errors,errors
  print('PASS: mobile visitor, horizontal overflow, no JavaScript errors',flush=True)
 finally:
  browser.close()
