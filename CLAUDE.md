# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

PrepZer0 is a comprehensive online examination platform built with Node.js, Express, and MongoDB. It supports MCQ-based exams with real-time integrity monitoring, multi-role user management (students, teachers, admins), and single-device login enforcement for exam security.

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

### Environment Setup
- Create `.env` file with required environment variables
- MongoDB connection string is configured in `app.js`
- AWS S3 credentials needed for file uploads and integrity monitoring

## Architecture

### Core Structure
- **Entry Point**: `server.js` → `app.js`
- **Models**: Mongoose schemas in `/models/` directory
- **Controllers**: Business logic in `/controllers/` directory
- **Routes**: Express route handlers in `/routes/` directory
- **Views**: EJS templates in `/views/` directory
- **Utils**: Helper functions in `/utils/` directory

### Key Models
- **User** (`usermodel.js`): Student/teacher/admin with USN-based identification
- **Exam** (`Exam.js`): Exam configuration with dynamic validation for Excel vs department-based candidate selection
- **ExamCandidate** (`ExamCandidate.js`): Links users to specific exams
- **Submission** (`SubmissionSchema.js`): Stores exam submissions
- **Integrity** (`Integrity.js`): Tracks integrity violations during exams
- **ActiveSession** (`ActiveSession.js`): Monitors user activity during exams

### Authentication & Authorization
- Passport.js with local strategy using email as username
- Three user types: student, teacher, admin
- Email verification required for teachers
- Admin approval required for platform access
- Session management with MongoDB store

### Exam System
- Currently supports MCQ questions only (4 options required per question)
- Dynamic candidate selection: department/semester-based OR Excel upload
- Student eligibility determined by OR logic: (department AND semester match) OR (explicit ExamCandidate entry)
- Integrity monitoring with camera capture and behavior tracking
- Real-time activity tracking during exams
- Automated exam reminders sent 15 minutes before scheduled start using node-schedule
- Automatic MCQ scoring on submission (sum of marks for correct answers)

### File Upload & Storage
- AWS S3 integration for file storage
- Multer for handling multipart/form-data
- Image capture for integrity monitoring stored in S3

### Frontend
- EJS templating engine
- Tailwind CSS with custom configuration
- Client-side JavaScript for exam interface and integrity monitoring

## Database Schema Notes

### User Schema (USN Format)
USN format: `location + Year + Department + RollNumber`
Example: `1BY22CS001` = `BY + 22 + CS + 001`

Departments: `["cg", "ad", "is", "cs", "et", "ec", "ai", "cv", "ee"]`

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
Functions: `calculateCurrentSemester()`, `calculateInitialSemester()` in `utils/semesterCalculator.js`

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
- On login: store `req.sessionID` in user's `currentSessionId` field; destroy any previous session
- During exam: middleware checks if `user.currentSessionId === req.sessionID`
- If mismatch: force logout with error message "You have been logged out because you logged in from another device"
- Only applies to student exam routes (`/dashboard/test/*`, `/api/check-session`)
- Teachers and admins bypass this check (can login from multiple devices)

## Integrity Monitoring

The platform includes comprehensive exam integrity features implemented in `views/test3.ejs`:
- **Client-side event tracking**: tab changes, mouse exits, focus changes, copy/paste attempts, fullscreen exits
- **Server-side logging**: violations stored in Integrity model via `/update-integrity` endpoint
- **Camera capture**: periodic screenshots (if enabled) uploaded to S3 at `integrity/{usn}/{examId}/{timestamp}.jpg`
- **Activity tracking**: real-time pings to `/dashboard/see-active` endpoint store status in ActiveSession model
- **Violation metadata**: stores last violation type, timestamp, and cumulative counts per violation type

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
- `/` - Home routes
- `/dashboard` - Student dashboard and exam interface
- `/admin` - Admin panel for exam management
- `/authenticate` - Login/logout functionality
- `/profile` - User profile management
- `/supadmin` - Super admin functions

### Error Handling
Flash messages are used for user feedback across the application. Error handling includes validation errors, authentication failures, and database operation errors.

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

- **authenticatecontroller.js**: Login, signup, email verification, session ID tracking on login
- **dashboardcontroller.js**: Student dashboard, exam rendering, answer submission, MCQ auto-scoring
- **admincontroller.js**: Admin/teacher dashboard, student management, candidate viewing, exam reports
- **examcontroller.js**: Create/edit exams, validation logic, Excel candidate upload and parsing
- **questioncontroller.js**: Add/edit/delete MCQ questions with validation (4 options required)
- **activeSessionController.js**: Track real-time activity pings, update ActiveSession status
- **reportController.js**: Generate assessment reports with detailed analysis

## Important Implementation Details

### MCQ Question Requirements
- Exactly 4 options required per question (enforced in schema)
- One correct answer (stored as option index)
- Classifications: Data Structures, Algorithms, DBMS, OOP, Networking, OS, SE, Math, AI, ML, UNIX, other
- Difficulty levels: easy, medium, hard

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

## Testing Notes

The platform includes test data and backup files in the `/test/` directory. No specific test framework is configured - implement tests as needed for new features.