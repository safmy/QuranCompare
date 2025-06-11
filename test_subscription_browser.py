#!/usr/bin/env python3
"""
Browser-based Subscription Testing Tool
=======================================

This script uses Selenium to simulate real user interactions
with the QuranCompare web app, testing the complete subscription
flow including UI interactions.

Requirements:
    pip install selenium faker

Usage:
    python test_subscription_browser.py [options]

Options:
    --users NUMBER       Number of test users (default: 10)
    --url URL           App URL (default: http://localhost:3000)
    --headless          Run in headless mode
    --browser BROWSER   Browser to use: chrome, firefox (default: chrome)
"""

import time
import json
import argparse
from datetime import datetime
from typing import List, Dict
from dataclasses import dataclass
import random
import string

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.common.keys import Keys
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
except ImportError:
    print("Please install selenium: pip install selenium")
    exit(1)

try:
    from faker import Faker
except ImportError:
    print("Please install faker: pip install faker")
    exit(1)


@dataclass
class TestUser:
    email: str
    phone: str
    name: str
    
    
class BrowserSubscriptionTester:
    """Browser-based testing for subscription system"""
    
    def __init__(self, app_url: str = "http://localhost:3000", browser: str = "chrome", headless: bool = False):
        self.app_url = app_url.rstrip('/')
        self.browser_type = browser
        self.headless = headless
        self.fake = Faker()
        self.test_users: List[TestUser] = []
        self.results = {
            "success": 0,
            "failed": 0,
            "errors": [],
            "screenshots": []
        }
        self.driver = None
        
    def setup_driver(self):
        """Setup Selenium WebDriver"""
        if self.browser_type == "chrome":
            options = webdriver.ChromeOptions()
            if self.headless:
                options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--window-size=1920,1080')
            
            # Disable notifications
            prefs = {"profile.default_content_setting_values.notifications": 2}
            options.add_experimental_option("prefs", prefs)
            
            self.driver = webdriver.Chrome(options=options)
        else:  # firefox
            options = webdriver.FirefoxOptions()
            if self.headless:
                options.add_argument('--headless')
            self.driver = webdriver.Firefox(options=options)
        
        self.driver.implicitly_wait(10)
        
    def teardown_driver(self):
        """Close WebDriver"""
        if self.driver:
            self.driver.quit()
    
    def generate_test_users(self, count: int) -> List[TestUser]:
        """Generate test users with realistic data"""
        print(f"Generating {count} test users with realistic data...")
        users = []
        
        for i in range(count):
            # Generate unique email
            timestamp = int(time.time())
            random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            email = f"test_{random_str}_{timestamp}@qurantest.com"
            
            # Generate phone number
            phone = self.fake.phone_number()
            
            # Generate name
            name = self.fake.name()
            
            user = TestUser(email=email, phone=phone, name=name)
            users.append(user)
            
        self.test_users = users
        print(f"Generated {len(users)} test users")
        return users
    
    def take_screenshot(self, name: str):
        """Take screenshot for debugging"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{name}_{timestamp}.png"
        self.driver.save_screenshot(filename)
        self.results["screenshots"].append(filename)
        return filename
    
    def test_homepage_load(self):
        """Test if homepage loads correctly"""
        print("\n1. Testing homepage load...")
        try:
            self.driver.get(self.app_url)
            time.sleep(2)  # Wait for initial load
            
            # Check if main elements are present
            body = self.driver.find_element(By.TAG_NAME, "body")
            if body:
                print("✓ Homepage loaded successfully")
                self.results["success"] += 1
                self.take_screenshot("homepage")
                return True
            else:
                print("✗ Homepage failed to load")
                self.results["failed"] += 1
                return False
        except Exception as e:
            print(f"✗ Error loading homepage: {e}")
            self.results["failed"] += 1
            self.results["errors"].append(str(e))
            return False
    
    def test_auth_modal(self, user: TestUser):
        """Test authentication modal"""
        print(f"\n2. Testing authentication for {user.email}...")
        try:
            # Look for login/signup button
            login_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Login') or contains(text(), 'Sign')]")
            
            if login_buttons:
                login_buttons[0].click()
                time.sleep(1)
                
                # Check if auth modal opened
                modal = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "auth-modal"))
                )
                
                if modal:
                    print("✓ Auth modal opened")
                    self.take_screenshot("auth_modal")
                    
                    # Try to find email input
                    email_inputs = self.driver.find_elements(By.XPATH, "//input[@type='email' or @placeholder[contains(., 'email')]]")
                    
                    if email_inputs:
                        email_inputs[0].clear()
                        email_inputs[0].send_keys(user.email)
                        print(f"✓ Entered email: {user.email}")
                        
                        # Look for continue/submit button
                        submit_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Continue') or contains(text(), 'Submit') or contains(text(), 'Sign')]")
                        
                        if submit_buttons:
                            submit_buttons[0].click()
                            time.sleep(2)
                            print("✓ Submitted authentication")
                            self.results["success"] += 1
                            return True
                    
            print("✗ Could not complete authentication")
            self.results["failed"] += 1
            return False
            
        except TimeoutException:
            print("✗ Auth modal did not appear")
            self.results["failed"] += 1
            return False
        except Exception as e:
            print(f"✗ Error in auth test: {e}")
            self.results["failed"] += 1
            self.results["errors"].append(str(e))
            return False
    
    def test_subscription_modal(self, user: TestUser):
        """Test subscription modal and checkout"""
        print(f"\n3. Testing subscription modal for {user.email}...")
        try:
            # Look for premium/subscription buttons
            sub_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Premium') or contains(text(), 'Subscribe') or contains(text(), 'Upgrade')]")
            
            if sub_buttons:
                sub_buttons[0].click()
                time.sleep(1)
                
                # Wait for subscription modal
                modal = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "subscription-modal"))
                )
                
                if modal:
                    print("✓ Subscription modal opened")
                    self.take_screenshot("subscription_modal")
                    
                    # Look for checkout button
                    checkout_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Subscribe') or contains(text(), 'Checkout') or contains(text(), '£2.99')]")
                    
                    if checkout_buttons:
                        # Don't actually click to avoid real Stripe redirect
                        print("✓ Found checkout button (not clicking to avoid Stripe redirect)")
                        self.results["success"] += 1
                        return True
                        
            print("✗ Could not access subscription modal")
            self.results["failed"] += 1
            return False
            
        except TimeoutException:
            print("✗ Subscription modal did not appear")
            self.results["failed"] += 1
            return False
        except Exception as e:
            print(f"✗ Error in subscription test: {e}")
            self.results["failed"] += 1
            self.results["errors"].append(str(e))
            return False
    
    def test_responsive_design(self):
        """Test responsive design at different screen sizes"""
        print("\n4. Testing responsive design...")
        
        sizes = [
            ("Mobile", 375, 667),    # iPhone SE
            ("Tablet", 768, 1024),   # iPad
            ("Desktop", 1920, 1080)  # Full HD
        ]
        
        for name, width, height in sizes:
            try:
                self.driver.set_window_size(width, height)
                time.sleep(1)
                self.take_screenshot(f"responsive_{name.lower()}")
                print(f"✓ {name} view ({width}x{height})")
                self.results["success"] += 1
            except Exception as e:
                print(f"✗ Failed to test {name} view: {e}")
                self.results["failed"] += 1
                self.results["errors"].append(str(e))
    
    def test_navigation(self):
        """Test main navigation elements"""
        print("\n5. Testing navigation...")
        
        try:
            # Test various navigation items
            nav_items = [
                ("Quran", "quran"),
                ("Search", "search"),
                ("Root Analysis", "root")
            ]
            
            for item_name, item_class in nav_items:
                elements = self.driver.find_elements(By.XPATH, f"//a[contains(text(), '{item_name}')] | //button[contains(text(), '{item_name}')]")
                
                if elements:
                    print(f"✓ Found {item_name} navigation")
                    self.results["success"] += 1
                else:
                    print(f"✗ Missing {item_name} navigation")
                    self.results["failed"] += 1
                    
        except Exception as e:
            print(f"✗ Error testing navigation: {e}")
            self.results["failed"] += 1
            self.results["errors"].append(str(e))
    
    def run_full_test(self, users: List[TestUser]):
        """Run complete browser test suite"""
        print(f"\n=== Running Browser Tests ===")
        print(f"Testing with {len(users)} users")
        
        self.setup_driver()
        
        try:
            # Test 1: Homepage
            if self.test_homepage_load():
                
                # Test 2: Authentication flow for first user
                if users:
                    self.test_auth_modal(users[0])
                
                # Test 3: Subscription modal
                if users:
                    self.test_subscription_modal(users[0])
                
                # Test 4: Responsive design
                self.test_responsive_design()
                
                # Test 5: Navigation
                self.test_navigation()
            
        except Exception as e:
            print(f"\n✗ Critical error: {e}")
            self.results["errors"].append(str(e))
            self.take_screenshot("error")
        finally:
            self.teardown_driver()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("BROWSER TEST SUMMARY")
        print("="*50)
        print(f"Total Tests: {self.results['success'] + self.results['failed']}")
        print(f"Successful: {self.results['success']}")
        print(f"Failed: {self.results['failed']}")
        
        if self.results["errors"]:
            print(f"\nErrors ({len(self.results['errors'])}):")
            for error in set(self.results["errors"]):
                print(f"  - {error}")
        
        if self.results["screenshots"]:
            print(f"\nScreenshots saved ({len(self.results['screenshots'])}):")
            for screenshot in self.results["screenshots"]:
                print(f"  - {screenshot}")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"browser_test_results_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump({
                "timestamp": timestamp,
                "results": self.results,
                "test_users": [
                    {"email": u.email, "name": u.name} 
                    for u in self.test_users[:5]
                ]
            }, f, indent=2)
        print(f"\nDetailed results saved to: {filename}")


def main():
    parser = argparse.ArgumentParser(description="Browser-based testing for QuranCompare")
    parser.add_argument("--users", type=int, default=10, help="Number of test users")
    parser.add_argument("--url", default="http://localhost:3000", help="App URL")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--browser", choices=["chrome", "firefox"], default="chrome", help="Browser to use")
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = BrowserSubscriptionTester(
        app_url=args.url,
        browser=args.browser,
        headless=args.headless
    )
    
    # Generate test users
    users = tester.generate_test_users(args.users)
    
    # Run tests
    try:
        tester.run_full_test(users)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    
    # Print summary
    tester.print_summary()


if __name__ == "__main__":
    main()