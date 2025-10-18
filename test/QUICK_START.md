# Quick Start Guide - Automated Testing

## 🚀 Run Tests in 3 Steps

### Step 1: Setup (First Time Only)
```bash
cd /home/tell-me/prepzer0/test
./setup.sh
```

### Step 2: Start PrepZer0 Application
```bash
# In a separate terminal
cd /home/tell-me/prepzer0
npm start
```

### Step 3: Create Test Accounts
```bash
./quick_test.sh
```

That's it! ✅

---

## 📋 What You Get

- **10 test accounts** with realistic data
- **Auto-verified** (userallowed=true, no email needed)
- **Random departments** (CS, IS, EC, EE, etc.)
- **Valid USNs** (e.g., 1BY22CS045)
- **Common password**: `Test@123456`
- **Test emails**: `student{N}_{random}@test.prepzer0.com`

---

## 🧹 Clean Up

Remove all test accounts:
```bash
source test/bin/activate
python3 cleanup_test_accounts.py
```

---

## 🔍 Verify

Check created accounts:
```bash
mongosh codingplatform --eval "db.users.find({email: /@test.prepzer0.com$/})"
```

---

## ⚙️ Configuration

Edit `.env` file in test directory:
```bash
BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=codingplatform
NUM_ACCOUNTS=10
```

---

## 📚 Documentation

- **Full docs**: `README.md`
- **Installation guide**: `INSTALLATION.md`
- **Recent fixes**: `FIXES_APPLIED.md`

---

## ❓ Troubleshooting

### Chrome Issues
```bash
python3 test_chrome_simple.py
```

### Dependencies Missing
```bash
source test/bin/activate
pip install -r requirements.txt
```

### MongoDB Not Running
```bash
sudo systemctl start mongod
```

### Application Not Running
```bash
# Check if running on port 3000
curl http://localhost:3000
```

---

## 🎯 Manual Control

For more control, run directly:
```bash
source test/bin/activate
python3 create_test_accounts.py
```

Then select:
1. Sequential mode (one by one)
2. Concurrent mode (all at once)

---

**Ready to test!** Run `./quick_test.sh` to get started.
