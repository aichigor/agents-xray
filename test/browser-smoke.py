# Optional browser smoke tests: build standalone first; pip install playwright; playwright install chromium.
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json
import os

root=Path(__file__).resolve().parents[1]
artifacts=root/'artifacts'
artifacts.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, **({'executable_path': os.environ['XR_CHROMIUM_EXECUTABLE']} if os.environ.get('XR_CHROMIUM_EXECUTABLE') else {}))
    page=browser.new_page(viewport={'width':1440,'height':1120}, device_scale_factor=1)
    errors=[]; requests=[]
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('request', lambda request: requests.append(request.url))
    page.set_content((root/'dist/AGENTS-Xray-Standalone.html').read_text(), wait_until='load')
    page.get_by_role('button', name='試跑範例專案').click()
    page.wait_for_selector('#report:not([hidden])')
    assert page.locator('.finding').count()==8
    assert page.locator('#metric-findings').inner_text()=='8'
    results.append('folder-shaped synthetic demo: 8 findings')
    page.screenshot(path=str(artifacts/'desktop.png'), full_page=True)
    page.get_by_role('button', name='English', exact=True).click()
    assert page.locator('h1').inner_text()=='See what your agent is told.'
    assert page.locator('.finding').count()==8
    results.append('English/Traditional Chinese language switch')
    page.locator('#filter').select_option('warning')
    assert page.locator('.finding').count()==2
    results.append('finding severity filter')
    page.locator('#filter').select_option('all')
    page.locator('#cwd').fill('.')
    assert page.locator('#report').is_hidden()
    assert page.locator('#export-json').is_disabled()
    page.locator('#analyze').click()
    assert page.locator('#metric-findings').inner_text()=='6'
    results.append('changed input invalidates stale exports and recomputes scope')
    page.locator('#folder-input').set_input_files(str(root/'examples/demo-project'))
    expect(page.locator('#status')).to_contain_text('Done.')
    assert page.locator('#mode-tag').inner_text()=='PROJECT'
    page.locator('#cwd').fill('apps/web')
    page.locator('#analyze').click()
    assert page.locator('.finding').count()==8
    results.append('real folder import with local File API')
    page.on('dialog', lambda dialog: dialog.accept())
    with page.expect_download() as download_info:
        page.locator('#export-json').click()
    download=download_info.value
    exported=json.loads(Path(download.path()).read_text())
    assert exported['summary']['warnings']==2
    assert exported['summary']['suggestions']==6
    results.append('JSON export can be downloaded and parsed')
    page.locator('#use-text').click()
    page.locator('#editor').fill('# Rules\n<img src="https://example.invalid/image" onerror="window.HACKED=true">\nPlease think step by step.\nRead `missing/file.js`.')
    page.locator('#analyze').click()
    assert page.locator('.finding').count()==1
    assert page.evaluate('window.HACKED === undefined')
    assert page.locator('#findings img').count()==0
    assert not any(x.startswith('http') for x in requests)
    results.append('pasted HTML stays inert; no external HTTP requests during tested flows')
    assert 'NOT verified' in page.locator('#limitations').inner_text()
    results.append('paste-only mode explicitly skips filesystem checks')
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#demo').click()
    page.get_by_role('button',name='繁體中文',exact=True).click()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(artifacts/'mobile.png'), full_page=True)
    results.append('390px mobile layout has no horizontal overflow')
    assert not errors, errors
    results.append('no browser JavaScript errors')
    browser.close()
(artifacts/'browser-tests.json').write_text(json.dumps({'passed':len(results),'tests':results},ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
