#!/usr/bin/env python3
"""
Subscription Model Stress Testing Tool
======================================

This script generates multiple test email accounts and simulates
subscription scenarios to stress test the QuranCompare app's 
subscription and authentication system.

Usage:
    python test_subscription_stress.py [options]

Options:
    --users NUMBER     Number of test users to generate (default: 100)
    --api-url URL      API base URL (default: http://localhost:8000)
    --concurrent NUM   Number of concurrent requests (default: 10)
    --test-type TYPE   Type of test: basic, stress, lifecycle (default: basic)
"""

import asyncio
import aiohttp
import random
import string
import time
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import sys
from dataclasses import dataclass
from enum import Enum


class TestType(Enum):
    BASIC = "basic"
    STRESS = "stress" 
    LIFECYCLE = "lifecycle"


@dataclass
class TestUser:
    email: str
    phone: str
    subscription_status: str = "inactive"
    tier: str = "free"
    stripe_customer_id: str = None
    
    
class SubscriptionTester:
    """Main class for testing subscription system"""
    
    def __init__(self, api_url: str = "http://localhost:8000", concurrent: int = 10):
        self.api_url = api_url.rstrip('/')
        self.concurrent = concurrent
        self.test_users: List[TestUser] = []
        self.results = {
            "success": 0,
            "failed": 0,
            "errors": [],
            "response_times": []
        }
        
    def generate_test_email(self, index: int) -> str:
        """Generate unique test email address"""
        timestamp = int(time.time())
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        return f"test_user_{index}_{timestamp}_{random_str}@testquran.com"
    
    def generate_test_phone(self, index: int) -> str:
        """Generate unique test phone number"""
        # Generate US phone numbers for testing
        area_code = random.randint(200, 999)
        prefix = random.randint(200, 999)
        line = random.randint(1000, 9999)
        return f"+1{area_code}{prefix}{line}"
    
    def generate_test_users(self, count: int) -> List[TestUser]:
        """Generate specified number of test users"""
        print(f"Generating {count} test users...")
        users = []
        for i in range(count):
            user = TestUser(
                email=self.generate_test_email(i),
                phone=self.generate_test_phone(i)
            )
            users.append(user)
        self.test_users = users
        print(f"Generated {len(users)} test users")
        return users
    
    async def check_subscription_status(self, session: aiohttp.ClientSession, email: str) -> Dict:
        """Check subscription status for a user"""
        start_time = time.time()
        try:
            url = f"{self.api_url}/api/payment/user/subscription/{email}"
            async with session.get(url) as response:
                elapsed = time.time() - start_time
                self.results["response_times"].append(elapsed)
                
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data, "elapsed": elapsed}
                else:
                    return {"success": False, "error": f"Status {response.status}", "elapsed": elapsed}
        except Exception as e:
            elapsed = time.time() - start_time
            return {"success": False, "error": str(e), "elapsed": elapsed}
    
    async def create_or_update_user(self, session: aiohttp.ClientSession, email: str) -> Dict:
        """Create or update a user"""
        start_time = time.time()
        try:
            url = f"{self.api_url}/api/payment/user/subscription"
            payload = {"email": email}
            
            async with session.post(url, json=payload) as response:
                elapsed = time.time() - start_time
                self.results["response_times"].append(elapsed)
                
                if response.status in [200, 201]:
                    data = await response.json()
                    return {"success": True, "data": data, "elapsed": elapsed}
                else:
                    text = await response.text()
                    return {"success": False, "error": f"Status {response.status}: {text}", "elapsed": elapsed}
        except Exception as e:
            elapsed = time.time() - start_time
            return {"success": False, "error": str(e), "elapsed": elapsed}
    
    async def simulate_checkout_session(self, session: aiohttp.ClientSession, email: str) -> Dict:
        """Simulate creating a checkout session"""
        start_time = time.time()
        try:
            url = f"{self.api_url}/api/payment/create-checkout-session"
            payload = {
                "email": email,
                "success_url": "http://localhost:3000/payment-success",
                "cancel_url": "http://localhost:3000/payment-cancel"
            }
            
            async with session.post(url, json=payload) as response:
                elapsed = time.time() - start_time
                self.results["response_times"].append(elapsed)
                
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data, "elapsed": elapsed}
                else:
                    text = await response.text()
                    return {"success": False, "error": f"Status {response.status}: {text}", "elapsed": elapsed}
        except Exception as e:
            elapsed = time.time() - start_time
            return {"success": False, "error": str(e), "elapsed": elapsed}
    
    async def run_basic_test(self, users: List[TestUser]):
        """Run basic functionality test"""
        print("\n=== Running Basic Functionality Test ===")
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Check initial status
            print("\n1. Checking initial subscription status...")
            for user in users[:5]:  # Test first 5 users
                result = await self.check_subscription_status(session, user.email)
                if result["success"]:
                    print(f"✓ {user.email}: {result['data']}")
                    self.results["success"] += 1
                else:
                    print(f"✗ {user.email}: {result['error']}")
                    self.results["failed"] += 1
                    self.results["errors"].append(result["error"])
            
            # Test 2: Create users
            print("\n2. Creating/updating users...")
            for user in users[:5]:
                result = await self.create_or_update_user(session, user.email)
                if result["success"]:
                    print(f"✓ Created {user.email}")
                    self.results["success"] += 1
                else:
                    print(f"✗ Failed to create {user.email}: {result['error']}")
                    self.results["failed"] += 1
                    self.results["errors"].append(result["error"])
            
            # Test 3: Verify no duplicates
            print("\n3. Testing duplicate prevention...")
            for user in users[:2]:
                result1 = await self.create_or_update_user(session, user.email)
                result2 = await self.create_or_update_user(session, user.email)
                if result1["success"] and result2["success"]:
                    print(f"✓ Duplicate prevention working for {user.email}")
                    self.results["success"] += 2
                else:
                    print(f"✗ Duplicate prevention failed for {user.email}")
                    self.results["failed"] += 2
    
    async def run_stress_test(self, users: List[TestUser]):
        """Run stress test with concurrent requests"""
        print(f"\n=== Running Stress Test ({self.concurrent} concurrent requests) ===")
        
        async with aiohttp.ClientSession() as session:
            # Test concurrent user creation
            print("\n1. Testing concurrent user creation...")
            tasks = []
            for user in users[:self.concurrent]:
                task = self.create_or_update_user(session, user.email)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    self.results["failed"] += 1
                    self.results["errors"].append(str(result))
                elif result["success"]:
                    self.results["success"] += 1
                else:
                    self.results["failed"] += 1
                    self.results["errors"].append(result["error"])
            
            # Test concurrent subscription checks
            print("\n2. Testing concurrent subscription status checks...")
            tasks = []
            for user in users[:self.concurrent]:
                task = self.check_subscription_status(session, user.email)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    self.results["failed"] += 1
                    self.results["errors"].append(str(result))
                elif result["success"]:
                    self.results["success"] += 1
                else:
                    self.results["failed"] += 1
                    self.results["errors"].append(result["error"])
            
            # Test burst requests
            print(f"\n3. Testing burst requests ({len(users)} requests)...")
            start_time = time.time()
            tasks = []
            
            for user in users:
                task = self.check_subscription_status(session, user.email)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            burst_time = time.time() - start_time
            
            successful = sum(1 for r in results if not isinstance(r, Exception) and r["success"])
            failed = len(results) - successful
            
            print(f"Burst test completed in {burst_time:.2f}s")
            print(f"Success: {successful}, Failed: {failed}")
            print(f"Requests per second: {len(users) / burst_time:.2f}")
            
            self.results["success"] += successful
            self.results["failed"] += failed
    
    async def run_lifecycle_test(self, users: List[TestUser]):
        """Test complete subscription lifecycle"""
        print("\n=== Running Subscription Lifecycle Test ===")
        
        async with aiohttp.ClientSession() as session:
            test_user = users[0]
            
            # 1. Create user
            print(f"\n1. Creating user {test_user.email}...")
            result = await self.create_or_update_user(session, test_user.email)
            if result["success"]:
                print("✓ User created successfully")
                self.results["success"] += 1
            else:
                print(f"✗ Failed: {result['error']}")
                self.results["failed"] += 1
                return
            
            # 2. Check initial status (should be free)
            print("\n2. Checking initial status...")
            result = await self.check_subscription_status(session, test_user.email)
            if result["success"]:
                status = result["data"]
                print(f"✓ Status: {status}")
                if status.get("status") == "inactive" and status.get("tier") == "free":
                    print("✓ Correctly shows as free/inactive")
                    self.results["success"] += 1
                else:
                    print("✗ Unexpected initial status")
                    self.results["failed"] += 1
            else:
                print(f"✗ Failed: {result['error']}")
                self.results["failed"] += 1
            
            # 3. Simulate checkout session
            print("\n3. Creating checkout session...")
            result = await self.simulate_checkout_session(session, test_user.email)
            if result["success"]:
                print("✓ Checkout session created")
                print(f"  Session ID: {result['data'].get('sessionId', 'N/A')}")
                self.results["success"] += 1
            else:
                print(f"✗ Failed: {result['error']}")
                self.results["failed"] += 1
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        print(f"Total Requests: {self.results['success'] + self.results['failed']}")
        print(f"Successful: {self.results['success']}")
        print(f"Failed: {self.results['failed']}")
        
        if self.results["response_times"]:
            avg_time = sum(self.results["response_times"]) / len(self.results["response_times"])
            min_time = min(self.results["response_times"])
            max_time = max(self.results["response_times"])
            print(f"\nResponse Times:")
            print(f"  Average: {avg_time*1000:.2f}ms")
            print(f"  Min: {min_time*1000:.2f}ms")
            print(f"  Max: {max_time*1000:.2f}ms")
        
        if self.results["errors"]:
            print(f"\nUnique Errors ({len(set(self.results['errors']))}):")
            for error in set(self.results["errors"]):
                count = self.results["errors"].count(error)
                print(f"  - {error} (occurred {count} times)")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"stress_test_results_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump({
                "timestamp": timestamp,
                "results": self.results,
                "test_users": [{"email": u.email, "phone": u.phone} for u in self.test_users[:10]]  # Save first 10
            }, f, indent=2)
        print(f"\nDetailed results saved to: {filename}")


async def main():
    parser = argparse.ArgumentParser(description="Stress test QuranCompare subscription system")
    parser.add_argument("--users", type=int, default=100, help="Number of test users to generate")
    parser.add_argument("--api-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--concurrent", type=int, default=10, help="Number of concurrent requests")
    parser.add_argument("--test-type", choices=["basic", "stress", "lifecycle"], default="basic",
                       help="Type of test to run")
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = SubscriptionTester(api_url=args.api_url, concurrent=args.concurrent)
    
    # Generate test users
    users = tester.generate_test_users(args.users)
    
    # Run selected test
    test_type = TestType(args.test_type)
    
    try:
        if test_type == TestType.BASIC:
            await tester.run_basic_test(users)
        elif test_type == TestType.STRESS:
            await tester.run_stress_test(users)
        elif test_type == TestType.LIFECYCLE:
            await tester.run_lifecycle_test(users)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    # Print summary
    tester.print_summary()


if __name__ == "__main__":
    asyncio.run(main())