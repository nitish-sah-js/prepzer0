# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

PrepZer0 is a comprehensive online examination platform built with Node.js, Express, and MongoDB. It supports multiple question types (MCQ and coding), integrity monitoring, and user management across different roles (students, teachers, admins).

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
- Supports MCQ, coding, and mixed question types
- Dynamic candidate selection: department/semester-based OR Excel upload
- Integrity monitoring with camera capture and behavior tracking
- Real-time activity tracking during exams
- Automated exam reminders using node-cron

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

### Exam Validation
- Dynamic validation based on candidate selection method
- Excel-based exams skip department/semester requirements
- Pre-save hooks validate question counts and exam constraints

## Security Features

- Rate limiting with express-rate-limit
- Input sanitization with express-mongo-sanitize
- XSS protection with xss-clean
- HPP (HTTP Parameter Pollution) protection
- Helmet.js security headers (commented out)
- Session encryption and secure cookie configuration

## Integrity Monitoring

The platform includes comprehensive exam integrity features:
- Tab change detection
- Mouse out/focus change tracking
- Copy/paste attempt monitoring
- Fullscreen exit detection
- Periodic camera capture with S3 storage
- Real-time activity pings during exams

## Common Development Patterns



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

## Testing Notes

The platform includes test data and backup files in the `/test/` directory. No specific test framework is configured - implement tests as needed for new features.