"""The Styles card must reach the editor, never the launcher redirect at /."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web' if (ROOT / 'web/aplikace.html').exists() else ROOT

class Cards(HTMLParser):
    def __init__(self):
        super().__init__()
        self.card = None
        self.heading = False
        self.items = []
    def handle_starttag(self, tag, attrs):
        if tag == 'article':
            self.card = {'heading': '', 'links': []}
        if self.card is None:
            return
        if tag == 'h2':
            self.heading = True
        if tag == 'a':
            self.card['links'].append(dict(attrs))
    def handle_data(self, data):
        if self.card is not None and self.heading:
            self.card['heading'] += data
    def handle_endtag(self, tag):
        if tag == 'h2':
            self.heading = False
        if tag == 'article' and self.card is not None:
            self.items.append(self.card)
            self.card = None

class StylesLauncherRoute(unittest.TestCase):
    def test_both_card_links_use_editor_on_current_environment(self):
        cards = Cards()
        cards.feed((WEB / 'aplikace.html').read_text())
        matches = [c for c in cards.items if c['heading'].strip() == 'Správa stylů']
        self.assertEqual(len(matches), 1)
        links = [a for a in matches[0]['links'] if 'data-edu-operator-only' not in a]
        self.assertEqual(len(links), 2, 'Keep the existing icon and Settings links')
        for link in links:
            self.assertEqual(link['href'], '/design-system/', 'The root / redirects back to the launcher')
            self.assertIn(link.get('target'), (None, '_self'))
            for origin in ['https://test.skola.eduvize.cz', 'https://skola.eduvize.cz', 'http://127.0.0.1:43210']:
                target = urlsplit(urljoin(origin + '/eduvize-styly/aplikace.html', link['href']))
                self.assertEqual(target.netloc, urlsplit(origin).netloc)
                self.assertEqual(target.path, '/design-system/')

if __name__ == '__main__':
    unittest.main()
