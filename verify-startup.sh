#!/bin/bash

# LUCCCA Framework Startup Verification Script

echo "🔍 Verifying LUCCCA Framework Startup..."
echo ""

# Check Frontend
echo "Checking Frontend (port 8080)..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Frontend is running at http://localhost:8080"
else
    echo "❌ Frontend is NOT running"
    exit 1
fi

# Check Backend
echo "Checking Backend (port 3001)..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Backend is healthy at http://localhost:3001"
elif [ -n "$HEALTH_RESPONSE" ]; then
    echo "✅ Backend is responding at http://localhost:3001"
    echo "   Response: $(echo "$HEALTH_RESPONSE" | head -c 100)"
else
    echo "❌ Backend is NOT responding"
    exit 1
fi

# Check Environment
echo "Checking Environment Configuration..."
if [ -f .env ] && grep -q "JWT_SECRET" .env; then
    echo "✅ .env file configured"
else
    echo "⚠️  .env file missing or incomplete"
fi

echo ""
echo "🎉 LUCCCA Framework is ready!"
echo ""
echo "📱 Open your browser and navigate to:"
echo "   http://localhost:8080"
echo ""
echo "💡 If you see a blank page or errors:"
echo "   1. Open browser DevTools (F12)"
echo "   2. Check the Console tab for errors"
echo "   3. Check the Network tab for failed requests"
echo ""
