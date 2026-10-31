import ast
import unicodedata
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class APIError(Exception):
 def __init__(self,status_code,detail):self.status_code=status_code;self.detail=detail
source=ast.parse((ROOT/'app.py').read_text())
nodes=[n for n in source.body if isinstance(n,ast.FunctionDef) and n.name in ('theme_name_key','theme_unique_name')]
ns={'unicodedata':unicodedata,'HTTPException':APIError}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'app.py','exec'),ns)
class Connection:
 def __init__(self,rows):self.rows=rows;self.commands=[]
 def execute(self,sql):self.commands.append(sql);return self
 def fetchall(self):return self.rows
class ThemeNameTests(unittest.TestCase):
 def test_variants_of_existing_name_are_rejected(self):
  for name in ['Modrá škola','  MODRÁ   ŠKOLA  ','modrá\u00a0škola','Modra\u0301 škola']:
   with self.subTest(name=name):
    conn=Connection([('original','Modrá škola')])
    with self.assertRaises(APIError) as error:ns['theme_unique_name'](conn,name)
    self.assertEqual(error.exception.status_code,409)
    self.assertTrue(conn.commands[0].startswith('LOCK TABLE'))
    self.assertEqual(conn.rows,[('original','Modrá škola')])
 def test_new_distinct_name_is_allowed(self):ns['theme_unique_name'](Connection([('original','Modrá škola')]),'Modrá škola – kopie')
 def test_updating_own_name_is_allowed(self):ns['theme_unique_name'](Connection([('original','Modrá škola')]),'Modrá škola','original')
 def test_rename_cannot_take_another_name(self):
  with self.assertRaises(APIError):ns['theme_unique_name'](Connection([('a','Modrá'),('b','Zelená')]),'ZELENÁ','a')
 def test_builtin_name_is_reserved_without_database_row(self):
  with self.assertRaises(APIError):ns['theme_unique_name'](Connection([]),'  eduvize   STANDARD ')
 def test_new_style_keeps_insert_only_semantics(self):
  create=next(n for n in source.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='create_admin_theme')
  text=ast.get_source_segment((ROOT/'app.py').read_text(),create)
  self.assertIn('uuid.uuid4()',text);self.assertIn('theme_unique_name(conn,name)',text)
  self.assertNotIn('ON CONFLICT',text);self.assertNotIn('UPDATE ',text)
if __name__=='__main__':unittest.main()
