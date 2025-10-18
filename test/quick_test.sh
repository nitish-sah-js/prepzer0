#!/bin/bash

# Quick Test Script - Creates 10 test accounts and displays them

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         PrepZer0 - Quick Test Script                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Please run: ./setup.sh first"
    exit 1
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python3 -c "import selenium" 2>/dev/null; then
    echo "❌ Dependencies not installed!"
    echo "   Please run: ./setup.sh first"
    exit 1
fi

# Check if application is running
echo "🔍 Checking if application is running..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    echo "✅ Application is running"
else
    echo "⚠️  Application may not be running on port 3000"
    echo "   Please start the application: npm start"
    read -p "Continue anyway? (y/n): " continue
    if [ "$continue" != "y" ]; then
        exit 1
    fi
fi

# Run the test account creation script
echo ""
echo "🚀 Creating 10 test accounts..."
echo ""

# Run in sequential mode by default
python3 create_test_accounts.py << EOF
1
n
EOF

echo ""
echo "✅ Test completed!"
echo ""
echo "📋 To view created accounts, login to MongoDB:"
echo "   mongosh codingplatform --eval \"db.users.find({email: /@test.prepzer0.com$/})\""
echo ""
echo "🗑️  To clean up test accounts:"
echo "   python3 cleanup_test_accounts.py"
echo ""

deactivate
