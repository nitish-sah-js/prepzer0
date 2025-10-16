# Scripts Documentation

This folder contains utility scripts for managing the PrepZer0 application.

## Department Seed Script

### Overview
The `seedDepartments.js` script populates the Department collection with 8 initial departments.

### Included Departments

| Code | Name | Full Name |
|------|------|-----------|
| CS | Computer Science | Department of Computer Science & Engineering |
| IS | Information Science | Department of Information Science & Engineering |
| EC | Electronics & Communication | Department of Electronics & Communication Engineering |
| ET | Electronics & Telecommunication | Department of Electronics & Telecommunication Engineering |
| AI | Artificial Intelligence | Department of Artificial Intelligence & Machine Learning |
| CV | Civil Engineering | Department of Civil Engineering |
| EE | Electrical Engineering | Department of Electrical & Electronics Engineering |
| AD | Automation & Robotics | Department of Automation & Robotics |

### How to Run

#### Method 1: Using npm script (Recommended)
```bash
npm run seed:departments
```

#### Method 2: Direct execution
```bash
node scripts/seedDepartments.js
```

### Prerequisites
- MongoDB must be running
- `.env` file must be configured with `MONGODB_URI`
- Department model must exist at `../models/Department.js`

### Features
-  Checks for existing departments before seeding
-  Prevents duplicate entries
-  Creates all departments with active status
-  Provides detailed console output
-  Displays summary of created departments

### Safety Features
- **Duplicate Prevention**: The script checks if departments already exist and skips seeding if any are found
- **Error Handling**: Proper error messages and exit codes
- **Validation**: Uses the Department model's built-in validation

### Customization

To modify the departments that are seeded, edit the `departments` array in `seedDepartments.js`:

```javascript
const departments = [
    {
        code: 'cs',              // Unique department code (lowercase)
        name: 'Computer Science', // Display name
        fullName: 'Department of Computer Science & Engineering', // Full official name
        description: 'Description of the department', // Optional description
        active: true             // Active status (true/false)
    },
    // Add more departments here...
];
```

### Expected Output

```
=� Starting Department Seed Script

 MongoDB Connected Successfully

=� Found 0 existing departments

<1 Seeding departments...

 Created: CS - Computer Science
 Created: IS - Information Science
 Created: EC - Electronics & Communication
 Created: ET - Electronics & Telecommunication
 Created: AI - Artificial Intelligence
 Created: CV - Civil Engineering
 Created: EE - Electrical Engineering
 Created: AD - Automation & Robotics

<� Successfully seeded 8 departments!

=� All Departments in Database:
================================
AD   | Automation & Robotics        |  Active
AI   | Artificial Intelligence      |  Active
CS   | Computer Science             |  Active
CV   | Civil Engineering            |  Active
EC   | Electronics & Communication  |  Active
EE   | Electrical Engineering       |  Active
ET   | Electronics & Telecommunication |  Active
IS   | Information Science          |  Active
================================

( Seed script completed successfully!
```

### Re-seeding

If you need to re-seed the departments:

1. Delete existing departments manually through:
   - MongoDB Compass
   - MongoDB shell: `db.departments.deleteMany({})`
   - Admin interface at `/admin/departments`

2. Run the seed script again

### Troubleshooting

**Error: MongoDB Connection Failed**
- Ensure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`
- Verify network connectivity

**Error: Department validation failed**
- Check that all required fields are provided
- Ensure department codes are unique
- Verify all fields meet validation requirements

**Warning: Departments already exist**
- This is expected if you've already run the seed script
- Delete existing departments if you want to re-seed

## Orphaned Session Cleanup Script

### Overview
The `cleanupOrphanedSessions.js` script identifies and reports on orphaned database references that can cause missing exam data issues.

### When to Use This Script
Run this script if you notice:
- Students showing "active" status forever after exams end
- "User doesn't exist" errors in exam candidate views
- Exam submissions not displaying or showing as "[DELETED USER]"
- Inconsistent activity status displays
- Missing student data despite submissions existing

### What It Does
**Part 1: ActivityTracker Cleanup**
1. Scans all ActivityTracker records in the database
2. Identifies sessions where:
   - The userId field is null or undefined
   - The referenced User document no longer exists
3. Automatically marks orphaned sessions as "offline"

**Part 2: Submission Integrity Check**
1. Scans all Submission records in the database
2. Identifies submissions where:
   - The student field is null
   - The referenced User document no longer exists
3. Reports orphaned submissions (does not delete them)
4. Provides detailed summary of findings

### How to Run

#### Method 1: Using npm script (Recommended)
```bash
npm run cleanup:sessions
```

#### Method 2: Direct execution
```bash
node scripts/cleanupOrphanedSessions.js
```

### Prerequisites
- MongoDB must be running
- `.env` file must be configured with `MONGODB_URI`
- ActivityTracker and User models must exist

### Expected Output

```
🧼 Orphaned Session Cleanup Script

✅ MongoDB Connected Successfully

🔍 Starting orphaned session cleanup...

📄 Found 150 total activity sessions
⚠️  Session 507f1f77bcf86cd799439011 references non-existent user 507f191e810c19729de860ea

📊 Cleanup Summary:
================================
Total sessions checked: 150
Orphaned sessions found: 3
Sessions updated to offline: 3
================================

⚠️  WARNING: Orphaned sessions detected!
This indicates that some User records were deleted while students had active sessions.
These sessions have been marked as offline.

Orphaned session IDs:
  - 507f1f77bcf86cd799439011
  - 507f1f77bcf86cd799439012
  - 507f1f77bcf86cd799439013

🔍 Checking for orphaned submissions...

📄 Found 200 total submissions
⚠️  Submission 507f2a88bcf86cd799439022 references non-existent student 507f191e810c19729de860ea

📊 Submission Cleanup Summary:
================================
Total submissions checked: 200
Orphaned submissions found: 2
================================

⚠️  WARNING: Orphaned submissions detected!
These submissions reference students that no longer exist in the database.
The exam data exists but cannot be displayed properly.

Orphaned submission IDs:
  - 507f2a88bcf86cd799439022
  - 507f2a88bcf86cd799439023

💡 Recommendation: Review why students were deleted while having active submissions.
💡 Consider implementing soft deletes for User records instead of hard deletes.

✨ Cleanup script completed successfully!
```

### Automatic Handling
**Note**: The system now automatically handles orphaned data when viewing exam candidates:
- **Orphaned ActivityTracker sessions**: Automatically marked as offline
- **Orphaned Submissions**: Displayed with "[DELETED USER]" placeholder and "User Deleted" status
- **Submission data is preserved**: Scores and submission times are still visible to admins

This script is provided for:
- Identifying existing orphaned records in the database
- Manual verification of database integrity
- Troubleshooting missing exam data issues
- Understanding the scope of data integrity problems

### Troubleshooting

**Error: MongoDB Connection Failed**
- Ensure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`
- Verify network connectivity

**Warning: Many orphaned sessions or submissions found**
- This typically indicates users were deleted while they had active exam sessions or existing submissions
- Review your user deletion procedures - users should NOT be deleted if they have submitted exams
- **IMPORTANT**: Implement soft deletes for User records instead of hard deletes
- Consider adding a pre-delete hook that checks for existing submissions before allowing user deletion

**Orphaned submissions showing "[DELETED USER]" in exam candidates page**
- This is expected behavior after running the cleanup script
- The submission data is preserved and visible to admins
- These entries indicate that the student's User account was deleted after submitting the exam
- To prevent this: Do not delete User records if they have exam submissions

## Adding More Scripts

To add new seed or utility scripts:

1. Create a new `.js` file in this folder
2. Add a corresponding npm script in `package.json`
3. Document it in this README
4. Follow the same pattern as `seedDepartments.js`
