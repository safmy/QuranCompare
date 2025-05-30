#!/bin/bash
# Start script for Render deployment

# Ensure PORT is set with a default
PORT=${PORT:-8000}

echo "Starting API server on port $PORT..."

# Start the server
exec uvicorn vector_search_api:app --host 0.0.0.0 --port $PORT