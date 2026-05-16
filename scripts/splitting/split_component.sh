#!/bin/bash
# Template for splitting a large component
# Usage: ./split_component.sh <file_path>

FILE=$1
if [ -z "$FILE" ]; then
  echo "Usage: $0 <component_file>"
  exit 1
fi

BASENAME=$(basename "$FILE" .tsx)
DIRNAME=$(dirname "$FILE")

echo "Splitting: $FILE"
echo "Into: $DIRNAME/${BASENAME}/"
echo ""
echo "Steps:"
echo "1. Create directory: $DIRNAME/${BASENAME}/"
echo "2. Move original to: $DIRNAME/${BASENAME}/index.tsx"
echo "3. Extract sections into separate files"
echo "4. Import and compose in index.tsx"
echo ""
echo "Run this manually to ensure quality!"
