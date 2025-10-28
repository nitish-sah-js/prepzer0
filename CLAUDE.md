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
npm run clean:database                       # Full database cleanup/reset
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
- `server.js` - HTTP server (port 80/3000), exam reminder scheduling on startup
- `app.js` - Express configuration, middleware setup, route mounting, S3 config

### Middleware Chain Order (app.js)
Critical: Middleware runs in the order defined in app.js. Order matters!

1. **Static files** - `express.static('public')`, `express.static('uploads')`
2. **Body parsers** - JSON + URL-encoded (100MB limit for large file uploads)
3. **Security middleware**:
   - `mongoSanitize()` - Prevents NoSQL injection
   - `hpp()` - HTTP Parameter Pollution prevention
   - `xss()` - XSS protection
   - Note: `helmet()` is commented out (app.js:56)
4. **Session management** - `express-session` with MongoStore + encryption
5. **Flash messages** - `connect-flash` for one-time messages
6. **Passport authentication** - `passport.initialize()`, `passport.session()`
7. **Single-device enforcement** - `validateSingleSession` (only affects students on exam routes)
8. **Route mounting** - `/`, `/admin`, `/supadmin`, `/dashboard`, `/authenticate`, `/profile`, `/user`
9. **404 handler** - `app.all('*')` renders `pagenotfound.ejs`

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
1. **CSV**: MCQ questions, 5MB max, disk storage (`uploads/mcq-{random}.csv`)
2. **Images**: Integrity monitoring, 2MB max, memory → S3
3. **Excel**: Exam candidates, 10MB max, memory storage

### Image Security (app.js:300-395)
```javascript
// Magic bytes verification (double validation: multer MIME + magic bytes)
PNG: 89504e47, JPEG: ffd8ffe0/ffd8ffe1/ffd8ffe2, GIF: 47494638, WebP: 52494646
// S3 path: integrity/{usn}/{examId}/captured-{random}.{ext}
// Server-side encryption: AES256
// Error handling: handleUploadError middleware provides user-friendly messages
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

## Key Controllers

| Controller | Primary Responsibilities |
|------------|-------------------------|
| authenticatecontroller | Login, signup, session tracking, password reset |
| dashboardcontroller | Student exam interface, submission, auto-scoring, partial submission auto-save |
| admincontroller | Teacher/admin dashboard, student management |
| examcontroller | Exam CRUD, validation, candidate management |
| dbQuestionsController | Question bank, dynamic classification |
| bulkStudentController | CSV student upload |
| activeSessionController | Real-time activity tracking |
| reportController | Exam reports and analytics |
| departmentcontroller | Department CRUD operations |

## Important API Endpoints (app.js)

### Session & Authentication
- `GET /logout` - Clears session, regenerates session ID, clears `currentSessionId` (students only)
- `GET /api/check-session` - Returns JSON: `{valid: true/false, reason: string}`

### Integrity Monitoring
- `POST /update-integrity` - Records integrity violations
- `POST /save-image` - Uploads integrity camera captures to S3

## Environment Variables

```env
# Server
PORT=80
NODE_ENV=production

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
AWS_S3_BUCKET_NAME=prepzer0testbucket

# Email (GoDaddy SMTP)
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=services@prepzer0.co.in
EMAIL_PASSWORD=...
```

## Critical Gotchas & Patterns

### Database Quirks
- **Collection name mismatch**: ActiveSession model → `activitytrackers` collection
- **CurrentSemester is virtual**: Calculated from USN year unless `currentSemesterOverride` is set
- **PartialSubmission unique index**: Only one partial submission per student per exam
- **ActivityTracker TTL**: 7-day auto-cleanup via MongoDB TTL index

### Authentication Gotchas
- **Passport username field is `email`**: Not typical 'username'
- **Teachers need dual approval**: `active: true` (email verified) AND `userallowed: true` (admin approved)
- **Session validation only for students**: Teachers/admins can use multiple devices

### File Upload Requirements
- **Image magic bytes required**: Not just MIME type, actual file signature validation
- **Three separate upload configs**: CSV (disk), Images (memory→S3), Excel (memory)
- **S3 server-side encryption**: AES256 enabled

### Controller Naming Convention
Controllers use `getcontrol` and `postcontrol` method names (not camelCase):
```javascript
exports.getcontrol = async (req, res) => { ... }
exports.postcontrol = async (req, res) => { ... }
```

### Recent Critical Fixes (October 2025)

**Dark Mode Toggle (test3.ejs)**:
- Function must be defined BEFORE DOMContentLoaded (line 2354)
- Returning students need separate initialization (line 2483)
- Changed from `<div>` to `<button>` for better event handling

**Submission Evaluation Bug**:
- Fixed: Answer indices compared with text values (type mismatch)
- Files: dashboardcontroller.js (lines 435-467), reportModel.js (lines 268-309)

**Answer Restoration Bug**:
- Fixed: Only one answer showing when students return
- Files: dashboardcontroller.js (lines 204-236, 306-333), test3.ejs (lines 2442-2444)

**Security Vulnerability**:
- Fixed: eval() function with user input in evaluationService.js line 542

## When Making Changes

### Before modifying User model:
- Consider impact on single-device enforcement (currentSessionId)
- Consider impact on semester calculation (CurrentSemester virtual)
- Check for orphaned references if deleting users with submissions

### Before modifying Exam model:
- Test pre-save validation (departments+semester vs excelCandidates)
- Update exam eligibility queries in dashboardcontroller
- Check ExamCandidate associations

### Before modifying session logic:
- Remember: only affects students on exam routes
- Test multi-device access for teachers/admins
- Verify SESSION_SECRET and SESSION_CRYPTO_SECRET set

### Before modifying file uploads:
- Update magic bytes validation if adding new file types
- Check S3 bucket permissions for new paths
- Verify file size limits in config/upload.js

### Before modifying exam page (test3.ejs):
- JavaScript functions must be defined BEFORE they're called in DOMContentLoaded
- Test with BOTH new students AND returning students (with saved answers)
- Check both light mode and dark mode for proper contrast

## Partial Submission System

**Auto-Save Timing**: Initial save after 5 seconds, then every 30 seconds
- Compound index: `{ exam: 1, student: 1 }` (unique)
- Tracks `timeRemaining`, `lastSavedAt`, `examStartedAt`
- Allows students to resume exams after disconnection

## Additional Documentation

- `scripts/README.md` - Database scripts documentation
- `test/README.md` - Testing automation guide
- `BULK_STUDENT_UPLOAD_FEATURE.md` - Bulk upload guide
- `ATTENDANCE_TRACKING_FEATURE.md` - Attendance tracking
- `SECURITY_AUDIT.md` - Security assessment
- `SECURITY_FIX_REPORT.md` - October 2025 security fixes
- `ANSWER_RESTORATION_FIX.md` - Answer restoration bug fix
- `PARTIAL_SUBMISSION_ENHANCEMENT.md` - Partial submission improvements
- `SUBMISSION_BUG_FIX.md` - Submission evaluation bug fix