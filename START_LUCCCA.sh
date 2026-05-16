#!/bin/bash

# LUCCCA Framework Startup Script
# This script starts both frontend and backend servers

echo "🚀 Starting LUCCCA Framework..."
echo ""
echo "Frontend will run on: http://localhost:8080"
echo "Backend will run on: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Check if pnpm is available, otherwise use npm
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
else
    PKG_MANAGER="npm"
fi

echo "Using package manager: $PKG_MANAGER"
echo ""

# Start both servers using dev:all script
$PKG_MANAGER run dev:all
