"""Exercise the actual shared CSS in Chromium: status dots are not error messages."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

css = (Path(__file__).resolve().parents[1] / 'output-integrity.css').read_text()
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    requests = []
    page.route('**/*', lambda route: (requests.append(route.request.url), route.abort()))
    assert ':is(.empty,.error:not(.dot))' in css
    baseline = css.replace(':is(.empty,.error:not(.dot))', ':is(.empty,.error)')
    page.set_content('<html data-kiosk-app="transport" data-output-mode="kiosk"><head><style>' + baseline + '</style><style>html{--edu-kiosk-text-inset:25.8359px}.dot{display:inline-block;width:10px;height:10px;box-sizing:border-box;border-radius:50%}</style></head><body><span id="baseline-dot" class="dot error"></span></body></html>', wait_until='load')
    before = page.locator('#baseline-dot').bounding_box()
    assert before['width'] > before['height'] + 20, before
    for mode in ['kiosk', 'nsp', 'web']:
        for width, height in [(1920, 1080), (1080, 1920)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.set_content('''<!doctype html><html data-kiosk-app="transport" data-output-mode="''' + mode + '''">
<head><style>''' + css + '''</style><style>
html{--edu-kiosk-text-inset:25.8359px;--edu-header-inset:25.8359px}
.dot{display:inline-block;width:10px;height:10px;box-sizing:border-box;border-radius:50%;background:red}
</style></head><body><span id="normal" class="dot"></span><span id="error-dot" class="dot error"></span>
<div id="error-message" class="error">Service unavailable</div><div id="empty-message" class="empty">No departures</div>
<div id="transport-message" class="message">Transport message</div></body></html>''', wait_until='load')
            values = page.evaluate('''() => Object.fromEntries(['normal','error-dot','error-message','empty-message','transport-message'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),s=getComputedStyle(e);return [id,{width:r.width,height:r.height,left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight)}]}))''')
            for name in ['normal', 'error-dot']:
                value = values[name]
                assert abs(value['width'] - 10) < .1 and abs(value['height'] - 10) < .1, (mode, width, height, name, value)
                assert value['left'] == value['right'] == 0, (mode, name, value)
            for name in ['error-message', 'empty-message', 'transport-message']:
                expected = 25.8359 if mode == 'kiosk' else 0
                assert abs(values[name]['left'] - expected) < .1, (mode, name, values[name])
                assert abs(values[name]['right'] - expected) < .1, (mode, name, values[name])
            results.append({'mode': mode, 'viewport': [width, height], 'values': values})
    browser.close()
print(json.dumps({'result': 'PASS', 'baselineOval': before, 'cases': results, 'network': 'All attempted imported resources blocked; no live services contacted', 'blockedImports': len(requests)}, indent=2))
