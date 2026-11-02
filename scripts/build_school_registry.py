"""Build a public, minimal school search index; exclude people and contact data."""
import gzip,json,sys
from pathlib import Path
SOURCE='https://lkod-ftp.msmt.gov.cz/00022985/250d6b3f-71a2-4441-b8a0-4df141071f13/rssz-cela-cr-2026-09-30.jsonld'
GROUPS={
'CZ020':'Benešov|Beroun|Kladno|Kolín|Kutná Hora|Mělník|Mladá Boleslav|Nymburk|Praha-východ|Praha-západ|Příbram|Rakovník',
'CZ031':'České Budějovice|Český Krumlov|Jindřichův Hradec|Písek|Prachatice|Strakonice|Tábor',
'CZ032':'Domažlice|Klatovy|Plzeň-město|Plzeň-jih|Plzeň-sever|Rokycany|Tachov',
'CZ041':'Cheb|Karlovy Vary|Sokolov',
'CZ042':'Děčín|Chomutov|Litoměřice|Louny|Most|Teplice|Ústí nad Labem',
'CZ051':'Česká Lípa|Jablonec nad Nisou|Liberec|Semily',
'CZ052':'Hradec Králové|Jičín|Náchod|Rychnov nad Kněžnou|Trutnov',
'CZ053':'Chrudim|Pardubice|Svitavy|Ústí nad Orlicí',
'CZ063':'Havlíčkův Brod|Jihlava|Pelhřimov|Třebíč|Žďár nad Sázavou',
'CZ064':'Blansko|Brno-město|Brno-venkov|Břeclav|Hodonín|Vyškov|Znojmo',
'CZ071':'Jeseník|Olomouc|Prostějov|Přerov|Šumperk',
'CZ072':'Kroměříž|Uherské Hradiště|Vsetín|Zlín',
'CZ080':'Bruntál|Frýdek-Místek|Karviná|Nový Jičín|Opava|Ostrava-město'}
DISTRICTS={prefix+format(i,'X'):name for prefix,names in GROUPS.items() for i,name in enumerate(names.split('|'),1)}
DISTRICTS.update({f'CZ010{i:X}':f'Praha {i}' for i in range(1,11)})
TYPES={'A00':'MS','B00':'ZS','C00':'SS','D00':'KON','E00':'VOS','F10':'ZUS'}
def address(a):
 number=str(a.get('cisloDomovni') or '')
 if a.get('cisloOrientacni'):number+='/'+str(a['cisloOrientacni'])+(a.get('dodatekOrientacnihoCisla') or '')
 return ', '.join(filter(None,[' '.join(filter(None,[a.get('ulice') or a.get('castObce'),number])),' '.join(filter(None,[a.get('psc'),a.get('obec')]))]))
def build(source):
 rows=[]
 for p in source['list']:
  a=p.get('adresa') or {};code=a.get('okres');district=DISTRICTS.get(code,'')
  if code and not district:raise ValueError('Unknown district '+code)
  for s in p.get('skolyAZarizeni',[]):
   rows.append([p['uplnyNazev'],p['redIzo'],s['izo'],p.get('ico',''),address(a),a.get('obec',''),district,p.get('kraj',''),TYPES.get(s.get('druh'),'OTHER'),s.get('uplnyNazev','')])
 return {'date':source['datumVystupu'],'source':SOURCE,'fields':['name','red_izo','izo','ico','address','municipality','district','region','school_type','unit_name'],'items':rows}
if __name__=='__main__':
 result=build(json.loads(Path(sys.argv[1]).read_text()))
 out=Path(__file__).resolve().parents[1]/'experimental/school-calendar/schools.json.gz'
 out.write_bytes(gzip.compress(json.dumps(result,ensure_ascii=False,separators=(',',':')).encode(),mtime=0));print(len(result['items']),'records;',out.stat().st_size,'compressed bytes')
