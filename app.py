"""Compatibility entry point. Administrative implementation lives in eduvize-admin."""
import os
from pathlib import Path
os.environ.setdefault('EDUVIZE_STYLES_ROOT',str(Path(__file__).resolve().parent))
from eduvize_admin.styles_api import app
