#!/bin/bash

# Setup script for automated testing

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         PrepZer0 - Testing Environment Setup                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if Chrome is installed
echo ""
echo "🔍 Checking for Google Chrome..."
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found: $(google-chrome --version)"
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium found: $(chromium-browser --version)"
else
    echo "⚠️  Chrome/Chromium not found. Please install Google Chrome."
    echo "   Download from: https://www.google.com/chrome/"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
# PrepZer0 Testing Environment Configuration

# Application URL
BASE_URL=http://localhost:80

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=codingplatform

# Number of test accounts to create
NUM_ACCOUNTS=10
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✅                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "2. Start the PrepZer0 application (in another terminal):"
echo "   npm start"
echo ""
echo "3. Run the test account creation script:"
echo "   python3 create_test_accounts.py"
echo ""
echo "4. Clean up test accounts when done:"
echo "   python3 cleanup_test_accounts.py"
echo ""
echo "5. Deactivate virtual environment when finished:"
echo "   deactivate"
echo ""
