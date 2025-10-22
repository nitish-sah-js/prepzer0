# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
# Start development
npm start                    # Start with nodemon (auto-reload)
npm run build:css           # Build and watch Tailwind CSS

# Database management
npm run seed:departments    # Initialize department data
npm run cleanup:sessions    # Clean orphaned sessions
npm run audit:database      # Audit database integrity

# Testing
cd test && python create_test_accounts.py    # Create test accounts
cd test && python test_chrome.py             # Run Selenium tests
```

## Application Overview

PrepZer0 is an online examination platform built with Node.js, Express, and MongoDB. It features MCQ-based exams with real-time integrity monitoring, multi-role user management (students, teachers, admins), and single-device login enforcement for exam security.

**Core Features**:
- MCQ exam creation with department/semester targeting or Excel candidate upload
- Real-time integrity monitoring with camera capture and behavior tracking
- Single-device login enforcement for students during exams
- Automated scoring and assessment reports
- Dynamic department management system
- Email notifications and exam reminders
- Bulk student account creation via CSV upload
- Secure file uploads (CSV, Excel, Images) with AWS S3 integration

## Architecture Overview

### Application Entry Points
```
server.js (HTTP server, exam reminder scheduling)
  └─→ app.js (Express configuration, middleware, routes, S3 setup)
```

**Key Directories**:
- `/controllers/` - Business logic (16 controllers)
- `/routes/` - Express route handlers (7 route files)
- `/models/` - Mongoose schemas (13 models)
- `/views/` - EJS templates (40+ view files)
- `/middleware/` - Custom middleware (auth, session validation)
- `/utils/` - Helper functions (semester calculator, email, S3 uploader)
- `/config/` - Configuration (upload settings)
- `/scripts/` - Database management utilities
- `/public/` - Static assets (CSS, JS, images)
- `/templates/` - CSV templates for bulk uploads

### Critical Models

**User** (`usermodel.js`):
- Student/teacher/admin roles with USN-based identification
- Stores `currentSessionId` for single-device enforcement
- Uses passport-local-mongoose for authentication
- Has `CurrentSemester` virtual field that auto-calculates from USN

**Exam** (`Exam.js`):
- Dynamic validation: departments/semester required OR Excel candidates allowed
- Pre-save hooks enforce configuration validity

**ExamCandidate** (`ExamCandidate.js`):
- Links students to exams via USN
- Note: `source` field (e.g., 'excel') used in code but not in schema (added dynamically)

**Submission** (`SubmissionSchema.js`):
- Auto-calculated scores on submission
- References User and Exam models

**Integrity** (`Integrity.js`):
- Tracks exam violations (tab changes, mouse exits, copy/paste attempts, etc.)
- Stores violation counts and last event metadata

**ActiveSession** (`ActiveSession.js`):
- Real-time activity tracking during exams
- Collection name: 'activitytrackers'

**MCQ** (`MCQschema.js`) vs **MCQQuestion** (`MCQQuestion.js`):
- `MCQ`: Questions linked to specific exams (4 options, marks, correct answer)
- `MCQQuestion`: Reusable question bank with classification and difficulty levels
- Collection name for question bank: 'allmcqquestions'

**Department** (`Department.js`):
- Dynamic department management (replaces hardcoded enums)
- Stores: code (unique), name, fullName, description, active status

## Authentication & Session Management

### Passport Configuration (app.js:113-162)
- Local strategy using email as username
- Three user types: student, teacher, admin
- Teacher requirements: `active: true` (email verified) AND `userallowed: true` (admin approved)
- Admin requirement: `admin_access: true`

### Session Configuration (app.js:71-91)
- MongoDB store with connect-mongo
- 24-hour session expiry
- Session encryption with `SESSION_CRYPTO_SECRET`
- Secure cookies (httpOnly, sameSite: lax)
- touchAfter optimization (24-hour update throttle)

### Single-Device Login Enforcement
Implementation in `middleware/sessionValidator.js`:
1. On login: store `req.sessionID` in `user.currentSessionId` (authenticatecontroller.js:106)
2. During exam: middleware checks if `user.currentSessionId === req.sessionID`
3. On mismatch: force logout with session regeneration
4. On logout: clear `currentSessionId` for students only (app.js:195-206)
5. Applies to: `/dashboard/test/*`, `/api/check-session`
6. Excluded: `/authenticate/login`, `/authenticate/signup`, `/logout`
7. Teachers/admins bypass this check (multi-device login allowed)

## Exam System Flow

### Student Exam Flow
```
Start Exam (GET /dashboard/start-test/:examId)
  ↓
sessionValidator checks currentSessionId match
  ↓
Check eligibility: (department AND semester match) OR (ExamCandidate entry exists)
  ↓
Render test3.ejs with questions
  ↓
Client-side integrity monitoring starts
  ↓
Periodic pings to /dashboard/see-active (update ActiveSession)
  ↓
Submit (POST /dashboard/submit-test)
  ↓
Auto-calculate MCQ scores (correct answers × marks)
  ↓
Save Submission document
  ↓
Redirect to dashboard
```

### Exam Reminder Scheduling (server.js:12)
```
Server startup
  ↓
scheduleAllExamReminders() (utils/examreminder.js)
  ↓
Find all future non-draft exams
  ↓
Schedule job 15 minutes before each exam's scheduledAt time
  ↓
At trigger: find eligible students, send email via Nodemailer
```

### Scoring Logic (dashboardcontroller.js)
```javascript
// MCQ auto-scoring on submission
for each answer submitted:
  if (selectedOption === question.correctAnswer) {
    totalScore += question.marks
  }
// Score stored in Submission immediately
```

## File Upload & S3 Integration

### Upload Configuration (config/upload.js)
Three upload types with validation:
1. **CSV Upload** (`csvUpload`): MCQ questions, 5MB max, MIME/extension validation
2. **Image Upload** (`imageUpload`): Integrity monitoring, 2MB max, memory storage, magic bytes verification
3. **Excel Upload** (`excelUpload`): Exam candidates, 10MB max, .xlsx/.xls validation

### Image Upload Security (app.js:300-395)
- Magic bytes verification (checks file signatures: PNG, JPEG, GIF, WebP)
- Secure random filename generation using crypto
- Server-side encryption (AES256) for S3 storage
- Stored at: `integrity/{usn}/{examId}/captured-{random}.{ext}`
- ObjectId format validation for userId/examId

### S3 Configuration (app.js:18-31)
- AWS SDK v3 (@aws-sdk/client-s3)
- Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME

## Integrity Monitoring

Implementation in `views/test3.ejs` (3,829 lines):
- **Client-side tracking**: tab changes, mouse exits, focus changes, copy/paste attempts, fullscreen exits
- **Server endpoint**: POST `/update-integrity` (app.js:259-298)
- **Event types**: tabChanges, mouseOuts, fullscreenExits, copyAttempts, pasteAttempts, focusChanges
- **Camera capture**: periodic screenshots uploaded to S3 via POST `/save-image`
- **Activity pings**: real-time status updates to `/dashboard/see-active`

## Key Routes & Endpoints

### Route Files
- `/` - Home routes (routes/home.js)
- `/dashboard` - Student dashboard and exam interface (routes/dashboard.js)
- `/admin` - Admin panel for exam management (routes/admin.js)
- `/authenticate` - Login/logout functionality (routes/authenticate.js)
- `/profile` - User profile management (routes/profile.js)
- `/supadmin` - Super admin functions (routes/supadmin.js)
- `/user` - User authentication routes (routes/userauth.js)

### Important Admin Routes
- `/admin/create_exam` - Create new exam
- `/admin/exam/:examId` - Edit exam
- `/admin/exam/candidates/:examId` - View candidates and submissions
- `/admin/exam/:examId/database` - Select questions from question bank
- `/admin/addbulckstudent` - Bulk student upload interface
- `/admin/download-student-template` - Download CSV template
- `/admin/departments` - Department management

### Global Routes (app.js)
- `/logout` - Clears session and currentSessionId for students
- `/api/check-session` - Validates current session for single-device enforcement
- `/update-integrity` - Records integrity violations during exams
- `/save-image` - Uploads integrity monitoring images to S3

## USN Format & Semester Calculation

### USN Structure
Format: `Location + Year + Department + RollNumber`
Example: `1BY22CS001` = `BY` + `22` + `CS` + `001`

### Automatic Semester Calculation
```javascript
// Example: USN "1BY22CS001" → year = 22 → admission year = 2022
admissionYear = 2000 + parseInt(usnYear)
yearsSinceAdmission = currentYear - admissionYear
baseSemester = yearsSinceAdmission * 2

// January-June: even semester (2, 4, 6, 8)
// July-December: odd semester (1, 3, 5, 7)
if (currentMonth 1-6): semester = baseSemester + 2
else: semester = baseSemester + 1
```

**Implementation** (utils/semesterCalculator.js):
- User model has `CurrentSemester` virtual field
- Auto-calculates from `Year` field in USN
- Virtual included in JSON output: `toJSON: { virtuals: true }`
- Access via `student.CurrentSemester` in controllers
- Falls back to stored `Semester` field when Year not available

## Department Management

Default departments (seed with `npm run seed:departments`):
- CS - Computer Science
- IS - Information Science
- EC - Electronics & Communication
- ET - Electronics & Telecommunication
- AI - Artificial Intelligence
- CV - Civil Engineering
- EE - Electrical Engineering
- AD - Automation & Robotics

**Dynamic Management**:
- Admin interface at `/admin/departments`
- CRUD operations via `departmentcontroller.js`
- User and Exam schemas no longer use hardcoded enums
- Teachers can be assigned to manage specific departments via `managedDepartments` field

## MCQ Question System

### Question Requirements
- Exactly 4 options required per question (enforced in schema)
- One correct answer (string matching one of the options)
- Difficulty levels: easy, medium, hard
- Classifications (enum): Data Structures, Algorithms, DBMS, Object-Oriented Programming, Networking, Operating Systems, Software Engineering, Mathematics, Artificial Intelligence, Machine Learning, UNIX, other

### Dynamic Classification Management
In question database selection page (`/admin/exam/{examId}/database`):
- **Add Classification Button**: Allows adding custom classifications on-the-fly
- **Modal Interface**: Clean UI for entering new classification names
- **Real-time Updates**: New classifications appear in filter dropdown and random selection
- **Duplicate Prevention**: Checks for existing classifications before adding
- **Session Persistence**: Custom classifications stored in-memory during session

**Implementation** (views/database_questions.ejs):
- Frontend: JavaScript event handlers with modal management (lines 448-595)
- API Endpoint: POST `/admin/exam/{examId}/database/classification/add`
- Controller: `dbQuestionsController.addClassification()` (lines 388-423)
- EJS rendering: `<%- JSON.stringify(classifications || []) %>` for safe rendering
- Proper event propagation prevention and comprehensive error handling

## Bulk Student Account Creation

Route: `/admin/addbulckstudent` (GET/POST)

**Features**:
- Upload CSV with student details: email, usn, department, semester (required) + fname, lname, phone, imageurl (optional)
- Set common password for all uploaded students
- Auto-approval: `userallowed: true`, `active: true` (no email verification needed)
- Automatic year extraction from USN (characters 4-5)
- Duplicate detection (skips existing emails/USNs)
- Detailed error reporting for invalid rows
- Download template at `/admin/download-student-template`

**CSV Format**:
```csv
email,usn,department,semester,fname,lname,phone,imageurl
student1@example.com,1BY22CS001,cs,1,John,Doe,9876543210,
```

**Validation**:
- Email: valid format, unique
- USN: valid format, unique
- Department: lowercase, must match existing department code
- Semester: integer 1-8
- Phone (optional): 10 digits
- Password: minimum 6 characters (shared across all students)

**Security**: All passwords hashed via bcrypt (passport-local-mongoose). Students should change password after first login.

See `BULK_STUDENT_UPLOAD_FEATURE.md` for detailed documentation.

## Email System

**Configuration** (utils/email.js):
- Nodemailer with GoDaddy SMTP (smtpout.secureserver.net:465)
- Templates in `utils/emailTemplates.js`
- Account verification emails (signup)
- Exam reminder emails (scheduled 15 minutes before exam)

**Environment Variables**:
```
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=services@prepzer0.co.in
EMAIL_PASSWORD=...
EMAIL_FROM=services@prepzer0.co.in
```

## Controllers & Responsibilities

- **authenticatecontroller.js**: Login, signup, email verification, session ID tracking, password reset
- **dashboardcontroller.js**: Student dashboard, exam rendering, answer submission, MCQ auto-scoring, eligibility checks
- **admincontroller.js**: Admin/teacher dashboard, student management, candidate viewing, exam reports, user approval
- **examcontroller.js**: Create/edit exams, validation logic, Excel candidate upload, department-based selection, individual candidate management
- **questioncontroller.js**: Add/edit/delete MCQ questions with validation
- **activeSessionController.js**: Track real-time activity pings, update ActiveSession status
- **reportController.js**: Generate assessment reports with detailed analysis
- **departmentcontroller.js**: CRUD operations for departments
- **bulkStudentController.js**: Bulk student account creation via CSV upload
- **allmcqcontroller.js**: MCQ question bank management
- **dbQuestionsController.js**: Database question management and classification handling
- **addMCQQuestions.js**: Bulk MCQ question import from CSV
- **profilecontroller.js**: User profile management and updates
- **homecontroller.js**: Landing page and public routes
- **supadmin.js**: Super admin functions (user management, system-wide operations)
- **userauthcontroller.js**: Additional user authentication utilities

## Middleware Chain (app.js)

Applied in this order:
1. Security: `mongoSanitize()`, `hpp()`, `xss()`
2. Body parsers (100MB limit for JSON and urlencoded)
3. Session configuration with MongoDB store
4. Flash messages for user feedback
5. Passport initialization and session
6. **Single-device session validator** (`validateSingleSession`) - globally applied

## Environment Variables Required

```env
PORT=80
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
DB_NAME=codingplatform
SESSION_SECRET=...
SESSION_CRYPTO_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=services@prepzer0.co.in
EMAIL_PASSWORD=...
EMAIL_FROM=services@prepzer0.co.in
```

## Database Management Scripts

All scripts in `/scripts/` directory:

```bash
npm run seed:departments      # Seed initial departments
npm run cleanup:sessions      # Clean orphaned ActivityTracker and Submission records
npm run clean:database        # Clean database (use with caution)
npm run audit:database        # Audit database integrity

# Manual scripts (run with node)
node scripts/create-admin.js              # Create admin user
node scripts/populate-students.js         # Populate test student data
node scripts/populate-mcq-questions.js    # Populate MCQ questions from JSON
node scripts/recalculate-scores.js        # Recalculate submission scores
node scripts/clearDepartments.js          # Remove all departments
```

See `scripts/README.md` for detailed documentation.

## Orphaned Data Handling

When User records are deleted while having active sessions or submissions:

- **Orphaned ActivityTracker sessions**: Automatically marked as offline by cleanup script
- **Orphaned Submissions**: Displayed with "[DELETED USER]" placeholder in admin views, but submission data (scores, timestamps) preserved
- **Best practice**: Implement soft deletes for User records instead of hard deletes if they have submissions

Run `npm run cleanup:sessions` to identify and clean orphaned records.

## Testing

### Python-based Selenium Testing (in /test/ directory)
```bash
cd test
pip install -r requirements.txt
python create_test_accounts.py    # Create test student accounts
python cleanup_test_accounts.py   # Remove test accounts
python test_chrome.py             # Run Selenium WebDriver tests

# Quick test setup (Linux/Mac)
./setup.sh                        # Install dependencies
./quick_test.sh                   # Run quick test
```

**No Node.js test framework configured** - implement tests as needed using your preferred library (Jest, Mocha, etc.).

## Known Limitations & Partial Implementations

### Current Limitations
- Only MCQ exams fully supported
- No automated Node.js test suite (manual Selenium testing only)
- Helmet.js security headers commented out in `app.js:56`
- No pagination on large data views (exam candidates, submissions)

### Partial Implementations
**Coding Exams**:
- Models exist: `CodingQuestion.js`, `Codingschema.js`
- Views exist: `add_coding.ejs`, `edit_coding.ejs`, `sel_coding_db.ejs`
- Missing: Controller logic, route handlers, code execution environment, test case validation

**Services Layer**:
- `/services/` directory exists but empty
- Planned for business logic abstraction
- Would separate controller logic from data access

## Troubleshooting Common Issues

### MongoDB Connection Issues
- Verify `MONGODB_URI` in `.env` is correct
- Check if MongoDB service is running
- Ensure IP whitelist in MongoDB Atlas includes your IP

### Session Issues
- Clear browser cookies if getting unexpected logouts
- Check `SESSION_SECRET` and `SESSION_CRYPTO_SECRET` are set
- Verify MongoDB session store is connected

### File Upload Failures
- Ensure AWS credentials are correctly set in `.env`
- Verify S3 bucket permissions allow uploads
- Check file size limits in `config/upload.js`

### Email Not Sending
- Verify SMTP credentials in `.env`
- Check if port 465 is not blocked
- Ensure `EMAIL_FROM` matches authenticated email

### CSS Not Updating
- Run `npm run build:css` to rebuild Tailwind CSS
- Clear browser cache
- Check if `landing.css` has your changes

### Classification Button Not Working
If "Add Classification" button doesn't open modal:
- Check browser console for JavaScript errors
- Verify classifications data: `console.log(<%- JSON.stringify(classifications || []) %>)`
- Ensure modal element exists: `document.getElementById('addClassificationModal')`
- Check event listener attachment in console logs
- Clear browser cache and reload
- Verify route exists: POST `/admin/exam/{examId}/database/classification/add`

## Security Considerations

When working with this codebase:

1. **File Upload Security**: Always use configured upload middleware from `config/upload.js`
2. **Session Management**: Never bypass `sessionValidator` middleware for exam routes
3. **User Deletion**: Implement soft deletes instead of hard deletes to prevent orphaned submissions
4. **Environment Variables**: Never commit `.env` files or expose sensitive credentials
5. **Magic Bytes Validation**: Image uploads use magic bytes verification in addition to MIME type checks
6. **S3 Security**: All S3 uploads use server-side encryption (AES256)

## Additional Documentation

- `SECURITY_AUDIT.md` - Security audit documentation
- `SECURITY_FIXES_APPLIED.md` - Record of security patches
- `BULK_STUDENT_UPLOAD_FEATURE.md` - Detailed guide for bulk student account creation
- `scripts/README.md` - Documentation for database management scripts
- `templates/student_upload_template.csv` - Sample CSV template for bulk uploads

## Recent Changes & Git Status

Current branch: `main`

Modified files (not committed):
- `controllers/admincontroller.js`
- `controllers/dbQuestionsController.js`
- `models/MCQQuestion.js`
- `models/MCQschema.js`
- `models/usermodel.js`
- `routes/admin.js`
- `views/allstudentsprofile.ejs`
- `views/database_questions.ejs`
- `views/departments.ejs`
- `views/student_exam_history.ejs`

Untracked file: `nul`

Recent commits:
- `3551d61` - added export features and edit students profile
- `7fc4c81` - added the semester upgrade system manually and show not submitted for not submitted students
- `c141bd6` - addBulkStudent feature added

**Note**: When making commits, follow existing commit message style (lowercase, descriptive, concise).
