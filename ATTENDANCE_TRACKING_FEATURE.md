# Exam Attendance Tracking Feature

## Overview
This feature allows teachers and admins to track student attendance for exams and identify which registered students did not appear or submit the exam.

## Key Features

### 1. **Automatic Attendance Status Tracking**
Students registered for exams are automatically tracked through four attendance states:

- **`registered`** - Student is registered for the exam (initial state)
- **`started`** - Student opened the exam page and began the test
- **`submitted`** - Student completed and submitted the exam
- **`absent`** - Student was registered but **NEVER opened the exam at all** (manually marked by admin/teacher)

**Important Distinction:**
- **Absent** = Student never opened/started the exam at all
- **Not Submitted** = Student started the exam but didn't submit (e.g., browser closed, network issue)
  - These students are NOT considered "absent"
  - They appear in the main candidates page with status "Did not submit"

### 2. **Attendance Status Updates**
The system automatically updates attendance status:

- **When student starts exam**: Status changes from `registered` → `started`
  - Triggered in: `dashboardcontroller.js:146-155`

- **When student submits exam**: Status changes to `submitted`
  - Triggered in: `dashboardcontroller.js:209-216`

### 3. **Absent Student Management**

#### View Absent Students
- **Endpoint**: `GET /admin/exam/{examId}/attendance`
- **Controller**: `admincontroller.getAttendancePage()`
- **View**: `exam_attendance.ejs`

Features:
- Shows ONLY students who **never opened the exam at all** (no ActivityTracker or Submission record)
- Excludes students who started but didn't submit (they're "not submitted", not "absent")
- Real-time statistics (Total Eligible, Submitted, Started, Absent)
- Search functionality (by USN, name, department, email)
- Displays student details: USN, name, department, semester, email
- Clear labeling: "Never Opened Exam" status badge

#### Mark Students as Absent
- **Endpoint**: `POST /admin/exam/{examId}/mark-absent`
- **Controller**: `admincontroller.markStudentsAbsent()`

Capabilities:
- Mark individual student as absent
- Mark multiple selected students as absent (bulk action)
- Mark ALL non-submitted students as absent at once
- Only marks students with status `registered` or `started` (won't override `submitted`)

### 4. **Get Absent Students List (API)**
- **Endpoint**: `GET /admin/exam/absent/{examId}`
- **Controller**: `admincontroller.getAbsentStudents()`
- **Logic**: Filters students who have NO `ActivityTracker` session AND NO `Submission` record
- **Returns JSON**:
  ```json
  {
    "success": true,
    "absentStudents": [...],  // Only students who never opened exam
    "totalAbsent": 5,
    "totalEligible": 50,
    "totalAttempted": 45,    // Students with ActivityTracker OR Submission
    "exam": {...}
  }
  ```

**Key Logic (admincontroller.js:1860-1888)**:
```javascript
// Get students who have ActivityTracker sessions (opened exam)
const activitySessions = await ActivityTracker.find({ examId: examId })
    .populate('userId', 'USN')
    .select('userId');

activitySessions.forEach(session => {
    if (session.userId && session.userId.USN) {
        attemptedUSNs.add(session.userId.USN);  // Mark as "attempted"
    }
});

// Filter: Only students NOT in attemptedUSNs are "absent"
const absentStudents = allEligibleStudents.filter(student =>
    !attemptedUSNs.has(student.USN)
);
```

## Database Schema Changes

### ExamCandidate Model (`models/ExamCandidate.js`)
**New Fields Added**:

```javascript
attendanceStatus: {
  type: String,
  enum: ['registered', 'started', 'submitted', 'absent'],
  default: 'registered'
}
markedAbsentAt: {
  type: Date  // Timestamp when marked absent
}
markedAbsentBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'  // Admin/Teacher who marked absent
}
```

## How It Works

### For Students:
1. Student is registered for exam (via dept/sem, CSV upload, or manual addition)
   - `ExamCandidate` record created with `attendanceStatus: 'registered'`

2. Student opens exam page
   - Status updated to `'started'`
   - Tracked in `dashboardcontroller.getStartExam()`

3. Student submits exam
   - Status updated to `'submitted'`
   - Tracked in `dashboardcontroller.postStartExam()`

4. Student doesn't show up / never opens exam
   - Status remains `'registered'`
   - No `ActivityTracker` or `Submission` record created
   - Student appears in "Absent Students" page
   - Admin can manually mark as `'absent'`

5. Student starts but doesn't submit (browser closes, network issue, etc.)
   - Status is `'started'`
   - Has `ActivityTracker` record (so NOT considered absent)
   - Shows as "Did not submit" in main candidates page
   - **NOT** shown in "Absent Students" page

### For Teachers/Admins:
1. Navigate to exam candidates page: `/admin/exam/candidates/{examId}`
2. Click **"Manage Attendance"** button
3. View all students who didn't submit
4. Mark students as absent:
   - Individual: Click "Mark Absent" button next to student
   - Multiple: Select checkboxes and click "Mark Selected as Absent"
   - All: Click "Mark All Not-Submitted as Absent"

## Access Points

### From Exam Candidates Page
The attendance management page is accessible via the **"Manage Attendance"** button in the exam candidates view (`exam_candidates.ejs:448-450`).

### Direct URL
`/admin/exam/{examId}/attendance`

## Use Cases

### 1. **Post-Exam Attendance Reporting**
After exam ends, teachers can:
- Identify which students were absent
- Mark absent students in the system
- Generate attendance reports

### 2. **Real-Time Monitoring**
During exam:
- See which students have started
- See which students haven't shown up yet
- Track submission progress

### 3. **Record Keeping**
- Maintains audit trail of who marked students absent and when
- `markedAbsentAt` - timestamp
- `markedAbsentBy` - admin/teacher ID

## API Endpoints Summary

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/exam/:examId/attendance` | Render attendance management page | Admin/Teacher |
| GET | `/admin/exam/absent/:examId` | Get list of absent students (JSON) | Admin/Teacher |
| POST | `/admin/exam/:examId/mark-absent` | Mark students as absent | Admin/Teacher |

## Security & Authorization

- All attendance endpoints require authentication (`requireAdmin` middleware)
- Only users with `usertype: 'admin'` or `usertype: 'teacher'` can access
- Prevents students from marking attendance or viewing absent lists

## Important Notes

1. **Cannot Override Submitted Status**:
   - Once a student submits (`status: 'submitted'`), they cannot be marked absent
   - Protection built into `markStudentsAbsent()` controller

2. **Existing ExamCandidate Records**:
   - Old records without `attendanceStatus` will default to `'registered'`
   - No migration needed - handled by Mongoose defaults

3. **Student Identification**:
   - Uses USN (University Seat Number) for matching students to exams
   - USN is stored in both `User` model and `ExamCandidate` model

## Future Enhancements (Optional)

- [ ] Export attendance report to Excel/CSV
- [ ] Send email notifications to absent students
- [ ] Attendance analytics dashboard
- [ ] Automatic absence marking after exam end time
- [ ] Integration with student profiles for overall attendance tracking

## Testing Checklist

- [x] ExamCandidate model updated with new fields
- [x] Dashboard controller updates attendance on exam start
- [x] Dashboard controller updates attendance on exam submit
- [x] Attendance page renders correctly
- [x] Absent students API returns correct data
- [x] Mark absent functionality works (single, multiple, all)
- [x] Button added to exam candidates page
- [x] Routes configured properly
- [x] Authorization checks in place

## Files Modified/Created

### Modified:
- `models/ExamCandidate.js` - Added attendance fields
- `controllers/dashboardcontroller.js` - Added attendance status updates
- `controllers/admincontroller.js` - Added attendance management methods
- `routes/admin.js` - Added attendance routes
- `views/exam_candidates.ejs` - Added "Manage Attendance" button

### Created:
- `views/exam_attendance.ejs` - Attendance management UI
- `ATTENDANCE_TRACKING_FEATURE.md` - This documentation

## Credits
Feature implemented to track student attendance and identify absent students for exam administration and record-keeping purposes.
