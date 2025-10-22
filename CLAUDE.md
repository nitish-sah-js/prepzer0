# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference Commands

```bash
# Development
npm start                                     # Start with nodemon (auto-reload)
npm run build:css                            # Build and watch Tailwind CSS

# Database Management
npm run seed:departments                     # Initialize department data
npm run cleanup:sessions                     # Clean orphaned sessions
npm run audit:database                       # Audit database integrity
node scripts/create-admin.js                 # Create admin user
node scripts/populate-students.js            # Populate test data
node scripts/recalculate-scores.js          # Fix submission scores

# Testing
cd test && python create_test_accounts.py    # Create test accounts
cd test && python test_chrome.py             # Run Selenium tests
```

## Application Overview

PrepZer0 is an online MCQ examination platform built with Node.js/Express featuring real-time integrity monitoring, single-device login enforcement, and multi-role user management.

**Core Features**:
- MCQ exam creation with department/semester targeting or Excel candidate upload
- Real-time integrity monitoring with camera capture and behavior tracking
- Single-device login enforcement for students during exams
- Automated scoring with instant results
- Dynamic department management system
- Exam reminder scheduling (15 minutes before)
- Bulk student account creation via CSV
- Secure file uploads with AWS S3 integration

## Architecture & Request Flow

```
server.js → app.js → middleware chain → routes → controllers → models → database
                ↓
         Session Validator (single-device enforcement)
                ↓
         Route-specific middleware (auth checks)
```

**Entry Points**:
- `server.js` - HTTP server, exam reminder scheduling on startup
- `app.js` - Express configuration, middleware setup, route mounting, S3 config

## Critical Database Models

### User (usermodel.js)
```javascript
{
  email, USN, fname, lname,
  usertype: 'student'|'teacher'|'admin',
  currentSessionId,        // Single-device enforcement
  currentSemesterOverride, // Manual semester override
  managedDepartments[],    // Teacher's exam creation permissions
  CurrentSemester          // Virtual field (auto-calculated from USN)
}
```

### Exam (Exam.js)
Pre-save validation: Must have (departments + semester) OR Excel candidates, never both.
```javascript
{
  departments[], semester,       // Target selection
  excelCandidatesPresent: bool,  // Alternative targeting
  mcqQuestions[],                 // Questions array
  scheduledAt, scheduleTill,      // Time window
  createdBy                       // Teacher reference
}
```

### Submission (SubmissionSchema.js)
Auto-scoring on submission: `score = Σ(correctAnswer === selectedOption ? marks : 0)`

### Integrity (Integrity.js)
Tracks: tabChanges, mouseOuts, fullscreenExits, copyAttempts, pasteAttempts, focusChanges

### ActiveSession (ActiveSession.js)
Collection name: `activitytrackers` - Real-time exam activity tracking with ping history

## Authentication & Session Management

### Passport Local Strategy (app.js:113-162)
- Username field: `email`
- Teacher login requires: `active: true` AND `userallowed: true`
- Admin requires: `admin_access: true`
- Students: `userallowed: true` only

### Single-Device Login Enforcement (middleware/sessionValidator.js)
**IMPORTANT**: Only enforces for STUDENTS on EXAM routes (`/dashboard/test/*`)
- Stores `req.sessionID` in `user.currentSessionId` on login
- Compares on each request, force logout on mismatch
- Teachers/admins bypass (multi-device allowed)

## Exam System Flow

```
Student Dashboard → Check eligibility → Start exam → Integrity monitoring
    ↓                                       ↓              ↓
Auto-eligible if:                    test3.ejs view   Client tracks events
- dept matches AND                   Questions shown  Server records violations
- semester matches                        ↓              ↓
OR ExamCandidate exists             Submit answers   Camera captures → S3
                                          ↓
                                    Auto-score MCQs
                                          ↓
                                    Save Submission
```

## File Upload & S3 Integration

### Three Upload Types (config/upload.js)
1. **CSV**: MCQ questions, 5MB max, disk storage
2. **Images**: Integrity monitoring, 2MB max, memory → S3
3. **Excel**: Exam candidates, 10MB max, memory storage

### Image Security (app.js:300-395)
```javascript
// Magic bytes verification
PNG: 89504e47, JPEG: ffd8ff, GIF: 47494638, WebP: 52494646
// S3 path: integrity/{usn}/{examId}/captured-{random}.{ext}
// Server-side encryption: AES256
```

## USN & Semester Calculation

### USN Format: `LocationYearDepartmentRollNumber`
Example: `1BY22CS001` = BY (location) + 22 (year) + CS (dept) + 001 (roll)

### Auto Semester (utils/semesterCalculator.js)
```javascript
admissionYear = 2000 + parseInt(usnYear)  // 22 → 2022
yearsSinceAdmission = currentYear - admissionYear
baseSemester = yearsSinceAdmission * 2
// Jan-Jun: even semester (+2), Jul-Dec: odd semester (+1)
semester = (month <= 6) ? baseSemester + 2 : baseSemester + 1
```

## Department Management

Default departments (code → name):
- cs → Computer Science
- is → Information Science
- ec → Electronics & Communication
- et → Electronics & Telecommunication
- ai → Artificial Intelligence
- cv → Civil Engineering
- ee → Electrical Engineering
- ad → Automation & Robotics

Seed with: `npm run seed:departments`

## MCQ Question System

### Schema Requirements
- Exactly 4 options per question
- One correct answer (string matching an option)
- Difficulty: easy, medium, hard

### Dynamic Classification (views/database_questions.ejs)
- Add custom classifications via modal UI
- POST `/admin/exam/{examId}/database/classification/add`
- Stored in-memory during session

## Bulk Student Upload

### CSV Format (required fields)
```csv
email,usn,department,semester,fname,lname,phone,imageurl
student1@example.com,1BY22CS001,cs,1,John,Doe,9876543210,
```

### Features
- Common password for all uploaded students
- Auto-approval: `userallowed: true`, `active: true`
- Year auto-extracted from USN
- Duplicate detection and detailed error reporting

Route: `/admin/addbulckstudent`

## Key Controllers

| Controller | Primary Responsibilities |
|------------|-------------------------|
| authenticatecontroller | Login, signup, session tracking, password reset |
| dashboardcontroller | Student exam interface, submission, auto-scoring |
| admincontroller | Teacher/admin dashboard, student management |
| examcontroller | Exam CRUD, validation, candidate management |
| dbQuestionsController | Question bank, dynamic classification |
| bulkStudentController | CSV student upload |
| activeSessionController | Real-time activity tracking |

## Integrity Monitoring (views/test3.ejs)

Client-side events → POST `/update-integrity`:
- Tab changes, window focus loss
- Copy/paste attempts
- Fullscreen exit, mouse exit
- Camera captures → POST `/save-image` → S3

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://...
DB_NAME=codingplatform

# Session
SESSION_SECRET=...
SESSION_CRYPTO_SECRET=...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...

# Email (GoDaddy SMTP)
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=services@prepzer0.co.in
EMAIL_PASSWORD=...
```

## Database Management Scripts

```bash
# Maintenance
npm run cleanup:sessions     # Clean orphaned ActivityTracker/Submissions
npm run audit:database       # Database integrity check

# Data seeding
npm run seed:departments                  # Initial departments
node scripts/populate-students.js         # Test students
node scripts/populate-mcq-questions.js    # MCQ questions

# Utilities
node scripts/recalculate-scores.js       # Fix submission scores
node scripts/create-admin.js             # Create admin user
```

## Orphaned Data Handling

When Users are deleted with active sessions/submissions:
- ActivityTracker sessions → marked offline
- Submissions → displayed with "[DELETED USER]" placeholder
- Data preserved (scores, timestamps)

**Best practice**: Implement soft deletes for Users with submissions

## Testing

Python Selenium tests in `/test/`:
```bash
cd test
pip install -r requirements.txt
python create_test_accounts.py    # Setup
python test_chrome.py             # Run tests
```

No Node.js test framework configured.

## Partial Implementations

**Coding Exams**: Models and views exist, controller logic missing
- Models: `CodingQuestion.js`, `Codingschema.js`
- Views: `add_coding.ejs`, `edit_coding.ejs`
- Missing: Execution environment, test case validation

**Services Layer**: `/services/` directory empty

## Security Notes

- Helmet.js commented out (app.js:56)
- Magic bytes verification for image uploads
- S3 server-side encryption (AES256)
- Session encryption with SESSION_CRYPTO_SECRET
- MongoDB sanitization, XSS protection, HPP prevention

## Troubleshooting

### Session Issues
- Clear cookies for unexpected logouts
- Verify SESSION_SECRET and SESSION_CRYPTO_SECRET set
- Check MongoDB session store connection

### File Upload Failures
- Verify AWS credentials in .env
- Check S3 bucket permissions
- Confirm file size limits (CSV: 5MB, Images: 2MB, Excel: 10MB)

### Classification Button Not Working
- Check browser console for errors
- Clear browser cache
- Verify route exists: POST `/admin/exam/{examId}/database/classification/add`

### CSS Not Updating
- Run `npm run build:css`
- Clear browser cache
- Check `public/style.css` generated from `public/landing.css`

## Additional Documentation

- `BULK_STUDENT_UPLOAD_FEATURE.md` - Bulk upload guide
- `ATTENDANCE_TRACKING_FEATURE.md` - Attendance tracking documentation
- `SECURITY_AUDIT.md` - Security assessment report
- `scripts/README.md` - Database scripts documentation
- `templates/student_upload_template.csv` - CSV template

## Important Implementation Details

### Request Flow Architecture
```
HTTP Request → server.js (port 80/3000)
    ↓
app.js middleware chain:
  1. Body parsers (JSON, URL-encoded, 100MB limit)
  2. Security: mongoSanitize, HPP, XSS, rate limiting
  3. Session (MongoStore + encryption)
  4. Passport authentication
  5. validateSingleSession (single-device enforcement)
  6. Flash messaging
    ↓
Route matching → routes/*.js
    ↓
Route middleware (requireAuth, requireStudent, requireAdmin)
    ↓
Controller function → Models → MongoDB
    ↓
Response (render/json/redirect)
```

### Database Collection Names (Important for Queries)
Some models have different collection names than their model names:
- `ActiveSession` model → `activitytrackers` collection
- `User` model → `users` collection
- `Exam` model → `exams` collection

### Role-Based Access Control Patterns
```javascript
// Student routes (single-device enforced on exam routes)
/dashboard                → requireStudent
/dashboard/test/*         → requireStudent + validateSingleSession

// Teacher/Admin routes (multi-device allowed)
/admin                    → requireAdmin
/admin/create_exam        → requireAdmin

// Super Admin routes
/supadmin                 → requireSuperAdmin
```

### Exam Eligibility Logic (dashboardcontroller.js)
Students see an exam if EITHER:
1. **Department + Semester match**: `exam.departments.includes(student.Department) && exam.semester === student.CurrentSemester`
2. **ExamCandidate exists**: `ExamCandidate.find({ exam: examId, usn: student.USN })`

Both paths are queried and merged (union of results).

### Activity Tracking (Real-time)
```javascript
// Client-side (test3.ejs)
Every 30 seconds: POST /dashboard/see-active
  → Updates ActivityTracker.lastPingTimestamp
  → Adds entry to pingHistory (if 30+ seconds since last)
  → Sets status: 'active'

// Server-side
No ping for extended period → status remains 'active' (not auto-changed to 'offline')
Only changed to 'offline' on explicit submission or leave action
```

### Auto-Scoring Implementation
```javascript
// On submission (dashboardcontroller.postStartExam)
score = 0
for each question in exam.mcqQuestions:
  studentAnswer = mcqAnswers.find(a => a.questionId === question._id)
  if (studentAnswer.selectedOption === question.correctAnswer):
    score += question.marks
```

### Common Gotchas

1. **Session validation only affects students on exam routes** - Teachers/admins can use multiple devices
2. **CurrentSemester is virtual** - Calculated from USN year unless `currentSemesterOverride` is set
3. **Exam validation is pre-save** - Must have (dept+sem) OR excelCandidates, never both
4. **Collection name mismatch** - ActiveSession model uses `activitytrackers` collection
5. **Image upload requires magic bytes** - Not just MIME type validation
6. **Passport username field is `email`** - Not typical 'username'
7. **ActivityTracker has 7-day TTL** - Auto-cleanup via MongoDB TTL index
8. **Teachers need two approvals** - Both `active: true` (email verified) AND `userallowed: true` (admin approved)

### Controller Naming Convention
Controllers use `getcontrol` and `postcontrol` method names (not camelCase like `getControl`):
```javascript
exports.getcontrol = async (req, res) => { ... }
exports.postcontrol = async (req, res) => { ... }
exports.logincontrol = async (req, res) => { ... }
```

### When Making Changes

**Before modifying User model:**
- Consider impact on single-device enforcement (currentSessionId)
- Consider impact on semester calculation (CurrentSemester virtual)
- Check for orphaned references if deleting users with submissions

**Before modifying Exam model:**
- Test pre-save validation (departments+semester vs excelCandidates)
- Update exam eligibility queries in dashboardcontroller
- Check ExamCandidate associations

**Before modifying session logic:**
- Remember: only affects students on exam routes
- Test multi-device access for teachers/admins
- Verify SESSION_SECRET and SESSION_CRYPTO_SECRET set

**Before modifying file uploads:**
- Update magic bytes validation if adding new file types
- Check S3 bucket permissions for new paths
- Verify file size limits in config/upload.js