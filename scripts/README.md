# Scripts Directory

This directory contains utility scripts for managing the PrepZer0 platform.

## Available Scripts

### 1. `populate-students.js`
Populates the database with students across all departments and years.

**What it creates:**
- **480 students** total (8 departments × 4 years × 15 students per semester)
- Students for years: 2021 (8th sem), 2022 (6th sem), 2023 (4th sem), 2024 (2nd sem)
- Departments: CG, AD, IS, CS, ET, EC, AI, CV
- USN format: `1BY{year}{dept}{rollno}` (e.g., `1BY21CS001`)

**Usage:**
```bash
node scripts/populate-students.js
```

**Student Credentials:**
- **Email format**: `{usn}@student.edu` (e.g., `1by21cs001@student.edu`)
- **Password**: `student123` (same for all students)

**Example Logins:**
- Email: `1by21cs001@student.edu`, Password: `student123`
- Email: `1by22is015@student.edu`, Password: `student123`
- Email: `1by23ai010@student.edu`, Password: `student123`

**Safe to re-run:** The script checks for existing students and skips them, so you can run it multiple times without creating duplicates.

---

### 2. `populate-mcq-questions.js`
Populates the database with 40 MCQ questions across various computer science topics.

**What it creates:**
- **40 MCQ questions** covering:
  - Data Structures (8 questions)
  - Algorithms (8 questions)
  - DBMS (6 questions)
  - Object-Oriented Programming (6 questions)
  - Operating Systems (6 questions)
  - Networking (6 questions)
- Questions with varying difficulty levels (easy, medium, hard)
- Each question has 4 options with 1 correct answer

**Usage:**
```bash
node scripts/populate-mcq-questions.js
```

**Question Format:**
- Classification: Topic category
- Question text with 4 options
- Difficulty level: easy (1 mark), medium (2 marks), hard (3 marks)
- Created by: System

**Safe to re-run:** Script checks for existing questions by question text and skips duplicates.

---

### 3. `create-admin.js`
Creates an admin user account.

**What it creates:**
- Admin account with email: `earthlingaidtech@gmail.com`
- Password: `1`
- Full admin access enabled

**Usage:**
```bash
node scripts/create-admin.js
```

**Admin Credentials:**
- **Email**: earthlingaidtech@gmail.com
- **Password**: 1

**Note:** If an admin with this email already exists, it will be deleted and recreated.

---

## Adding New Scripts

When adding new utility scripts to this directory:

1. Follow the naming convention: `action-noun.js` (e.g., `populate-students.js`, `create-admin.js`)
2. Add proper error handling and logging
3. Include a description in this README
4. Make scripts idempotent (safe to run multiple times)
5. Add usage examples

---

## Environment Setup

All scripts require:
- `.env` file with `MONGODB_URI` configured
- Node.js installed
- All dependencies installed (`npm install`)

---

## Best Practices

- **Always backup database** before running bulk operation scripts
- **Test on development** environment first
- **Review output** carefully after running scripts
- **Keep credentials secure** - never commit actual passwords to version control
