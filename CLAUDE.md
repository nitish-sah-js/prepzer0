# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

PrepZer0 is a comprehensive online examination platform built with Node.js, Express, and MongoDB. It supports MCQ-based exams with real-time integrity monitoring, multi-role user management (students, teachers, admins), and single-device login enforcement for exam security.

**Key Features**:
- MCQ exam creation with department/semester targeting or Excel candidate upload
- Real-time exam integrity monitoring with camera capture and behavior tracking
- Single-device login enforcement for students during exams
- Automated scoring and assessment reports
- Dynamic department management system
- Email notifications and exam reminders
- Comprehensive admin dashboard for teachers and administrators
- Secure file uploads with validation (CSV, Excel, Images)
- Bulk student account creation via CSV upload

## Development Commands

### Starting the Application
```bash
npm start              # Start with nodemon (development)
node server.js         # Direct start (production)
```

### CSS Build Process
```bash
npm run build:css      # Build and watch Tailwind CSS (development)
```

### Database Management Scripts
```bash
npm run seed:departments      # Seed initial departments (CS, IS, EC, ET, AI, CV, EE, AD)
npm run cleanup:sessions      # Identify and cleanup orphaned ActivityTracker and Submission records
npm run clean:database        # Clean database (use with caution)
npm run audit:database        # Audit database integrity
```

Additional utility scripts in `/scripts/` directory:
- `create-admin.js` - Create admin user
- `populate-students.js` - Populate test student data
- `populate-mcq-questions.js` - Populate MCQ questions from JSON
- `recalculate-scores.js` - Recalculate submission scores

See `scripts/README.md` for detailed documentation on each script.

### Environment Setup
- Create `.env` file with required environment variables
- MongoDB connection string is configured in `app.js`
- AWS S3 credentials needed for file uploads and integrity monitoring

## Architecture

### Core Structure
- **Entry Point**: `server.js` (HTTP server setup, port binding, exam reminder scheduling) → `app.js` (Express app configuration)
- **Models**: Mongoose schemas in `/models/` directory (13 models)
- **Controllers**: Business logic in `/controllers/` directory (16 controllers)
- **Routes**: Express route handlers in `/routes/` directory (7 route files)
- **Views**: EJS templates in `/views/` directory (40+ view files)
- **Utils**: Helper functions in `/utils/` directory (6 utility files)
  - `semesterCalculator.js` - Automatic semester calculation from USN
  - `examreminder.js` - Scheduled exam reminder emails
  - `email.js` / `emailTemplates.js` - Email sending and templates
  - `s3Uploader.js` - AWS S3 upload utilities
  - `apifeatures.js` - API utility features
- **Middleware**: Custom middleware in `/middleware/` directory
  - `sessionValidator.js` - Single-device login enforcement
  - `auth.js` - Authentication middleware
- **Config**: Configuration files in `/config/` directory
  - `upload.js` - Secure file upload configurations (CSV, Image, Excel)
- **Scripts**: Database management and utility scripts in `/scripts/` directory
- **Public**: Static assets (CSS, JS, images) in `/public/` directory
- **Templates**: CSV templates for bulk uploads in `/templates/` directory

### Key Models
- **User** (`usermodel.js`): Student/teacher/admin with USN-based identification. Stores `currentSessionId` for single-device enforcement. Uses passport-local-mongoose for authentication
- **Exam** (`Exam.js`): Exam configuration with dynamic validation for Excel vs department-based candidate selection
- **ExamCandidate** (`ExamCandidate.js`): Links users to specific exams via USN. Note: 'source' field (e.g., 'excel') is used in code but not in schema
- **Submission** (`SubmissionSchema.js`): Stores exam submissions with auto-calculated scores. References User, Exam models
- **Integrity** (`Integrity.js`): Tracks integrity violations during exams with violation counts and last event metadata
- **ActiveSession** (`ActiveSession.js`): Monitors user activity during exams with status tracking (online/offline)
- **MCQ** (`MCQschema.js`): Individual MCQ questions linked to specific exams with marks and correct answers (4 options)
- **MCQQuestion** (`MCQQuestion.js`): Reusable question bank with classification, difficulty levels, and topic tags
- **Department** (`Department.js`): Dynamic department management system (replaces hardcoded enums)
- **CodingQuestion** (`CodingQuestion.js`) / **Codingschema** (`Codingschema.js`): Future coding exam support (models exist, feature not fully implemented)
- **EvaluationResultSchema** (`EvaluationResultSchema.js`): Stores evaluation results for exams
- **reportModel** (`reportModel.js`): Assessment report data model

### Authentication & Authorization
- Passport.js with local strategy using email as username (configured in `app.js` lines 113-162)
- Three user types: student, teacher, admin
- Email verification required for teachers (`active: true` check)
- Teachers require both email verification AND admin approval (`userallowed: true`) to access platform
- Admin users require `admin_access: true` to login
- Session management with MongoDB store (`connect-mongo`) including:
  - 24-hour session expiry
  - Session encryption with `SESSION_CRYPTO_SECRET`
  - Secure cookies (httpOnly, sameSite: lax)
  - touchAfter optimization (24-hour update throttle)

### Exam System
- Currently supports MCQ questions only (4 options required per question)
- Dynamic candidate selection: department/semester-based OR Excel upload
- Student eligibility determined by OR logic: (department AND semester match) OR (explicit ExamCandidate entry)
- Integrity monitoring with camera capture and behavior tracking
- Real-time activity tracking during exams
- Automated exam reminders sent 15 minutes before scheduled start using node-schedule
- Automatic MCQ scoring on submission (sum of marks for correct answers)

### File Upload & Storage
- AWS S3 integration for file storage configured in `app.js` using AWS SDK v3 (`@aws-sdk/client-s3`)
- Multer for handling multipart/form-data with secure configurations in `config/upload.js`
- Three upload types with validation:
  - **CSV Upload** (`csvUpload`): MCQ questions, 5MB max, validates MIME types and extensions
  - **Image Upload** (`imageUpload`): Integrity monitoring, 2MB max, memory storage for S3, validates via MIME and magic bytes
  - **Excel Upload** (`excelUpload`): Exam candidates, 10MB max, validates `.xlsx` and `.xls` files
- Image capture for integrity monitoring stored in S3 at `integrity/{usn}/{examId}/captured-{random}.{ext}`
- All uploads include file size limits, MIME type validation, and secure random filename generation
- Image upload endpoint at `/save-image` validates ObjectId format and uses magic bytes verification (file signatures) for additional security

### Department Management System
- Dynamic department CRUD operations via admin interface at `/admin/departments`
- Department model stores: code (unique), name, fullName, description, active status
- Replaces hardcoded department enums in User and Exam schemas
- Seed initial departments with `npm run seed:departments`
- Teachers can be assigned to manage specific departments via `managedDepartments` field in User model
- Controller: `departmentcontroller.js`

### Frontend
- EJS templating engine with views in `/views/` directory
- Tailwind CSS with custom configuration (`tailwind.config.js` includes custom colors, animations, fonts)
- CSS build process: `npm run build:css` watches and compiles `landing.css` → `style.css`
- Static assets served from `/public/` directory
- Client-side JavaScript for exam interface and integrity monitoring
- Key views:
  - `test3.ejs` - Primary exam interface with integrity monitoring and camera capture
  - `dashboard.ejs` - Student dashboard showing available exams
  - `admin.ejs` - Teacher/admin dashboard with exam management
  - `exam_candidates.ejs` - View exam candidates and submissions (handles orphaned data)
  - `bulk_student_upload.ejs` - Bulk student account creation interface
  - `departments.ejs` / `manage_departments.ejs` - Department management interface
  - `create_exam.ejs` / `edit_exam.ejs` - Exam creation and editing forms
  - `add_mcq.ejs` / `edit_mcq.ejs` - MCQ question management
  - `allMCQQuestion.ejs` / `database_questions.ejs` - Question bank views
  - `profile.ejs` / `profile_edit.ejs` - User profile management
  - `assessment_report.ejs` - Exam assessment reports

## Database Schema Notes

### User Schema (USN Format)
USN format: `location + Year + Department + RollNumber`
Example: `1BY22CS001` = `BY + 22 + CS + 001`

Default departments (managed via Department model): `["cs", "is", "ec", "et", "ai", "cv", "ee", "ad"]`
- CS - Computer Science
- IS - Information Science
- EC - Electronics & Communication
- ET - Electronics & Telecommunication
- AI - Artificial Intelligence
- CV - Civil Engineering
- EE - Electrical Engineering
- AD - Automation & Robotics

Departments are now dynamically managed through the Department model and admin interface at `/admin/departments`. User and Exam schemas no longer use hardcoded enums for departments.

### ExamCandidate Schema
The ExamCandidate model links students to exams via USN. Fields:
- `exam` (ObjectId, required) - Reference to Exam
- `student` (ObjectId, optional) - Reference to User (populated after student registers)
- `usn` (String, required) - Student USN
- `isAdditional` (Boolean) - Marks manually added individual candidates
- `createdAt` (Date) - Timestamp

**Note**: The `source` field (e.g., 'excel') is used throughout the codebase (particularly in `examcontroller.js`) but is not defined in the schema. This field is added dynamically in controller logic to distinguish Excel-uploaded candidates from department-based or individually-added candidates.

### Exam Schema Dynamic Validation
The Exam model uses pre-save hooks with intelligent validation logic:
- If exam has Excel-based candidates: departments and semester fields are optional
- If exam uses department/semester selection: departments and semester are required
- This prevents invalid exam configurations while allowing flexible candidate selection methods

### Semester Calculation (Automatic)
Students' current semester is calculated dynamically based on USN year component:
```javascript
// Example USN: 1BY22CS001 → year = 22 → admission year = 2022
admissionYear = 2000 + parseInt(usnYear)
yearsSinceAdmission = currentYear - admissionYear
baseSemester = yearsSinceAdmission * 2

// January-June: even semester (2, 4, 6, 8)
// July-December: odd semester (1, 3, 5, 7)
if (currentMonth 1-6): semester = baseSemester + 2
else: semester = baseSemester + 1
```

**Implementation Details**:
- User model has a `CurrentSemester` virtual field that auto-calculates from `Year` field
- Virtual field is included in JSON/Object output (`toJSON: { virtuals: true }`)
- Access via `student.CurrentSemester` in controllers (see `dashboardcontroller.js:28`)
- Fallback to stored `Semester` field for non-students or when Year is not set
- Functions: `calculateCurrentSemester()`, `calculateInitialSemester()`, `getCurrentAcademicTerm()` in `utils/semesterCalculator.js`

## Security Features

- Rate limiting with express-rate-limit
- Input sanitization with express-mongo-sanitize
- XSS protection with xss-clean
- HPP (HTTP Parameter Pollution) protection
- Helmet.js security headers (commented out)
- Session encryption and secure cookie configuration
- Single-device login enforcement for students during exams (see below)

### Single-Device Login Enforcement
Students can only access exams from one device at a time. Implementation in `middleware/sessionValidator.js`:
- On login (`authenticatecontroller.js`): store `req.sessionID` in user's `currentSessionId` field
- During exam: middleware checks if `user.currentSessionId === req.sessionID`
- If mismatch: force logout with error message "You have been logged out because you logged in from another device during an exam"
- Session cleared on logout only for students (line 198 in `app.js`)
- Only applies to student exam routes (`/dashboard/test/*`, `/api/check-session`)
- Teachers and admins bypass this check (can login from multiple devices)
- Excluded paths: `/authenticate/login`, `/authenticate/signup`, `/logout`
- Session validation includes session regeneration on mismatch for complete cleanup

## Integrity Monitoring

The platform includes comprehensive exam integrity features implemented in `views/test3.ejs`:
- **Client-side event tracking**: tab changes, mouse exits, focus changes, copy/paste attempts, fullscreen exits
- **Server-side logging**: violations stored in Integrity model via `/update-integrity` endpoint (app.js:252-291)
- **Camera capture**: periodic screenshots (if enabled) uploaded to S3 via `/save-image` endpoint with:
  - Magic bytes verification for image validation (checks file signatures)
  - Secure random filename generation using crypto
  - Server-side encryption (AES256) for S3 storage
  - Stored at `integrity/{usn}/{examId}/captured-{random}.{ext}`
- **Activity tracking**: real-time pings to `/dashboard/see-active` endpoint store status in ActiveSession model
- **Violation metadata**: stores last violation type, timestamp, and cumulative counts per violation type
- Event types tracked: `tabChanges`, `mouseOuts`, `fullscreenExits`, `copyAttempts`, `pasteAttempts`, `focusChanges`

## Critical Architectural Patterns

### Request Flow During Exam
```
Student clicks "Start Exam"
  → GET /dashboard/start-test/:examId (dashboardcontroller.js)
  → sessionValidator middleware checks currentSessionId match
  → Check exam eligibility (department/semester OR ExamCandidate entry)
  → Render test3.ejs with exam questions
  → Client-side integrity monitoring begins
  → Periodic pings to /dashboard/see-active update ActiveSession
  → Student submits answers
  → POST /dashboard/submit-test
  → Auto-calculate MCQ scores (correct answers × marks)
  → Save Submission document
  → Redirect to dashboard
```

### Exam Reminder Scheduling Flow
```
Server startup (server.js)
  → scheduleAllExamReminders() in utils/examreminder.js
  → Find all future non-draft exams
  → For each exam: schedule job 15 minutes before scheduledAt
  → At trigger time:
     → Find eligible students (department + semester match)
     → Send email via Nodemailer to each student
     → Use accountVerificationTemplate with exam details
```

### Controller Structure
Controllers follow a consistent pattern with authentication checks and user type validation before rendering views or processing requests.

### Route Organization
- `/` - Home routes (home.js)
- `/dashboard` - Student dashboard and exam interface (dashboard.js)
- `/admin` - Admin panel for exam management (admin.js)
  - `/admin/addbulckstudent` (GET/POST) - Bulk student upload interface
  - `/admin/download-student-template` (GET) - Download CSV template
  - `/admin/departments` - Department management
  - `/admin/exam/:examId` - Exam editing
  - `/admin/create_exam` - Create new exam
  - `/admin/exam/candidates/:examId` - View exam candidates and submissions
- `/authenticate` - Login/logout functionality (authenticate.js)
- `/profile` - User profile management (profile.js)
- `/supadmin` - Super admin functions (supadmin.js)
- `/user` - User authentication routes (userauth.js)

Global routes defined in `app.js`:
- `/logout` - Clears session and `currentSessionId` for students
- `/api/check-session` - Validates current session for single-device enforcement
- `/update-integrity` - Records integrity violations during exams
- `/save-image` - Uploads integrity monitoring images to S3

### Middleware Chain
Application middleware is applied in this order (app.js):
1. Security middleware: `mongoSanitize()`, `hpp()`, `xss()`
2. Body parsers with 100MB limit for JSON and urlencoded data
3. Session configuration with MongoDB store
4. Flash messages for user feedback
5. Passport initialization and session
6. Single-device session validator (`validateSingleSession`) - globally applied

### Error Handling
Flash messages are used for user feedback across the application. Error handling includes validation errors, authentication failures, and database operation errors. 404 routes render `pagenotfound.ejs` view.

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

## Key Controllers & Their Responsibilities

- **authenticatecontroller.js**: Login, signup, email verification, session ID tracking on login, password reset, forgot password
- **dashboardcontroller.js**: Student dashboard, exam rendering, answer submission, MCQ auto-scoring (line 156-216), exam eligibility checks
- **admincontroller.js**: Admin/teacher dashboard, student management, candidate viewing, exam reports, user approval, teacher account management
- **examcontroller.js**: Create/edit exams, validation logic, Excel candidate upload and parsing, department-based candidate selection, individual candidate management
- **questioncontroller.js**: Add/edit/delete MCQ questions with validation (4 options required)
- **activeSessionController.js**: Track real-time activity pings, update ActiveSession status during exams
- **reportController.js**: Generate assessment reports with detailed analysis
- **departmentcontroller.js**: CRUD operations for departments (create, read, update, delete, toggle active status)
- **bulkStudentController.js**: Bulk student account creation via CSV upload, template download, batch user registration with shared passwords
- **supadmin.js**: Super admin functions (user management, system-wide operations)
- **profilecontroller.js**: User profile management and updates
- **homecontroller.js**: Landing page and public routes
- **allmcqcontroller.js**: MCQ question bank management
- **addMCQQuestions.js**: Bulk MCQ question import from CSV
- **dbQuestionsController.js**: Database question management
- **userauthcontroller.js**: Additional user authentication utilities

## Important Implementation Details

### MCQ Question Requirements
- Exactly 4 options required per question (enforced in schema)
- One correct answer (stored as string matching one of the options)
- Classifications (enum in MCQSchema):
  - Data Structures
  - Algorithms
  - DBMS
  - Object-Oriented Programming
  - Networking
  - Operating Systems
  - Software Engineering
  - Mathematics
  - Artificial Intelligence
  - Machine Learning
  - UNIX
  - other
- Difficulty levels: easy, medium, hard (enum)

### Submission Scoring
MCQ answers are automatically scored on submission in `dashboardcontroller.postStartExam()`:
```javascript
// For each answer submitted:
if (selectedOption === question.correctAnswer) {
  totalScore += question.marks
}
```
Score is stored in Submission document immediately upon submission.

### Email System
- Uses Nodemailer with GoDaddy SMTP (smtpout.secureserver.net:465)
- Templates: account verification (signup), exam reminders (scheduled)
- Async sending via utils/email.js

### Bulk Student Account Creation
Admins can create multiple student accounts at once via CSV upload at `/admin/addbulckstudent`:

**Features**:
- Upload CSV file with student details (email, USN, department, semester, optional: fname, lname, phone, imageurl)
- Set a common password for all uploaded students
- Auto-approval: students are immediately active and can login without email verification (`userallowed: true`, `active: true`)
- Automatic year extraction from USN (characters 4-5)
- Duplicate detection (skips existing emails/USNs)
- Detailed error reporting for invalid rows
- Download sample CSV template at `/admin/download-student-template`

**CSV Format** (required columns: email, usn, department, semester):
```csv
email,usn,department,semester,fname,lname,phone,imageurl
student1@example.com,1BY22CS001,cs,1,John,Doe,9876543210,
student2@example.com,1BY22CS002,cs,1,Jane,Smith,9876543211,https://example.com/profile.jpg
```

**Validation**:
- Email: valid format, unique
- USN: valid format (LocationYearDeptRollNo), unique, year auto-extracted
- Department: lowercase, must be valid department code (cs, is, ec, et, ai, cv, ee, ad)
- Semester: integer 1-8
- Phone (optional): 10 digits
- Password: minimum 6 characters (shared across all uploaded students)

**Security**: All passwords are hashed using bcrypt via passport-local-mongoose. Students should change their password after first login.

See `BULK_STUDENT_UPLOAD_FEATURE.md` for detailed documentation and examples.

## Orphaned Data Handling

The system handles orphaned database references that occur when User records are deleted while having active sessions or submissions:

- **Orphaned ActivityTracker sessions**: Automatically marked as offline by cleanup script
- **Orphaned Submissions**: Displayed with "[DELETED USER]" placeholder in admin views, but submission data (scores, timestamps) is preserved
- Run `npm run cleanup:sessions` to identify and clean orphaned records
- **Best practice**: Implement soft deletes for User records instead of hard deletes if they have submissions

See `scripts/README.md` for detailed documentation on the cleanup script.

## Testing & Development Tools

### Test Directory Structure
The `/test/` directory contains testing utilities and scripts:
- Test account creation and cleanup scripts
- Chrome WebDriver testing scripts
- Installation and setup documentation
- Quick start guides

Files in `/test/`:
- `create_test_accounts.py` - Create test student accounts
- `cleanup_test_accounts.py` - Remove test accounts
- `test_chrome.py` / `test_chrome_simple.py` - Selenium WebDriver tests
- `quick_test.sh` / `setup.sh` - Bash setup scripts
- `requirements.txt` - Python dependencies for test scripts
- `QUICK_START.md`, `INSTALLATION.md`, `README.md` - Testing documentation

No specific Node.js test framework is configured - implement tests as needed for new features using your preferred testing library (Jest, Mocha, etc.).

## Additional Files & Documentation

Additional documentation in the repository:
- `SECURITY_AUDIT.md` - Security audit documentation
- `SECURITY_FIXES_APPLIED.md` - Record of security patches
- `BULK_STUDENT_UPLOAD_FEATURE.md` - Detailed guide for bulk student account creation
- `scripts/README.md` - Documentation for database management scripts
- `middleware/auth.js` - Authentication middleware
- `config/` - Configuration files (including `upload.js`)
- `services/` - Service layer files
- `templates/student_upload_template.csv` - Sample CSV template for bulk student uploads
- `models/CodingQuestion.js` / `Codingschema.js` - Coding question models (future feature)
- `views/add_coding.ejs`, `edit_coding.ejs`, `sel_coding_db.ejs` - Coding exam views (future feature)

## Known Limitations & Future Enhancements

### Current Limitations
- Only MCQ exams are fully supported (coding exams have partial model/view implementations)
- No automated test suite (manual testing via `/test/` Python scripts)
- Helmet.js security headers are commented out in `app.js` (line 56)

### Planned Features (Based on Untracked Files)
- **Coding Exams**: Models and views exist but controllers/routes not fully implemented
  - `models/CodingQuestion.js` / `Codingschema.js`
  - `views/add_coding.ejs`, `edit_coding.ejs`, `sel_coding_db.ejs`
- **Enhanced Services Layer**: `services/` directory exists but not yet populated

## Important Security Considerations

When working with this codebase:
1. **File Upload Security**: Always use the configured upload middleware from `config/upload.js`
2. **Session Management**: Never bypass the `sessionValidator` middleware for exam routes
3. **User Deletion**: Implement soft deletes instead of hard deletes to prevent orphaned submissions
4. **Environment Variables**: Never commit `.env` files or expose sensitive credentials
5. **Magic Bytes Validation**: Image uploads use magic bytes verification in addition to MIME type checks
6. **S3 Security**: All S3 uploads use server-side encryption (AES256)