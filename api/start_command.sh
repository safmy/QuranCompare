#!/bin/bash
# Start command for Render.com
PORT=${PORT:-8000}
exec uvicorn vector_search_api:app --host 0.0.0.0 --port $PORT