import ast
import json
import copy
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class APIError(Exception):
 def __init__(self,code,detail):self.status_code=code
source=ast.parse((ROOT/'app.py').read_text())
nodes=[node for node in source.body if isinstance(node,ast.FunctionDef) and node.name in ('theme_default','theme_validate')]
namespace={'json':json,'ROOT':ROOT,'HTTPException':APIError}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'app.py','exec'),namespace)
class IconThemeTests(unittest.TestCase):
 def test_old_theme_uses_default_icon_radius(self):
  theme=namespace['theme_default']();theme.pop('icons');result=namespace['theme_validate'](theme);self.assertEqual(result['icons']['radiusPx'],10)
 def test_icon_radius_is_independent(self):
  theme=namespace['theme_default']();theme['icons']['radiusPx']=0;theme['controls']['radiusPx']=16;theme['cards']['radiusPx']=22;result=namespace['theme_validate'](theme);self.assertEqual(result['icons']['radiusPx'],0);self.assertEqual(result['controls']['radiusPx'],16);self.assertEqual(result['cards']['radiusPx'],22)
 def test_invalid_icon_radius_rejected(self):
  for value in (-1,25,'10',True):
   with self.subTest(value=value):
    theme=namespace['theme_default']();theme['icons']['radiusPx']=value
    with self.assertRaises(APIError):namespace['theme_validate'](theme)
if __name__=='__main__':unittest.main()
