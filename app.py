"""Standalone Eduvize Design System API. No OneDrive dependency."""
import os,json,uuid,secrets,unicodedata
from pathlib import Path
import psycopg
from fastapi import FastAPI,Header,HTTPException,Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
ROOT=Path(__file__).resolve().parent
DATABASE_URL=os.getenv("DATABASE_URL","")
ADMIN=os.getenv("DESIGN_SYSTEM_ADMIN_TOKEN","")
app=FastAPI(title="Eduvize Design System")
app.add_middleware(CORSMiddleware,allow_origins=["https://pborovicka72-dotcom.github.io","https://eduvize-weather.onrender.com","https://eduvize-dokumenty-api.onrender.com","https://eduvize-aktuality.onrender.com"],allow_methods=["GET","POST","PUT","DELETE"],allow_headers=["Authorization","Content-Type"])
def check_admin(auth):
    if not ADMIN:raise HTTPException(503,"DESIGN_SYSTEM_ADMIN_TOKEN is not configured")
    if not auth or not secrets.compare_digest(auth,"Bearer "+ADMIN):raise HTTPException(401,"Neplatný administrační klíč")
@app.get("/health")
def health():return {"status":"ok","database_configured":bool(DATABASE_URL),"admin_configured":bool(ADMIN)}
@app.get("/")
@app.get("/design-system")
@app.get("/design-system/")
def editor():return FileResponse(ROOT/"editor.html")
@app.get("/design-system/{asset_name}")
def asset(asset_name:str):
    allowed={"admin-theme.json":"application/json","admin-tokens.css":"text/css","admin-components.css":"text/css","admin-shell.css":"text/css","nsp-geometry.js":"application/javascript","nsp-segments.js":"application/javascript","nsp-segments.css":"text/css"}
    if asset_name not in allowed:raise HTTPException(404,"Soubor nenalezen")
    return FileResponse(ROOT/"design-system"/asset_name,media_type=allowed[asset_name])
# Design System: immutable default and database-backed named themes.
def theme_default():
    return json.loads((ROOT/"design-system"/"admin-theme.json").read_text(encoding="utf-8"))

def theme_db():
    if not DATABASE_URL:raise HTTPException(503,"Pro ukládání stylů je nutná DATABASE_URL")
    try:
        conn=psycopg.connect(DATABASE_URL,connect_timeout=10)
        conn.execute("CREATE TABLE IF NOT EXISTS eduvize_admin_themes (id TEXT PRIMARY KEY, name TEXT NOT NULL, config JSONB NOT NULL, active BOOLEAN NOT NULL DEFAULT FALSE)")
        conn.commit()
        return conn
    except psycopg.Error:raise HTTPException(503,"Databáze stylů není dostupná")

def theme_validate(value):
    if not isinstance(value,dict):raise HTTPException(422,"Neplatná konfigurace")
    reference=theme_default()
    if value.get("schemaVersion")!=reference["schemaVersion"]:raise HTTPException(422,"Nepodporovaná verze konfigurace")
    for key in reference["colors"]:
        color=value.get("colors",{}).get(key)
        if not isinstance(color,str) or len(color)!=7 or color[0]!="#" or any(c not in "0123456789abcdefABCDEF" for c in color[1:]):raise HTTPException(422,"Neplatná barva: "+key)
    for group,key in [("controls","heightPx"),("controls","radiusPx"),("cards","radiusPx")]:
        v=value.get(group,{}).get(key)
        if type(v) is not int or not 0<=v<=80:raise HTTPException(422,"Neplatná hodnota: "+key)
    icon_radius=value.get("icons",{}).get("radiusPx",reference["icons"]["radiusPx"])
    if type(icon_radius) is not int or not 0<=icon_radius<=24:raise HTTPException(422,"Neplatné zaoblení ikon")
    safe=reference.copy()
    safe["colors"]={k:value["colors"][k] for k in reference["colors"]}
    safe["controls"]={k:value["controls"][k] for k in reference["controls"]}
    safe["cards"]={k:value["cards"][k] for k in reference["cards"]}
    safe["icons"]={"radiusPx":icon_radius}
    return safe

@app.get("/api/design-system/themes")
def list_admin_themes():
    with theme_db() as conn:
        rows=conn.execute("SELECT id,name,config,active FROM eduvize_admin_themes ORDER BY name").fetchall()
    custom=[{"id":row[0],"name":row[1],"config":row[2],"active":row[3]} for row in rows]
    return [{"id":"standard","name":"EDUVIZE Standard","config":next((t["config"] for t in custom if t["id"]=="standard"),theme_default()),"active":not any(t["active"] for t in custom if t["id"]!="standard"),"locked":True}]+[{**t,"locked":False} for t in custom if t["id"]!="standard"]

def theme_name_key(name):
    return unicodedata.normalize("NFKC", " ".join(name.split())).lower()

def theme_unique_name(conn,name,exclude_id=None):
    # Serialize name checks and writes together, including concurrent requests.
    # Existing records stay untouched; no destructive migration of legacy duplicates.
    conn.execute("LOCK TABLE eduvize_admin_themes IN SHARE ROW EXCLUSIVE MODE")
    key=theme_name_key(name)
    if exclude_id!="standard" and key==theme_name_key("EDUVIZE Standard"):
        raise HTTPException(409,"Styl s tímto názvem již existuje. Pro nový styl zadejte jiný název.")
    rows=conn.execute("SELECT id,name FROM eduvize_admin_themes").fetchall()
    if any(ident!=exclude_id and theme_name_key(existing)==key for ident,existing in rows):
        raise HTTPException(409,"Styl s tímto názvem již existuje. Zadejte jiný název.")

@app.post("/api/design-system/themes")
async def create_admin_theme(request:Request,authorization:str|None=Header(default=None)):
    check_admin(authorization)
    payload=await request.json()
    name=" ".join(str(payload.get("name","")).split())
    if not 1<=len(name)<=80:raise HTTPException(422,"Název musí mít 1–80 znaků")
    config=theme_validate(payload.get("config"))
    ident=str(uuid.uuid4())
    with theme_db() as conn:
        theme_unique_name(conn,name)
        conn.execute("INSERT INTO eduvize_admin_themes (id,name,config) VALUES (%s,%s,%s::jsonb)",(ident,name,json.dumps(config)))
    return {"id":ident,"name":name}

@app.put("/api/design-system/themes/{theme_id}")
async def update_admin_theme(theme_id:str,request:Request,authorization:str|None=Header(default=None)):
    check_admin(authorization)
    payload=await request.json()
    name=" ".join(str(payload.get("name","")).split())
    if not 1<=len(name)<=80:raise HTTPException(422,"Název musí mít 1–80 znaků")
    config=theme_validate(payload.get("config"))
    with theme_db() as conn:
        theme_unique_name(conn,"EDUVIZE Standard" if theme_id=="standard" else name,theme_id)
        if theme_id=="standard":
            conn.execute("INSERT INTO eduvize_admin_themes (id,name,config,active) VALUES (%s,%s,%s::jsonb,FALSE) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,config=EXCLUDED.config",("standard","EDUVIZE Standard",json.dumps(config)))
            return {"id":"standard","name":"EDUVIZE Standard"}
        row=conn.execute("UPDATE eduvize_admin_themes SET name=%s,config=%s::jsonb WHERE id=%s RETURNING id",(name,json.dumps(config),theme_id)).fetchone()
    if not row:raise HTTPException(404,"Styl nenalezen")
    return {"id":theme_id,"name":name}

@app.post("/api/design-system/themes/{theme_id}/activate")
def activate_admin_theme(theme_id:str,authorization:str|None=Header(default=None)):
    check_admin(authorization)
    with theme_db() as conn:
        if theme_id!="standard" and not conn.execute("SELECT 1 FROM eduvize_admin_themes WHERE id=%s",(theme_id,)).fetchone():raise HTTPException(404,"Styl nenalezen")
        conn.execute("UPDATE eduvize_admin_themes SET active=FALSE WHERE active=TRUE")
        if theme_id!="standard":conn.execute("UPDATE eduvize_admin_themes SET active=TRUE WHERE id=%s",(theme_id,))
    return {"active":theme_id}

@app.delete("/api/design-system/themes/{theme_id}")
def delete_admin_theme(theme_id:str,authorization:str|None=Header(default=None)):
    check_admin(authorization)
    if theme_id=="standard":raise HTTPException(403,"Výchozí styl nelze smazat")
    with theme_db() as conn:
        row=conn.execute("DELETE FROM eduvize_admin_themes WHERE id=%s RETURNING id",(theme_id,)).fetchone()
    if not row:raise HTTPException(404,"Styl nenalezen")
    return {"deleted":theme_id}

