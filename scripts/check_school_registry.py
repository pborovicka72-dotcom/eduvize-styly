"""Validate source-owned school registry without depending on generated account assets."""
from datetime import date
import gzip
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads(gzip.decompress((root/'experimental/school-calendar/schools.json.gz').read_bytes()))
date.fromisoformat(data['date'])
fields = data['fields']
assert isinstance(fields, list) and len(fields) == len(set(fields))
assert {'name', 'red_izo', 'izo', 'ico', 'district', 'school_type'} <= set(fields)
assert isinstance(data['source'], str) and data['source'].strip()
rows = data['items']
assert isinstance(rows, list) and rows, 'School registry must not be empty'
assert all(isinstance(row, list) and len(row) == len(fields) for row in rows)
kind, red = fields.index('school_type'), fields.index('red_izo')
assert any(row[kind] == 'ZS' and len(str(row[red])) == 9 for row in rows)
print('Source school registry schema, date and identifiers OK:', len(rows), 'rows')
