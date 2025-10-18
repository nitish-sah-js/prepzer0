#!/usr/bin/env python3
"""
Cleanup Test Accounts Script
Removes all test accounts created by the automated testing script
"""

import os
import sys
from pymongo import MongoClient

# Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'codingplatform')

def cleanup_test_accounts():
    """Remove all test accounts from database"""
    try:
        print("\n🗑️  Connecting to MongoDB...")
        client = MongoClient(MONGODB_URI)
        db = client[DB_NAME]

        # Find test accounts (emails ending with @test.prepzer0.com)
        test_accounts = db.users.find({
            'usertype': 'student',
            'email': {'$regex': '@test.prepzer0.com$'}
        })

        count = db.users.count_documents({
            'usertype': 'student',
            'email': {'$regex': '@test.prepzer0.com$'}
        })

        if count == 0:
            print("✅ No test accounts found to delete")
            return

        print(f"\n📋 Found {count} test accounts to delete:\n")

        for user in db.users.find({
            'usertype': 'student',
            'email': {'$regex': '@test.prepzer0.com$'}
        }):
            print(f"  • {user['email']} (USN: {user.get('USN', 'N/A')})")

        # Ask for confirmation
        confirm = input(f"\n⚠️  Delete {count} test accounts? (yes/no): ").strip().lower()

        if confirm == 'yes':
            # Get user IDs for cascading deletes
            user_ids = [user['_id'] for user in db.users.find({
                'usertype': 'student',
                'email': {'$regex': '@test.prepzer0.com$'}
            })]

            # Delete related data
            print("\n🗑️  Deleting related data...")

            # Delete submissions
            submissions_deleted = db.submissions.delete_many({'student': {'$in': user_ids}})
            print(f"  • Submissions: {submissions_deleted.deleted_count}")

            # Delete activity sessions
            sessions_deleted = db.activesessions.delete_many({'userId': {'$in': user_ids}})
            print(f"  • Active sessions: {sessions_deleted.deleted_count}")

            # Delete integrity records
            integrity_deleted = db.integrities.delete_many({'userId': {'$in': user_ids}})
            print(f"  • Integrity records: {integrity_deleted.deleted_count}")

            # Delete evaluation results
            evaluations_deleted = db.evaluationresults.delete_many({'userId': {'$in': user_ids}})
            print(f"  • Evaluation results: {evaluations_deleted.deleted_count}")

            # Delete exam candidates
            candidates_deleted = db.examcandidates.delete_many({'userId': {'$in': user_ids}})
            print(f"  • Exam candidates: {candidates_deleted.deleted_count}")

            # Delete user accounts
            result = db.users.delete_many({
                'usertype': 'student',
                'email': {'$regex': '@test.prepzer0.com$'}
            })

            print(f"\n✅ Successfully deleted {result.deleted_count} test accounts and all related data")
        else:
            print("❌ Operation cancelled")

        client.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║         PrepZer0 - Test Account Cleanup Tool                ║
╚══════════════════════════════════════════════════════════════╝
    """)

    cleanup_test_accounts()

if __name__ == "__main__":
    main()
