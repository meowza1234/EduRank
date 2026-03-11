#!/bin/bash
pip install -r requirements.txt
exec gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000}
