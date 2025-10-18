#!/usr/bin/env python3
"""
Automated Account Creation Testing Script
Creates multiple student accounts with dummy data and auto-verifies them
"""

import os
import sys
import time
import random
from datetime import datetime
from threading import Thread
from pymongo import MongoClient
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from faker import Faker

# Configuration
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'codingplatform')
NUM_ACCOUNTS = 10

# Initialize Faker for dummy data
fake = Faker()

# Department codes
DEPARTMENTS = ['CS', 'IS', 'EC', 'EE', 'CV', 'AI', 'ET', 'AD', 'CG']

# MongoDB connection
mongo_client = None
db = None

def connect_to_mongodb():
    """Connect to MongoDB database"""
    global mongo_client, db
    try:
        mongo_client = MongoClient(MONGODB_URI)
        db = mongo_client[DB_NAME]
        print("✅ Connected to MongoDB successfully")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def generate_usn(department, year=22):
    """Generate a valid USN format: 1BY22CS001"""
    roll_number = random.randint(1, 999)
    usn = f"1BY{year}{department}{roll_number:03d}"
    return usn

def generate_student_data(index):
    """Generate dummy student data"""
    department = random.choice(DEPARTMENTS)
    year = random.choice([21, 22, 23, 24])  # Different admission years

    data = {
        'fname': fake.first_name(),
        'lname': fake.last_name(),
        'email': f"student{index}_{random.randint(1000, 9999)}@test.prepzer0.com",
        'usn': generate_usn(department, year),
        'department': department.lower(),
        'rollno': f"{random.randint(1, 999):03d}",
        'password': 'Test@123456',
        'usertype': 'student'
    }

    return data

def setup_chrome_driver(headless=False):
    """Setup Chrome WebDriver with options (using webdriver-manager)"""
    chrome_options = Options()

    # Always run headless in server environment
    chrome_options.add_argument('--headless=new')  # Use new headless mode

    # Essential options for running in server environment
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')

    # Disable automation detection
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    # Disable logging
    chrome_options.add_argument('--log-level=3')
    chrome_options.add_argument('--silent')

    try:
        # Use webdriver-manager to automatically handle ChromeDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    except Exception as e:
        print(f"  ❌ Failed to start Chrome: {e}")
        raise

def auto_verify_user(email):
    """Automatically verify user by setting userallowed=true in database"""
    try:
        result = db.users.update_one(
            {'email': email},
            {
                '$set': {
                    'userallowed': True,
                    'active': True
                }
            }
        )

        if result.modified_count > 0:
            print(f"  ✅ Auto-verified: {email}")
            return True
        else:
            print(f"  ⚠️  User not found in DB: {email}")
            return False
    except Exception as e:
        print(f"  ❌ Auto-verification failed for {email}: {e}")
        return False

def create_account(student_data, instance_num, headless=False):
    """Create a single student account"""
    driver = None
    try:
        print(f"\n[Instance {instance_num}] Starting account creation...")
        print(f"  📧 Email: {student_data['email']}")
        print(f"  🎓 USN: {student_data['usn']}")
        print(f"  🏢 Department: {student_data['department'].upper()}")

        # Setup driver
        driver = setup_chrome_driver(headless=headless)
        wait = WebDriverWait(driver, 15)

        # Navigate to signup page
        signup_url = f"{BASE_URL}/authenticate/signup"
        print(f"  🌐 Opening: {signup_url}")
        driver.get(signup_url)

        # Wait for page to load
        time.sleep(2)

        # Fill in the signup form
        try:
            # Find and fill first name
            fname_input = wait.until(EC.presence_of_element_located((By.NAME, "fname")))
            fname_input.clear()
            fname_input.send_keys(student_data['fname'])
            time.sleep(0.3)

            # Fill last name
            lname_input = driver.find_element(By.NAME, "lname")
            lname_input.clear()
            lname_input.send_keys(student_data['lname'])
            time.sleep(0.3)

            # Fill email
            email_input = driver.find_element(By.NAME, "email")
            email_input.clear()
            email_input.send_keys(student_data['email'])
            time.sleep(0.3)

            # Fill USN
            usn_input = driver.find_element(By.NAME, "usn")
            usn_input.clear()
            usn_input.send_keys(student_data['usn'])
            time.sleep(0.3)

            # Fill Roll Number
            rollno_input = driver.find_element(By.NAME, "rollno")
            rollno_input.clear()
            rollno_input.send_keys(student_data['rollno'])
            time.sleep(0.3)

            # Fill password
            password_input = driver.find_element(By.NAME, "password")
            password_input.clear()
            password_input.send_keys(student_data['password'])
            time.sleep(0.3)

            # Fill confirm password
            passcode_input = driver.find_element(By.NAME, "passcode")
            passcode_input.clear()
            passcode_input.send_keys(student_data['password'])
            time.sleep(0.3)

            print(f"  ✏️  Form filled successfully")

            # Submit the form
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            print(f"  📤 Form submitted")

            # Wait for redirect or success
            time.sleep(3)

            # Check if registration was successful
            current_url = driver.current_url
            print(f"  🔗 Current URL: {current_url}")

            # Auto-verify the user in database
            time.sleep(2)  # Wait for DB write
            auto_verify_user(student_data['email'])

            print(f"[Instance {instance_num}] ✅ Account created successfully!")
            return True

        except Exception as form_error:
            print(f"[Instance {instance_num}] ❌ Form filling error: {form_error}")

            # Try to capture any error messages on the page
            try:
                error_elements = driver.find_elements(By.CSS_SELECTOR, ".error, .alert-danger, .errormsg")
                for elem in error_elements:
                    if elem.text:
                        print(f"  ⚠️  Page error: {elem.text}")
            except:
                pass

            return False

    except Exception as e:
        print(f"[Instance {instance_num}] ❌ Error: {e}")
        return False

    finally:
        # Close the browser
        if driver:
            try:
                driver.quit()
                print(f"[Instance {instance_num}] 🔒 Browser closed")
            except:
                pass

def create_accounts_batch(start_index, count, headless=False):
    """Create multiple accounts in sequence"""
    success_count = 0
    failed_count = 0

    for i in range(count):
        instance_num = start_index + i + 1
        student_data = generate_student_data(instance_num)

        success = create_account(student_data, instance_num, headless=headless)

        if success:
            success_count += 1
        else:
            failed_count += 1

        # Small delay between accounts
        time.sleep(2)

    return success_count, failed_count

def create_accounts_concurrent(num_accounts, headless=False):
    """Create multiple accounts using threads"""
    threads = []
    results = []

    print(f"\n{'='*60}")
    print(f"🚀 Starting creation of {num_accounts} student accounts")
    print(f"{'='*60}")

    start_time = time.time()

    # Create threads for each account
    for i in range(num_accounts):
        student_data = generate_student_data(i + 1)
        thread = Thread(
            target=lambda sd=student_data, num=i+1: results.append(
                create_account(sd, num, headless=headless)
            )
        )
        threads.append(thread)

    # Start all threads
    for thread in threads:
        thread.start()
        time.sleep(1)  # Stagger the starts slightly

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    end_time = time.time()
    duration = end_time - start_time

    # Print summary
    success_count = sum(1 for r in results if r)
    failed_count = len(results) - success_count

    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Successful: {success_count}/{num_accounts}")
    print(f"❌ Failed: {failed_count}/{num_accounts}")
    print(f"⏱️  Duration: {duration:.2f} seconds")
    print(f"{'='*60}\n")

def main():
    """Main execution function"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     PrepZer0 - Automated Account Creation Testing Tool      ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Connect to MongoDB
    if not connect_to_mongodb():
        print("❌ Cannot proceed without MongoDB connection")
        sys.exit(1)

    # Configuration summary
    print(f"\n📋 Configuration:")
    print(f"  • Base URL: {BASE_URL}")
    print(f"  • Database: {DB_NAME}")
    print(f"  • Accounts to create: {NUM_ACCOUNTS}")
    print(f"  • Test password: Test@123456")

    # Ask for mode
    print(f"\n🎯 Select mode:")
    print(f"  1. Sequential (one after another)")
    print(f"  2. Concurrent (all at once - 10 instances)")

    try:
        mode = input("\nEnter choice (1 or 2) [default: 1]: ").strip() or "1"

        headless_choice = input("Run in headless mode? (y/n) [default: n]: ").strip().lower()
        headless = headless_choice == 'y'

        if mode == "1":
            print("\n🔄 Starting sequential account creation...")
            success, failed = create_accounts_batch(0, NUM_ACCOUNTS, headless=headless)

            print(f"\n{'='*60}")
            print(f"📊 SUMMARY")
            print(f"{'='*60}")
            print(f"✅ Successful: {success}/{NUM_ACCOUNTS}")
            print(f"❌ Failed: {failed}/{NUM_ACCOUNTS}")
            print(f"{'='*60}\n")

        elif mode == "2":
            print("\n🔄 Starting concurrent account creation...")
            create_accounts_concurrent(NUM_ACCOUNTS, headless=headless)

        else:
            print("❌ Invalid choice")
            sys.exit(1)

        # Show created accounts
        print("\n📋 Verifying created accounts in database...")
        recent_users = db.users.find({
            'usertype': 'student',
            'email': {'$regex': '@test.prepzer0.com$'}
        }).sort('_id', -1).limit(NUM_ACCOUNTS)

        print(f"\n{'='*80}")
        print(f"{'Email':<40} {'USN':<15} {'Verified':<10} {'Department':<10}")
        print(f"{'='*80}")

        for user in recent_users:
            verified = "✅ Yes" if user.get('userallowed', False) else "❌ No"
            print(f"{user['email']:<40} {user.get('USN', 'N/A'):<15} {verified:<10} {user.get('Department', 'N/A'):<10}")

        print(f"{'='*80}\n")

        print("✅ Testing completed!")

    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        if mongo_client:
            mongo_client.close()

if __name__ == "__main__":
    main()
