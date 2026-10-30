#!/bin/bash

# Find all non-init.py files inside "migrations" folders and delete them
find . -path "*/migrations/*" -type f ! -name "__init__.py" -delete

# Find and delete all "__pycache__" directories
find . -type d -name "__pycache__" -exec rm -rf {} +

echo "Deleted all files inside 'migrations' folders except '__init__.py' and removed all '__pycache__' directories."