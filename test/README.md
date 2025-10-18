# Automated Testing Scripts for PrepZer0

This directory contains automated testing scripts for creating and managing test accounts in the PrepZer0 platform.

## 📁 Files

- **`create_test_accounts.py`** - Main script to create multiple test accounts automatically
- **`cleanup_test_accounts.py`** - Script to remove all test accounts and related data
- **`requirements.txt`** - Python dependencies for the testing scripts

---

## 🚀 Quick Start

### 1. Install Dependencies

First, install the required Python packages:

```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install ChromeDriver

**Option A: Manual Installation**
- Download ChromeDriver from: https://chromedriver.chromium.org/
- Place it in your system PATH

**Option B: Automatic (using webdriver-manager)**
```bash
pip install webdriver-manager
```

The script will automatically download the correct ChromeDriver version.

### 3. Set Environment Variables

Create a `.env` file or export these variables:

```bash
export BASE_URL="http://localhost:80"
export MONGODB_URI="mongodb://localhost:27017"
export DB_NAME="codingplatform"
```

Or use the default values (localhost).

---

## 📝 Usage

### Create Test Accounts

Run the account creation script:

```bash
python3 create_test_accounts.py
```

**Options:**

1. **Sequential Mode** - Creates accounts one after another (slower, more stable)
2. **Concurrent Mode** - Creates 10 accounts simultaneously (faster)

**Features:**
- ✅ Generates realistic dummy data (names, emails, USNs)
- ✅ Automatically fills signup forms
- ✅ Bypasses email verification (sets `userallowed=true`)
- ✅ Creates accounts with valid USN format
- ✅ Supports headless mode (no visible browser)

**Example Output:**
```
╔══════════════════════════════════════════════════════════════╗
║     PrepZer0 - Automated Account Creation Testing Tool      ║
╚══════════════════════════════════════════════════════════════╝

📋 Configuration:
  • Base URL: http://localhost:80
  • Database: codingplatform
  • Accounts to create: 10
  • Test password: Test@123456

🎯 Select mode:
  1. Sequential (one after another)
  2. Concurrent (all at once - 10 instances)

Enter choice (1 or 2) [default: 1]: 2
Run in headless mode? (y/n) [default: n]: y

🔄 Starting concurrent account creation...

[Instance 1] Starting account creation...
  📧 Email: student1_4523@test.prepzer0.com
  🎓 USN: 1BY22CS045
  🏢 Department: CS
  ...
```

### Clean Up Test Accounts

Remove all test accounts and related data:

```bash
python3 cleanup_test_accounts.py
```

This will:
- Find all accounts with `@test.prepzer0.com` email
- Show a list of accounts to be deleted
- Ask for confirmation
- Delete users and cascade delete:
  - Submissions
  - Active sessions
  - Integrity records
  - Evaluation results
  - Exam candidates

---

## 🎓 Test Account Details

### Generated Data Format

**Email:** `student{N}_{random}@test.prepzer0.com`
- Example: `student1_4523@test.prepzer0.com`

**USN:** `1BY{YY}{DEPT}{RollNo}`
- Format: Location + Year + Department + Roll Number
- Example: `1BY22CS045` (Bangalore, 2022, Computer Science, Roll 045)

**Departments:** CS, IS, EC, EE, CV, AI, ET, AD, CG

**Password:** `Test@123456` (for all test accounts)

**User Type:** `student`

**Verification Status:** Automatically set to `userallowed=true` and `active=true`

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:80` | Base URL of the application |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `codingplatform` | Database name |

### Script Configuration

Edit `create_test_accounts.py` to change:

```python
NUM_ACCOUNTS = 10  # Number of accounts to create
```

---

## 🔍 Troubleshooting

### ChromeDriver Issues

**Error:** `chromedriver not found`

**Solution:**
```bash
pip install webdriver-manager
```

Update the script to use WebDriver Manager:
```python
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)
```

### MongoDB Connection Issues

**Error:** `pymongo.errors.ServerSelectionTimeoutError`

**Solution:**
- Check if MongoDB is running: `systemctl status mongod`
- Verify connection string in environment variables
- Check firewall settings

### Browser Not Opening

**Error:** Browser instances not appearing

**Solution:**
- Try running without headless mode (answer 'n' when prompted)
- Check Chrome installation: `google-chrome --version`
- Verify ChromeDriver version matches Chrome version

### Form Field Issues

**Error:** `Element not found` or `Timeout waiting for element`

**Solution:**
- Increase wait times in the script
- Check if the signup form fields have changed
- Run in non-headless mode to debug visually

---

## 🧪 Testing Workflow

### Complete Testing Cycle

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Create test accounts:**
   ```bash
   python3 create_test_accounts.py
   ```

3. **Test functionality** (manual or additional automation scripts)

4. **Clean up test data:**
   ```bash
   python3 cleanup_test_accounts.py
   ```

### Verify Test Accounts in Database

Using MongoDB shell:
```javascript
use codingplatform

// Find all test accounts
db.users.find({ email: /@test.prepzer0.com$/ })

// Count test accounts
db.users.count({ email: /@test.prepzer0.com$/ })

// Check verification status
db.users.find(
  { email: /@test.prepzer0.com$/ },
  { email: 1, USN: 1, userallowed: 1, active: 1 }
)
```

---

## 📊 Performance

### Sequential Mode
- **Speed:** ~10-15 seconds per account
- **Resource Usage:** Low (single browser instance)
- **Reliability:** High (less prone to timing issues)
- **Best for:** Stable testing, debugging

### Concurrent Mode
- **Speed:** ~30-60 seconds for 10 accounts
- **Resource Usage:** High (10 simultaneous browser instances)
- **Reliability:** Medium (may have timing issues)
- **Best for:** Quick bulk account creation

---

## 🔒 Security Notes

### Test Account Isolation

- All test accounts use `@test.prepzer0.com` domain
- Easy to identify and remove
- Should NOT be used in production

### Credential Management

- Test password: `Test@123456`
- Change this for production-like testing
- Never commit actual user credentials

### Database Safety

- Cleanup script uses regex to target only test accounts
- Always verify the account list before confirming deletion
- Backup your database before running cleanup in production-like environments

---

## 🛠️ Customization

### Change Number of Accounts

Edit `create_test_accounts.py`:
```python
NUM_ACCOUNTS = 20  # Create 20 accounts instead of 10
```

### Modify Generated Data

Edit the `generate_student_data()` function:
```python
def generate_student_data(index):
    # Customize email domain
    'email': f"custom{index}@yourdomain.com",

    # Customize USN format
    'usn': f"CUSTOM{year}{department}{roll_number:03d}",

    # Customize password
    'password': 'YourCustomPassword123!',
}
```

### Add Custom Form Fields

In the `create_account()` function, add fields:
```python
# Example: Add phone number field
phone_input = driver.find_element(By.NAME, "phone")
phone_input.send_keys(fake.phone_number())
```

---

## 📚 Additional Scripts (Future)

Ideas for additional testing automation:

1. **Login testing script** - Test login with created accounts
2. **Exam taking script** - Automate exam participation
3. **Load testing script** - Stress test with many concurrent users
4. **Admin operations script** - Test admin panel functionality

---

## 🐛 Reporting Issues

If you encounter issues with the testing scripts:

1. Check the troubleshooting section above
2. Enable verbose logging (run without headless mode)
3. Verify environment variables are set correctly
4. Check that the application is running and accessible

---

## 📄 License

These testing scripts are part of the PrepZer0 project and follow the same license.

---

## 👥 Contributing

To contribute improvements to the testing scripts:

1. Test your changes thoroughly
2. Update this README if needed
3. Document any new features or options
4. Ensure backward compatibility

---

**Last Updated:** 2025-10-17
**Version:** 1.0.0
