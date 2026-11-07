"""Real Chromium regression for stale equal-card heights in NSP 6/4.
CI: pip install playwright; playwright install --with-deps chromium
Run: python design-system/tests/section-pager-browser.py
Only an ephemeral loopback server and fixed synthetic text; no live APIs or credentials.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


def run():
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):pass
    handler=functools.partial(QuietHandler,directory=str(ROOT))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            context=browser.new_context(viewport={'width':1360,'height':1000})
            external=[]
            def route(request):
                if request.request.url.startswith('http://127.0.0.1:'):
                    request.continue_()
                else:external.append(request.request.url);request.abort()
            context.route('**/*',route)
            cases=[]
            for kind,count in [('forecast-grid',3),('hourly-grid',3),('daily-hourly-grid',3),('metrics',3),('forecast-grid',0),('forecast-grid',1)]:
                for seed in (600,1200):
                    for order in ('pagerFirst','equalFirst'):
                        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                        page.goto(f'http://127.0.0.1:{server.server_port}/design-system/tests/section-pager-natural-height.html?seed={seed}&kind={kind}&count={count}')
                        page.locator('#seed').click();page.locator('#'+order).click()
                        before=json.loads(page.locator('#trace').inner_text().strip().splitlines()[-1])
                        original_text=page.locator('.weather-page').first.text_content()
                        assert before['host']==[2968,250],before
                        assert before['role']=='48px',before
                        assert len(before['columns'].split())==max(count,1),before
                        assert before['transformedHeight']<=251,before
                        assert all(c['authoredMin']=='23px' for c in before['cards']),before
                        if before['cards']:assert max(c['h'] for c in before['cards'])-min(c['h'] for c in before['cards'])<=1,before
                        # Exercise real manual paging away/back and unchanged refresh events.
                        page.get_by_role('button',name='Další →',exact=True).click()
                        page.get_by_role('button',name='← Předchozí',exact=True).click()
                        for _ in range(3):page.locator('#snapshot').click()
                        after=json.loads(page.locator('#trace').inner_text().strip().splitlines()[-1])
                        assert after['scale']==before['scale'],(before,after)
                        assert page.locator('.weather-page').first.text_content()==original_text
                        assert after['textLength']==before['textLength'],(before,after)
                        assert after['role']==before['role'],(before,after)
                        assert abs(after['transformedHeight']-before['transformedHeight'])<=1,(before,after)
                        assert not after['queued'],after
                        assert not errors,errors
                        cases.append({'kind':kind,'count':count,'seed':seed,'order':order,'scale':float(after['scale']),'height':after['transformedHeight'],'role':after['role']})
                        page.close()
            # Same content + final geometry must not depend on previous widths or callback order.
            for kind,count in {(c['kind'],c['count']) for c in cases}:
                group=[c for c in cases if c['kind']==kind and c['count']==count]
                assert max(c['scale'] for c in group)-min(c['scale'] for c in group)<=.001,group
                assert max(c['height'] for c in group)-min(c['height'] for c in group)<=1,group
            assert not external,external
            print(json.dumps({'result':'PASS','cases':cases,'externalRequests':len(external)},indent=2))
            browser.close()
    finally:server.shutdown();server.server_close();thread.join(timeout=5)


if __name__=='__main__':run()
