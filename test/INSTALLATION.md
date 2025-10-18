# Installation Guide for Testing Scripts

## Prerequisites

Before running the automated testing scripts, ensure you have:

- ✅ **Python 3.8+** installed (detected: Python 3.12.3)
- ✅ **pip3** package manager
- ✅ **Google Chrome** or **Chromium** browser
- ✅ **MongoDB** running and accessible
- ✅ **PrepZer0 application** running

---

## Quick Installation

### Option 1: Automated Setup (Recommended)

```bash
cd /home/tell-me/prepzer0/test
./setup.sh
```

This will:
1. Create a Python virtual environment
2. Install all required dependencies
3. Create a `.env` configuration file
4. Verify Chrome installation

### Option 2: Manual Installation

```bash
cd /home/tell-me/prepzer0/test

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/Mac
# OR
venv\Scripts\activate  # On Windows

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

---

## Dependency Details

The following packages will be installed:

### Core Dependencies

1. **selenium** (>=4.15.0)
   - Browser automation framework
   - Controls Chrome instances
   - Fills forms automatically

2. **pymongo** (>=4.6.0)
   - MongoDB driver for Python
   - Reads/writes user data
   - Auto-verifies accounts

3. **faker** (>=20.0.0)
   - Generates realistic dummy data
   - Creates fake names, emails
   - Produces valid USNs

4. **webdriver-manager** (>=4.0.1)
   - Auto-downloads ChromeDriver
   - Manages driver versions
   - No manual setup needed

---

## ChromeDriver Setup

### Option A: Automatic (Recommended)

The `webdriver-manager` package will automatically download the correct ChromeDriver version.

No manual setup required!

### Option B: Manual Installation

If automatic download fails:

1. Check your Chrome version:
   ```bash
   google-chrome --version
   # OR
   chromium-browser --version
   ```

2. Download matching ChromeDriver:
   - Visit: https://chromedriver.chromium.org/downloads
   - Download version matching your Chrome
   - Extract to `/usr/local/bin/` or add to PATH

3. Verify installation:
   ```bash
   chromedriver --version
   ```

---

## Environment Configuration

### Create `.env` File

Create `/home/tell-me/prepzer0/test/.env`:

```bash
# Application Configuration
BASE_URL=http://localhost:80

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=codingplatform

# Test Configuration
NUM_ACCOUNTS=10
```

### Load Environment Variables

The scripts will automatically load the `.env` file, or you can export manually:

```bash
export BASE_URL="http://localhost:80"
export MONGODB_URI="mongodb://localhost:27017"
export DB_NAME="codingplatform"
```

---

## Verification

### Test Python Installation

```bash
python3 --version
# Expected: Python 3.8 or higher
```

### Test pip Installation

```bash
pip3 --version
# Expected: pip 20.0 or higher
```

### Test Chrome Installation

```bash
google-chrome --version
# OR
chromium-browser --version
# Expected: Chrome/Chromium 90 or higher
```

### Test MongoDB Connection

```bash
mongosh
# OR (older version)
mongo

# In MongoDB shell:
show dbs
use codingplatform
show collections
```

### Test PrepZer0 Application

Open browser and navigate to:
```
http://localhost:80
```

You should see the PrepZer0 homepage.

---

## Troubleshooting

### Issue: Python module not found

**Error:**
```
ModuleNotFoundError: No module named 'selenium'
```

**Solution:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: ChromeDriver version mismatch

**Error:**
```
session not created: This version of ChromeDriver only supports Chrome version XX
```

**Solution:**
```bash
# Option 1: Update Chrome browser
sudo apt update
sudo apt upgrade google-chrome-stable

# Option 2: Use webdriver-manager (automatic)
pip install webdriver-manager

# Option 3: Download matching ChromeDriver manually
# Visit: https://chromedriver.chromium.org/downloads
```

### Issue: MongoDB connection refused

**Error:**
```
pymongo.errors.ServerSelectionTimeoutError
```

**Solution:**
```bash
# Check if MongoDB is running
systemctl status mongod

# Start MongoDB if stopped
sudo systemctl start mongod

# Enable MongoDB on boot
sudo systemctl enable mongod

# Verify connection
mongosh --eval "db.adminCommand('ping')"
```

### Issue: Permission denied for scripts

**Error:**
```
bash: ./setup.sh: Permission denied
```

**Solution:**
```bash
chmod +x setup.sh
chmod +x create_test_accounts.py
chmod +x cleanup_test_accounts.py
```

### Issue: Port 80 already in use

**Error:**
```
Application cannot start - port 80 is already in use
```

**Solution:**
```bash
# Find process using port 80
sudo lsof -i :80

# Kill the process (replace PID)
sudo kill -9 <PID>

# OR change PrepZer0 port in .env
PORT=3000
```

---

## Dependencies Size

Approximate download sizes:
- selenium: ~10 MB
- pymongo: ~1 MB
- faker: ~15 MB
- webdriver-manager: ~2 MB

**Total:** ~30 MB

ChromeDriver: ~5-10 MB (auto-downloaded)

---

## System Requirements

### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 500 MB free space
- **OS:** Linux, macOS, or Windows

### Recommended for Concurrent Testing (10 instances)
- **CPU:** 4+ cores
- **RAM:** 8 GB
- **Disk:** 1 GB free space

---

## Next Steps

After successful installation:

1. **Activate virtual environment:**
   ```bash
   source venv/bin/activate
   ```

2. **Run test account creation:**
   ```bash
   python3 create_test_accounts.py
   ```

3. **Read full documentation:**
   ```bash
   cat README.md
   ```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs from the test scripts
3. Verify all prerequisites are met
4. Check PrepZer0 application logs

---

**Last Updated:** 2025-10-17
