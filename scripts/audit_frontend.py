"""Repeatable static contract checks for any Eduvize frontend repository."""
import argparse
import json
import re
from pathlib import Path
from html.parser import HTMLParser


class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.assets=[];self.ids=set();self.favicon=False
    def handle_starttag(self, tag, attributes):
        a=dict(attributes)
        if a.get('id'):self.ids.add(a['id'])
        if tag=='script' and a.get('src'):self.assets.append(('script',a['src'],a))
        if tag=='link' and a.get('href'):
            if a.get('rel')=='stylesheet':self.assets.append(('style',a['href'],a))
            if a.get('rel')=='icon' and 'eduvize-favicon.svg' in a['href']:self.favicon=True


def check(root):
    rows=[];errors=[]
    canonical=Path(__file__).resolve().parents[1]/'design-system'/'theme-first-paint.js'
    bootstrap=canonical.read_text().strip() if canonical.exists() else None
    for path in sorted(root.rglob('*.html')):
        relative=path.relative_to(root)
        if any(part in ('experimental','.git','node_modules','tests','preview','before','latest') for part in relative.parts):continue
        source=path.read_text();page=Page();page.feed(source)
        if 'active-theme.js' not in source:continue  # Redirects and protected entry stubs.
        prefix=str(relative)
        if 'admin-tokens.css' not in source:errors.append(prefix+': missing global tokens')
        if not page.favicon:errors.append(prefix+': missing shared favicon')
        if 'data-edu-theme-first-paint=' not in source:errors.append(prefix+': missing cached-theme bootstrap')
        elif bootstrap is not None:
            inline=re.search(r'<script\b[^>]*data-edu-theme-first-paint=[^>]*>([\s\S]*?)</script>',source)
            if not inline or inline[1].strip()!=bootstrap:errors.append(prefix+': cached-theme bootstrap differs from canonical source')
        if re.search(r'ev-theme-pending\s+body[^}]*visibility\s*:\s*hidden',source):errors.append(prefix+': blank-page theme gate')
        seen=set()
        for kind,url,attributes in page.assets:
            if 'design-system/' not in url:continue
            key=(kind,url.split('design-system/')[-1].split('?')[0])
            if key in seen:errors.append(prefix+': duplicate shared asset '+key[1])
            seen.add(key)
            if kind=='script' and key[1] in ('active-theme.js','admin-header.js') and 'defer' not in attributes:errors.append(prefix+': non-deferred '+key[1])
        rows.append({'page':prefix,'assets':len(page.assets),'shared_assets':len(seen)})
    return {'root':str(root),'pages':rows,'errors':errors}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--repo-root',type=Path,default=Path(__file__).resolve().parents[1]);args=parser.parse_args()
    result=check(args.repo_root);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(bool(result['errors']))
