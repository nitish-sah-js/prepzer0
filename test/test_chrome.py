#!/usr/bin/env python3
"""
Test Chrome/ChromeDriver Setup
Quick diagnostic script to verify Chrome can be launched
"""

import os
import sys
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def find_chrome_binary():
    """Find Chrome/Chromium binary location (actual binary, not wrapper)"""
    # Actual Chrome binary locations (not wrapper scripts)
    chrome_binaries = [
        '/opt/google/chrome/chrome',  # Actual Chrome binary
        '/usr/lib/chromium-browser/chromium-browser',
        '/usr/lib/chromium/chromium',
        '/snap/chromium/current/usr/lib/chromium-browser/chrome',
    ]

    # Check actual binary paths first
    for path in chrome_binaries:
        if os.path.exists(path) and os.access(path, os.X_OK):
            return path

    # Try wrapper scripts (less reliable but may work)
    wrapper_paths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ]

    for path in wrapper_paths:
        if os.path.exists(path) and os.access(path, os.X_OK):
            # If it's a wrapper script, try to find the actual binary
            if path.startswith('/usr/bin/google-chrome'):
                actual_binary = '/opt/google/chrome/chrome'
                if os.path.exists(actual_binary):
                    return actual_binary
            return path

    return None

def test_chrome():
    """Test if Chrome can be launched"""
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║            Chrome/ChromeDriver Diagnostic Test              ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")

    # Find Chrome binary
    print("🔍 Searching for Chrome binary...")
    chrome_binary = find_chrome_binary()

    if chrome_binary:
        print(f"✅ Found Chrome: {chrome_binary}")

        # Check if it's executable
        if os.access(chrome_binary, os.X_OK):
            print("✅ Chrome binary is executable")
        else:
            print("⚠️  Chrome binary exists but may not be executable")
    else:
        print("❌ Chrome binary not found!")
        print("\nPlease install Chrome:")
        print("  Ubuntu/Debian: sudo apt install google-chrome-stable")
        print("  Or: sudo apt install chromium-browser")
        return False

    # Try to get Chrome version
    print("\n🔍 Checking Chrome version...")
    try:
        import subprocess
        result = subprocess.run([chrome_binary, '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✅ {version}")
    except Exception as e:
        print(f"⚠️  Could not get version: {e}")

    # Try to launch Chrome with Selenium
    print("\n🔍 Testing Selenium WebDriver...")
    try:
        chrome_options = Options()
        chrome_options.binary_location = chrome_binary
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        print("  • Creating WebDriver instance...")
        driver = webdriver.Chrome(options=chrome_options)

        print("  • Navigating to test page...")
        driver.get("https://www.google.com")

        print("  • Getting page title...")
        title = driver.title
        print(f"  • Page title: {title}")

        print("  • Closing browser...")
        driver.quit()

        print("\n✅ Chrome/Selenium test PASSED!")
        print("\nYour system is ready to run the automated testing scripts.")
        return True

    except Exception as e:
        print(f"\n❌ Chrome/Selenium test FAILED!")
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("  1. Install/Update ChromeDriver:")
        print("     pip install webdriver-manager")
        print("  2. Ensure Chrome matches ChromeDriver version")
        print("  3. Check Chrome is not corrupted:")
        print(f"     {chrome_binary} --version")
        return False

if __name__ == "__main__":
    success = test_chrome()
    sys.exit(0 if success else 1)
