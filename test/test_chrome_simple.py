#!/usr/bin/env python3
"""
Simple Chrome test using webdriver-manager
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

print("🔍 Testing Chrome with webdriver-manager...")

try:
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')

    # Use webdriver-manager to automatically download and manage ChromeDriver
    print("  • Installing/updating ChromeDriver...")
    service = Service(ChromeDriverManager().install())

    print("  • Creating WebDriver...")
    driver = webdriver.Chrome(service=service, options=chrome_options)

    print("  • Navigating to test page...")
    driver.get("https://www.google.com")

    print(f"  • Page title: {driver.title}")

    driver.quit()

    print("\n✅ SUCCESS! Chrome is working correctly.")
    print("   You can now run the account creation scripts.")

except Exception as e:
    print(f"\n❌ FAILED: {e}")
    print("\nTroubleshooting:")
    print("1. Try running as root: sudo python3 test_chrome_simple.py")
    print("2. Check Chrome installation: google-chrome --version")
    print("3. Update Chrome: sudo apt update && sudo apt upgrade google-chrome-stable")
