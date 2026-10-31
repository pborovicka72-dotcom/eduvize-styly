"""Isolated session/API tests. SQLite executes the store queries with PostgreSQL casts adapted."""
import json
import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import admin_sessions as sessions
from fastapi import FastAPI,HTTPException
from fastapi.testclient import TestClient

class Cursor:
 def __init__(self,cursor):self.cursor=cursor
 def convert(self,row):
  if row is None:return None
  return tuple(json.loads(v) if self.cursor.description[i][0]=='scopes' else v for i,v in enumerate(row))
 def fetchone(self):return self.convert(self.cursor.fetchone())
 def fetchall(self):return [self.convert(row) for row in self.cursor.fetchall()]
class Connection:
 def __init__(self,path):self.conn=sqlite3.connect(path,timeout=10);self.conn.execute('PRAGMA foreign_keys=ON')
 def execute(self,sql,args=()):return Cursor(self.conn.execute(sql.replace('%s','?').replace('::jsonb',''),args))
 def __enter__(self):return self
 def __exit__(self,typ,value,tb):
  if typ:self.conn.rollback()
  else:self.conn.commit()
  self.conn.close()
class SessionTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=str(Path(self.temp.name)/'sessions.db')
  self.store=sessions.SessionStore(lambda:Connection(self.path))
  self.root=self.store.create({'styles','documents'})
  app=FastAPI();app.include_router(sessions.session_router(self.store,'test-only-styles-key'))
  self.client=TestClient(app)
 def tearDown(self):self.temp.cleanup()
 def auth(self,token=None):return {'Authorization':'Bearer '+(token or self.root['token'])}
 def test_tokens_are_not_stored_in_plaintext(self):
  conn=sqlite3.connect(self.path);blob=' '.join(str(row) for row in conn.execute('SELECT * FROM eduvize_admin_sessions_v1'));conn.close()
  self.assertNotIn(self.root['token'],blob);self.assertIn(sessions.digest(self.root['token']),blob)
 def test_login_requires_correct_key_and_hub_origin(self):
  self.assertEqual(self.client.post('/api/admin-session',json={'stylesKey':'wrong'},headers={'Origin':sessions.HUB_ORIGIN}).status_code,401)
  self.assertEqual(self.client.post('/api/admin-session',json={'stylesKey':'test-only-styles-key'},headers={'Origin':'https://untrusted.example'}).status_code,403)
  response=self.client.post('/api/admin-session',json={'stylesKey':'test-only-styles-key'},headers={'Origin':sessions.HUB_ORIGIN})
  self.assertEqual(response.status_code,200);self.assertEqual(response.json()['scopes'],['styles']);self.assertEqual(response.headers['cache-control'],'no-store')
  self.assertLessEqual(response.json()['expiresAt']-sessions.time.time(),sessions.TTL)
 def test_scope_is_required(self):
  token=self.store.create({'documents'})['token']
  self.assertEqual(self.client.get('/api/admin-session/validate?scope=styles',headers=self.auth(token)).status_code,403)
  self.assertEqual(self.client.get('/api/admin-session/validate?scope=documents',headers=self.auth(token)).status_code,200)
 def test_redirect_allowlist_rejects_untrusted_variants(self):
  for url in ['https://evil.example/config','https://pborovicka72-dotcom.github.io/other/config.html','https://eduvize-design-system-api.onrender.com.evil.example/','https://user@eduvize-design-system-api.onrender.com/','http://eduvize-design-system-api.onrender.com/']:
   with self.subTest(url=url),self.assertRaises(HTTPException):self.store.handoff(self.root['token'],url)
 def test_handoff_is_single_use_and_bound_to_origin(self):
  code=self.store.handoff(self.root['token'],sessions.DOCUMENTS+'/config')
  self.assertNotIn(self.root['token'],code)
  with self.assertRaises(HTTPException):self.store.redeem(code,'https://eduvize-weather.onrender.com')
  child=self.store.redeem(code,sessions.DOCUMENTS)
  self.assertEqual(child['scopes'],['documents','configurations']);self.assertNotEqual(child['token'],self.root['token'])
  with self.assertRaises(HTTPException):self.store.redeem(code,sessions.DOCUMENTS)
  with self.assertRaises(HTTPException):self.store.handoff(child['token'],'https://eduvize-design-system-api.onrender.com/')
 def test_profile_handoff_does_not_grant_document_access(self):
  for target in ['https://eduvize-weather.onrender.com/config','http://127.0.0.1:8789/config.html']:
   origin,_=sessions.target(target)
   child=self.store.redeem(self.store.handoff(self.root['token'],target),origin)
   self.assertEqual(child['scopes'],['configurations'])
   self.assertEqual(self.client.get('/api/admin-session/validate?scope=configurations',headers=self.auth(child['token'])).status_code,200)
   self.assertEqual(self.client.get('/api/admin-session/validate?scope=documents',headers=self.auth(child['token'])).status_code,403)
  self.assertEqual(self.client.get('/api/admin-session/validate?scope=configurations',headers=self.auth()).status_code,200)
 def test_active_profile_is_shared_with_existing_children(self):
  child=self.store.redeem(self.store.handoff(self.root['token'],'https://eduvize-weather.onrender.com/config'),'https://eduvize-weather.onrender.com')
  one='a'*32;two='b'*32
  response=self.client.put('/api/admin-session/profile',json={'profileId':one},headers={**self.auth(),'Origin':sessions.HUB_ORIGIN})
  self.assertEqual(response.status_code,200)
  self.assertEqual(self.client.get('/api/admin-session',headers=self.auth(child['token'])).json()['profileId'],one)
  fresh_child=self.store.redeem(self.store.handoff(self.root['token'],'https://eduvize-weather.onrender.com/config'),'https://eduvize-weather.onrender.com')
  self.assertEqual(fresh_child['profileId'],one)
  self.store.select_profile(self.root['token'],two)
  self.assertEqual(self.store.read(child['token'])['profileId'],two)
  self.assertEqual(self.client.put('/api/admin-session/profile',json={'profileId':one},headers={**self.auth(child['token']),'Origin':sessions.HUB_ORIGIN}).status_code,403)
 def test_profile_selection_validates_origin_id_and_session(self):
  self.assertEqual(self.client.put('/api/admin-session/profile',json={'profileId':'a'*32},headers={'Origin':sessions.HUB_ORIGIN}).status_code,401)
  self.assertEqual(self.client.put('/api/admin-session/profile',json={'profileId':'a'*32},headers={**self.auth(),'Origin':'https://evil.example'}).status_code,403)
  self.assertEqual(self.client.put('/api/admin-session/profile',json={'profileId':'../other'},headers={**self.auth(),'Origin':sessions.HUB_ORIGIN}).status_code,422)
  self.store.select_profile(self.root['token'],'a'*32);self.store.select_profile(self.root['token'],'');self.assertEqual(self.store.read(self.root['token'])['profileId'],'')
 def test_profile_survives_login_renewal(self):
  self.store.select_profile(self.root['token'],'a'*32)
  response=self.client.post('/api/admin-session',json={'stylesKey':'test-only-styles-key'},headers={**self.auth(),'Origin':sessions.HUB_ORIGIN})
  self.assertEqual(response.status_code,200);self.assertEqual(response.json()['profileId'],'a'*32)
  self.assertEqual(self.store.read(response.json()['token'])['profileId'],'a'*32)
 def test_concurrent_redeem_only_one_succeeds(self):
  code=self.store.handoff(self.root['token'],sessions.DOCUMENTS+'/config');results=[]
  def redeem():
   try:self.store.redeem(code,sessions.DOCUMENTS);results.append('ok')
   except HTTPException:results.append('rejected')
  threads=[threading.Thread(target=redeem) for _ in range(2)]
  for thread in threads:thread.start()
  for thread in threads:thread.join()
  self.assertEqual(sorted(results),['ok','rejected'])
 def test_logout_revokes_root_and_every_child(self):
  children=[self.store.redeem(self.store.handoff(self.root['token'],sessions.DOCUMENTS+'/config'),sessions.DOCUMENTS) for _ in range(2)]
  self.store.revoke(children[0]['token'])
  for token in [self.root['token'],*(c['token'] for c in children)]:
   with self.assertRaises(HTTPException):self.store.read(token)
 def test_expired_session_and_handoff_are_rejected(self):
  now=sessions.time.time();code=self.store.handoff(self.root['token'],sessions.DOCUMENTS+'/config')
  with patch.object(sessions.time,'time',return_value=now+61):
   with self.assertRaises(HTTPException):self.store.redeem(code,sessions.DOCUMENTS)
  with patch.object(sessions.time,'time',return_value=now+sessions.TTL+1):
   with self.assertRaises(HTTPException):self.store.read(self.root['token'])
 def test_failed_login_does_not_replace_existing_session(self):
  response=self.client.post('/api/admin-session',json={'stylesKey':'wrong'},headers={**self.auth(),'Origin':sessions.HUB_ORIGIN})
  self.assertEqual(response.status_code,401);self.assertEqual(self.store.read(self.root['token'])['scopes'],['documents','styles'])
 def test_renewed_login_preserves_already_verified_scopes_and_revokes_previous(self):
  token=self.store.create({'documents'})['token']
  response=self.client.post('/api/admin-session',json={'stylesKey':'test-only-styles-key'},headers={**self.auth(token),'Origin':sessions.HUB_ORIGIN})
  self.assertEqual(response.status_code,200);self.assertEqual(response.json()['scopes'],['documents','styles'])
  with self.assertRaises(HTTPException):self.store.read(token)
if __name__=='__main__':unittest.main()
