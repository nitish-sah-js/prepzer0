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
   - MIME types: `text/csv`, `application/csv`, `text/comma-separated-values`, `application/vnd.ms-excel`
   - Extension validation: `.csv` only
2. **Images**: Integrity monitoring, 2MB max, memory → S3
   - MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
   - Extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
   - Magic bytes verified in app.js (PNG: 89504e47, JPEG: ffd8ff*, GIF: 47494638, WebP: 52494646)
3. **Excel**: Exam candidates, 10MB max, memory storage
   - MIME types: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx), `application/vnd.ms-excel` (.xls)
   - Extensions: `.xlsx`, `.xls`

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
| dashboardcontroller | Student exam interface, submission, auto-scoring, partial submission auto-save |
| admincontroller | Teacher/admin dashboard, student management |
| examcontroller | Exam CRUD, validation, candidate management |
| dbQuestionsController | Question bank, dynamic classification |
| bulkStudentController | CSV student upload |
| activeSessionController | Real-time activity tracking |
| reportController | Exam reports and analytics |
| departmentcontroller | Department CRUD operations |

## Integrity Monitoring (views/test3.ejs)

Client-side events → POST `/update-integrity`:
- Tab changes, window focus loss
- Copy/paste attempts
- Fullscreen exit, mouse exit
- Camera captures → POST `/save-image` → S3

## Important API Endpoints (app.js)

These endpoints are defined directly in app.js (not in route files):

### Session & Authentication
- `GET /logout` - Clears session, regenerates session ID, clears `currentSessionId` (students only)
- `GET /api/check-session` - Returns JSON: `{valid: true/false, reason: string}`
  - Used by client to verify if session is still valid
  - Reasons: `not_authenticated`, `user_not_found`, `session_mismatch`

### Integrity Monitoring
- `POST /update-integrity` - Records integrity violations
  - Body: `{examId, userId, eventType}`
  - eventType: `tabChanges`, `mouseOuts`, `fullscreenExits`, `copyAttempts`, `pasteAttempts`, `focusChanges`
  - Uses `$inc` to increment violation count, sets `lastEvent`
  - Creates document with `upsert: true` if doesn't exist

- `POST /save-image` - Uploads integrity camera captures to S3
  - Middleware: `imageUpload.single('image')`, `handleUploadError`
  - Body: `{userId, examId}` + image file
  - Validates: ObjectId format, file magic bytes (PNG/JPEG/GIF/WebP)
  - S3 path: `integrity/{usn}/{examId}/captured-{random}.{ext}`
  - Returns: `{success: bool, message: string, path: string}`
  - Server-side encryption: AES256

## Environment Variables

```env
# Server
PORT=80                      # Server port
NODE_ENV=production         # Environment mode

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

## Database Management Scripts

```bash
# Maintenance
npm run cleanup:sessions     # Clean orphaned ActivityTracker/Submissions
npm run audit:database       # Database integrity check
npm run clean:database       # Full database cleanup/reset

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

## Recent UI/UX Improvements (2025)

### Exam Page (test3.ejs)
**Dark Mode Toggle Fix**:
- Issue: Toggle button not working due to function hoisting issue
- Fix: Moved `setupDarkModeToggle()` function definition before `DOMContentLoaded` event listener (line 2354)
- Added call for returning students (line 2483) and new students (line 3012)
- Changed from `<div>` to `<button>` element for better event handling (line 800)
- Used direct `onclick` property instead of `addEventListener` for reliability

**Light Mode Visibility**:
- Fixed white text on white background issue
- Changed question/section titles from `#fff` to `#1f2937` (lines 34-48)
- Added proper contrast for all text elements (p, li, span, div, strong, b)
- Added dark theme overrides (lines 4031-4058) to maintain readability in dark mode

**Question Header Contrast**:
- Enhanced `.question-number` styling: pure white (#ffffff), bold (700), larger (1.1rem), text-shadow (line 222-228)
- Added dark theme specific styling for question headers (lines 4096-4103)
- Ensures "Question N" text is clearly visible against blue background in both themes

### Student Management (allstudentsprofile.ejs, admincontroller.js)
**Dynamic Department Loading**:
- Fixed edit modal to show latest departments from database instead of hardcoded values
- Added `Department` model import to admincontroller.js (line 13)
- Modified `allStudents` function to fetch and pass departments (lines 174-255)
- Implemented case-insensitive department matching in edit modal (lines 714-724)

**Bulk Delete Functionality**:
- Added separate bulk delete button with checkbox selection (lines 628-667)
- Implemented safety checks: prevents deleting students with exam submissions
- Added confirmation dialog requiring "DELETE" input for bulk operations
- New routes: `DELETE /admin/students/:studentId/delete`, `POST /admin/students/bulk-delete`
- Uses MongoDB aggregation to check for related submissions before deletion

### Security Fixes
**IDOR Vulnerability (activeSessionController.js)**:
- Fixed: Using `req.user._id` instead of accepting `userId` from request body (lines 9, 80)
- Prevents students from manipulating other students' activity records
- Security comment added: `// SECURITY FIX: Use authenticated user's ID only`

## Partial Implementations & Recent Features

**Partial Submissions (PartialSubmission.js)**:
- Auto-save exam progress every 30 seconds
- Compound index: `{ exam: 1, student: 1 }` (unique)
- Tracks `timeRemaining`, `lastSavedAt`, `examStartedAt`
- Static method: `cleanupOldPartials(daysOld)` - removes submissions older than N days
- Allows students to resume exams after disconnection

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
- Check `public/css/style.css` generated from `public/css/landing.css`

### Dark Mode Toggle Not Working (test3.ejs)
- Check if `setupDarkModeToggle()` function is defined BEFORE DOMContentLoaded
- Verify function is called for BOTH new students and returning students (with saved answers)
- Ensure button element exists: `<button id="darkModeToggle">`
- Check browser console for "Dark mode toggle initialized" message
- Common issue: Function hoisting - function must be defined before it's called in event handlers

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
  2. Security: mongoSanitize, HPP, XSS
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

### Route Structure
```
routes/
├── home.js           → "/" - Landing page, home routes
├── authenticate.js   → "/authenticate" - Login, signup, password reset
├── dashboard.js      → "/dashboard" - Student exam interface (requireStudent)
├── admin.js          → "/admin" - Teacher/admin panel (requireAdmin)
├── supadmin.js       → "/supadmin" - Super admin panel (requireSuperAdmin)
├── profile.js        → "/profile" - User profile management
└── userauth.js       → "/user" - User authentication utilities
```

**Route-to-Controller Mapping**:
- `/authenticate/*` → authenticatecontroller
- `/dashboard/*` → dashboardcontroller, activeSessionController
- `/admin/*` → admincontroller, examcontroller, dbQuestionsController, bulkStudentController, departmentcontroller, reportController
- `/supadmin/*` → supadmin controller
- `/profile/*` → profilecontroller
- `/` → homecontroller

### Database Collection Names (Important for Queries)
Some models have different collection names than their model names:
- `ActiveSession` model → `activitytrackers` collection
- `User` model → `users` collection
- `Exam` model → `exams` collection

### Role-Based Access Control Patterns (middleware/auth.js)
```javascript
// Student routes (single-device enforced on exam routes)
/dashboard                → requireStudent
/dashboard/test/*         → requireStudent + validateSingleSession

// Teacher/Admin routes (multi-device allowed)
/admin                    → requireAdmin (allows both 'admin' and 'teacher' usertype)
/admin/create_exam        → requireAdmin

// Super Admin routes
/supadmin                 → requireSuperAdmin (usertype='admin' AND admin_access=true)

// API versions (return JSON instead of rendering views)
requireAuthAPI            → 401 JSON if not authenticated
requireAdminAPI           → 401/403 JSON for admin/teacher access
```

**Middleware Functions**:
- `requireAuth` - Any authenticated user, redirects to `/authenticate/login`
- `requireAdmin` - Admin OR Teacher, redirects to `/admin/login`, 403 error page for wrong role
- `requireStudent` - Students only, redirects to `/authenticate/login`, 403 error page for wrong role
- `requireSuperAdmin` - Admin with `admin_access: true`, redirects to `/admin/login`
- `requireAuthAPI` / `requireAdminAPI` - Same as above but returns JSON responses

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

// Partial submission auto-save (test3.ejs)
Every 30 seconds: Auto-saves exam progress to PartialSubmission
  → Saves mcqAnswers, codingAnswers, timeRemaining
  → Updates lastSavedAt timestamp
  → Allows resuming exam after disconnection

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
5. **Image upload requires magic bytes** - Not just MIME type validation (double validation in multer + app.js)
6. **Passport username field is `email`** - Not typical 'username'
7. **ActivityTracker has 7-day TTL** - Auto-cleanup via MongoDB TTL index
8. **Teachers need two approvals** - Both `active: true` (email verified) AND `userallowed: true` (admin approved)
9. **PartialSubmission has unique compound index** - Only one partial submission per student per exam
10. **File upload configurations are separate** - CSV (disk storage), Images (memory→S3), Excel (memory)
11. **Session storage uses MongoDB with encryption** - `SESSION_CRYPTO_SECRET` encrypts session data
12. **Client session validation** - `/api/check-session` endpoint for real-time session validity checks
13. **Dark mode toggle requires early function definition** - Must be defined before DOMContentLoaded (test3.ejs line 2354)
14. **Returning students need separate initialization** - Students with saved answers bypass normal setup, need explicit dark mode call (line 2483)
15. **Department dropdown case sensitivity** - Edit modal uses case-insensitive matching for backward compatibility with old data
16. **Bulk delete safety** - Students with submissions cannot be deleted to prevent orphaned data

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
- Update magic bytes validation if adding new file types (both in config/upload.js and app.js)
- Check S3 bucket permissions for new paths
- Verify file size limits in config/upload.js
- Update handleUploadError middleware for custom error messages

**Before modifying logout flow:**
- Remember: only students have `currentSessionId` cleared on logout (app.js:192-224)
- Session is regenerated on logout to prevent session fixation
- Teacher/admin logout does NOT clear `currentSessionId` (they don't use single-device enforcement)

**Before modifying authentication:**
- Passport deserializeUser returns `done(null, false)` if user not found (not an error)
- This prevents server crashes when deleted users have active sessions
- Login validation is in Passport LocalStrategy (app.js:114-163), not in controllers

**Before modifying exam page (test3.ejs):**
- JavaScript functions must be defined BEFORE they're called in DOMContentLoaded
- Test with BOTH new students (first time) AND returning students (with saved answers)
- Returning students bypass the start overlay and need separate initialization
- Check both light mode and dark mode for proper contrast and visibility
- Test all interactive elements (buttons, toggles) work in both themes
- Consider CSS specificity: dark theme overrides must be specific enough to override base styles