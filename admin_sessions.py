"""Short-lived Eduvize administration sessions; Microsoft credentials stay server-side."""
import hashlib
import json
import re
import secrets
import time
from contextlib import contextmanager
from urllib.parse import urlsplit
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response

HUB='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html'
DOCUMENTS='https://eduvize-dokumenty-api.onrender.com'
HUB_ORIGIN='https://pborovicka72-dotcom.github.io'
TTL=8*60*60
REMEMBER_TTL=30*24*60*60
TARGETS={
 ('https://eduvize-prubeh-dne.onrender.com','/config.html'):None,
 ('https://eduvize-jidelnicek.onrender.com','/config.html'):None,
 ('http://127.0.0.1:8790','/config.html'):None,
 ('https://eduvize-design-system-api.onrender.com','/'):'styles',
 ('https://eduvize-design-system-api.onrender.com','/design-system'):'styles',
 ('https://eduvize-design-system-api.onrender.com','/design-system/'):'styles',
 (DOCUMENTS,'/config'):'documents',
 ('https://eduvize-weather.onrender.com','/config'):None,
 ('https://eduvize-aktuality.onrender.com','/config'):None,
 ('https://eduvize-skolni-systemy.onrender.com','/config.html'):None,
 ('http://127.0.0.1:8789','/config.html'):None,
}
for repo in ['eduvize-kiosek','eduvize-svatky','eduvize-moudrost-dne','eduvize-jizdni-rady','eduvize-dokumenty']:
 TARGETS[('https://pborovicka72-dotcom.github.io',f'/{repo}/config.html')]='documents' if repo in ['eduvize-kiosek','eduvize-dokumenty'] else None
ORIGINS={origin for origin,path in TARGETS}

def target(value):
 if not isinstance(value,str) or len(value)>4000:raise HTTPException(422,'Neplatná cílová stránka.')
 try:u=urlsplit(value)
 except ValueError:raise HTTPException(422,'Neplatná cílová stránka.')
 origin=f'{u.scheme}://{u.netloc}'
 if u.username or u.password or (origin,u.path) not in TARGETS:raise HTTPException(422,'Tato cílová stránka není povolená.')
 return origin,TARGETS[(origin,u.path)]

def digest(token):return hashlib.sha256(token.encode()).hexdigest()
def bearer(auth):
 if not auth or not auth.startswith('Bearer edu_'):raise HTTPException(401,'Přihlaste se na rozcestníku Eduvize.')
 return auth[7:]

class SessionStore:
 def __init__(self,connect):self.connect=connect
 @contextmanager
 def db(self):
  with self.connect() as conn:
   conn.execute('CREATE TABLE IF NOT EXISTS eduvize_admin_sessions_v1 (token_hash TEXT PRIMARY KEY, scopes JSONB NOT NULL, expires DOUBLE PRECISION NOT NULL, parent_hash TEXT REFERENCES eduvize_admin_sessions_v1(token_hash) ON DELETE CASCADE)')
   conn.execute('CREATE TABLE IF NOT EXISTS eduvize_admin_handoffs_v1 (code_hash TEXT PRIMARY KEY, root_hash TEXT NOT NULL REFERENCES eduvize_admin_sessions_v1(token_hash) ON DELETE CASCADE, origin TEXT NOT NULL, scopes JSONB NOT NULL, expires DOUBLE PRECISION NOT NULL)')
   conn.execute('CREATE TABLE IF NOT EXISTS eduvize_admin_profile_selection_v1 (root_hash TEXT PRIMARY KEY REFERENCES eduvize_admin_sessions_v1(token_hash) ON DELETE CASCADE, profile_id TEXT NOT NULL)')
   yield conn
 def read(self,token):
  with self.db() as conn:
   row=conn.execute('SELECT scopes,expires,parent_hash FROM eduvize_admin_sessions_v1 WHERE token_hash=%s',(digest(token),)).fetchone()
  if not row or row[1]<=time.time():raise HTTPException(401,'Přihlášení vypršelo. Obnovte je na rozcestníku Eduvize.')
  root=row[2] or digest(token)
  with self.db() as conn:profile=conn.execute('SELECT profile_id FROM eduvize_admin_profile_selection_v1 WHERE root_hash=%s',(root,)).fetchone()
  return {'scopes':row[0], 'expiresAt':row[1], 'root':root, 'profileId':profile[0] if profile else ''}
 def select_profile(self,token,profile_id):
  row=self.read(token)
  if digest(token)!=row['root']:raise HTTPException(403,'Profil vyberte na stránce Účet a konfigurace.')
  if not isinstance(profile_id,str) or (profile_id and not re.fullmatch(r'[a-f0-9]{32}',profile_id)):raise HTTPException(422,'Neplatný profil.')
  with self.db() as conn:
   if profile_id:conn.execute('INSERT INTO eduvize_admin_profile_selection_v1 (root_hash,profile_id) VALUES (%s,%s) ON CONFLICT (root_hash) DO UPDATE SET profile_id=EXCLUDED.profile_id',(row['root'],profile_id))
   else:conn.execute('DELETE FROM eduvize_admin_profile_selection_v1 WHERE root_hash=%s',(row['root'],))
  return profile_id
 def create(self,scopes,remember=False):
  token='edu_'+secrets.token_urlsafe(32);expires=time.time()+(REMEMBER_TTL if remember else TTL)
  with self.db() as conn:
   conn.execute('DELETE FROM eduvize_admin_sessions_v1 WHERE expires<=%s',(time.time(),))
   conn.execute('DELETE FROM eduvize_admin_handoffs_v1 WHERE expires<=%s',(time.time(),))
   conn.execute('INSERT INTO eduvize_admin_sessions_v1 (token_hash,scopes,expires) VALUES (%s,%s::jsonb,%s)',(digest(token),json.dumps(sorted(scopes)),expires))
  return {'token':token,'scopes':sorted(scopes),'expiresAt':expires}
 def revoke(self,token):
  row=self.read(token)
  with self.db() as conn:conn.execute('DELETE FROM eduvize_admin_sessions_v1 WHERE token_hash=%s',(row['root'],))
 def handoff(self,token,return_to):
  row=self.read(token);origin,scope=target(return_to)
  if scope and scope not in row['scopes']:raise HTTPException(403,'Pro tuto administraci doplňte přihlášení na rozcestníku.')
  code=secrets.token_urlsafe(32);scopes=[scope] if scope else []
  if 'documents' in row['scopes'] or 'configurations' in row['scopes']:scopes.append('configurations')
  with self.db() as conn:
   conn.execute('INSERT INTO eduvize_admin_handoffs_v1 (code_hash,root_hash,origin,scopes,expires) VALUES (%s,%s,%s,%s::jsonb,%s)',(digest(code),row['root'],origin,json.dumps(scopes),time.time()+60))
  return code
 def redeem(self,code,origin):
  if not isinstance(code,str) or len(code)>200:raise HTTPException(401,'Neplatné předání přihlášení.')
  with self.db() as conn:
   row=conn.execute('DELETE FROM eduvize_admin_handoffs_v1 WHERE code_hash=%s AND origin=%s AND expires>%s RETURNING root_hash,scopes',(digest(code),origin,time.time())).fetchone()
   if not row:raise HTTPException(401,'Odkaz pro přihlášení vypršel nebo již byl použit. Vraťte se na rozcestník.')
   parent=conn.execute('SELECT expires FROM eduvize_admin_sessions_v1 WHERE token_hash=%s',(row[0],)).fetchone()
   if not parent or parent[0]<=time.time():raise HTTPException(401,'Přihlášení vypršelo.')
   token='edu_'+secrets.token_urlsafe(32)
   conn.execute('INSERT INTO eduvize_admin_sessions_v1 (token_hash,scopes,expires,parent_hash) VALUES (%s,%s::jsonb,%s,%s)',(digest(token),json.dumps(row[1]),parent[0],row[0]))
  return {'token':token,'scopes':row[1],'expiresAt':parent[0],'profileId':self.read(token)['profileId']}

def require_session(store,auth,scope=None):
 row=store.read(bearer(auth))
 if scope and scope not in row['scopes']:raise HTTPException(403,'Pro tuto administraci doplňte přihlášení na rozcestníku.')
 return row

def session_router(store,styles_key,documents_url=DOCUMENTS):
 def no_store(response:Response):
  response.headers['Cache-Control']='no-store'
  response.headers['Pragma']='no-cache'
 router=APIRouter(dependencies=[Depends(no_store)])
 def hub_origin(request):
  if request.headers.get('origin')!=HUB_ORIGIN:raise HTTPException(403,'Přihlášení otevřete na rozcestníku Eduvize.')
 @router.post('/api/admin-session/microsoft')
 async def microsoft_login(request:Request,authorization:str=Header(default='')):
  hub_origin(request);body=await request.json()
  ticket=body.get('ticket');verifier=body.get('verifier')
  if not isinstance(ticket,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}',ticket) or not isinstance(verifier,str) or not re.fullmatch(r'[A-Za-z0-9_-]{43,128}',verifier):raise HTTPException(401,'Neplatné předání Microsoft přihlášení.')
  try:
   async with httpx.AsyncClient(timeout=30,follow_redirects=False) as client:
    response=await client.post(documents_url+'/auth/microsoft/login/exchange',json={'ticket':ticket,'verifier':verifier})
  except httpx.HTTPError:raise HTTPException(503,'Přihlášení nyní nelze ověřit. Spusťte je znovu.')
  if response.status_code in (400,401,403):raise HTTPException(401,'Microsoft přihlášení vypršelo nebo není platné. Spusťte je znovu.')
  if not response.is_success:raise HTTPException(503,'Služba přihlášení není dostupná. Spusťte přihlášení znovu.')
  try:data=response.json()
  except ValueError:raise HTTPException(503,'Služba přihlášení nevrátila platnou odpověď.')
  if not isinstance(data,dict):raise HTTPException(401,'Microsoft identita nebyla ověřena.')
  if data.get('authenticated') is not True or not isinstance(data.get('accountId'),str) or not data['accountId'] or not isinstance(data.get('remember'),bool):raise HTTPException(401,'Microsoft identita nebyla ověřena.')
  result=store.create({'styles','documents'},remember=data['remember'])
  if authorization:
   try:
    old=require_session(store,authorization)
    if old.get('profileId'):store.select_profile(result['token'],old['profileId']);result['profileId']=old['profileId']
    store.revoke(bearer(authorization))
   except HTTPException:pass
  return result
 @router.post('/api/admin-session')
 async def login(request:Request,authorization:str=Header(default='')):
  hub_origin(request);data=await request.json();scopes=set()
  old=None
  if authorization:
   try:old=require_session(store,authorization);scopes.update(old['scopes'])
   except HTTPException:pass
  sk=data.get('stylesKey','');dk=data.get('documentsKey','')
  if not isinstance(sk,str) or not isinstance(dk,str) or len(sk)>4096 or len(dk)>4096:raise HTTPException(422,'Neplatný přihlašovací klíč.')
  if not sk and not dk:raise HTTPException(422,'Vyplňte alespoň jeden administrační klíč.')
  if sk:
   if not styles_key or not secrets.compare_digest(sk,styles_key):raise HTTPException(401,'Neplatný klíč správy stylů.')
   scopes.add('styles')
  if dk:
   try:
    async with httpx.AsyncClient(timeout=90,follow_redirects=False) as client:r=await client.get(documents_url+'/api/admin/status',params={'authOnly':'true'},headers={'Authorization':'Bearer '+dk})
   except httpx.HTTPError:raise HTTPException(503,'Služba Dokumentů nyní není dostupná.')
   if r.status_code in (401,403):raise HTTPException(401,'Neplatný klíč Dokumentů a OneDrive.')
   if not r.is_success:raise HTTPException(503,'Nelze ověřit připojení Dokumentů. Zkuste to později.')
   scopes.add('documents')
  remember=data.get('remember',False)
  if not isinstance(remember,bool):raise HTTPException(422,'Neplatná volba zapamatování přihlášení.')
  result=store.create(scopes,remember=remember)
  if old and old.get('profileId'):
   store.select_profile(result['token'],old['profileId']);result['profileId']=old['profileId']
  if old:
   try:store.revoke(bearer(authorization))
   except HTTPException:pass
  return result
 @router.get('/api/admin-session')
 def status(authorization:str=Header(default='')):
  row=require_session(store,authorization);return {'scopes':row['scopes'],'expiresAt':row['expiresAt'],'profileId':row['profileId']}
 @router.put('/api/admin-session/profile')
 async def select_profile(request:Request,authorization:str=Header(default='')):
  hub_origin(request);data=await request.json()
  return {'profileId':store.select_profile(bearer(authorization),data.get('profileId'))}
 @router.get('/api/admin-session/validate')
 def validate(scope:str='',authorization:str=Header(default='')):
  if scope not in ('styles','documents','configurations'):raise HTTPException(422,'Neplatná administrace.')
  row=require_session(store,authorization)
  if scope not in row['scopes'] and not (scope=='configurations' and 'documents' in row['scopes']):raise HTTPException(403,'Pro tuto administraci doplňte přihlášení na rozcestníku.')
  return {'valid':True,'scope':scope,'expiresAt':row['expiresAt']}
 @router.delete('/api/admin-session')
 def logout(authorization:str=Header(default='')):
  try:store.revoke(bearer(authorization))
  except HTTPException as e:
   if e.status_code!=401:raise
  return {'ok':True}
 @router.post('/api/admin-session/handoff')
 async def handoff(request:Request,authorization:str=Header(default='')):
  hub_origin(request);data=await request.json();return {'code':store.handoff(bearer(authorization),data.get('returnTo'))}
 @router.post('/api/admin-session/redeem')
 async def redeem(request:Request):
  origin=request.headers.get('origin')
  if origin not in ORIGINS:raise HTTPException(403,'Nepovolená stránka přihlášení.')
  data=await request.json();return store.redeem(data.get('code'),origin)
 return router

