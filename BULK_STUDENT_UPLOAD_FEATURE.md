# Bulk Student Upload Feature

## Overview

This feature allows administrators and teachers to create multiple student accounts at once by uploading a CSV file. All students created through this method will share a common password set by the admin.

## Features

✅ **Bulk Account Creation**: Upload a CSV file to create multiple student accounts in one go
✅ **Common Password**: Set a single password for all uploaded students
✅ **Auto-Approval**: Students are automatically approved and can login immediately
✅ **Skip Email Verification**: No email verification required for bulk uploaded students
✅ **Error Handling**: Detailed error messages for each row with issues
✅ **Duplicate Detection**: Skips students with duplicate emails or USNs
✅ **Automatic Year Extraction**: Extracts year from USN automatically
✅ **Sample Template**: Download a pre-formatted CSV template
✅ **Detailed Statistics**: See how many accounts were created/skipped

## Files Created

### 1. Controller
- **File**: `controllers/bulkStudentController.js`
- **Functions**:
  - `getBulkStudentUpload()` - Renders the upload form
  - `postBulkStudentUpload()` - Processes CSV and creates accounts
  - `downloadTemplate()` - Provides downloadable CSV template

### 2. View
- **File**: `views/bulk_student_upload.ejs`
- **Features**:
  - Upload form with file and password inputs
  - Instructions and CSV format requirements
  - Sample CSV format display
  - Download template button
  - Error/success messages with statistics

### 3. Routes
- **File**: `routes/admin.js` (updated)
- **Routes Added**:
  - `GET /admin/addbulckstudent` - Show upload form
  - `POST /admin/addbulckstudent` - Process CSV upload
  - `GET /admin/download-student-template` - Download template

### 4. Template
- **File**: `templates/student_upload_template.csv`
- **Purpose**: Sample CSV template for users to download and fill

### 5. Admin Dashboard
- **File**: `views/admin.ejs` (updated)
- **Change**: Added "Add Bulk Students" button in the header

## How to Use

### Step 1: Access the Feature
1. Login as an admin or teacher
2. Navigate to `/admin` dashboard
3. Click the green **"Add Bulk Students"** button in the header

### Step 2: Download Template (Optional)
1. Click **"Download Sample CSV Template"** button
2. Open the downloaded file in Excel or any CSV editor
3. You'll see the correct format with sample data

### Step 3: Prepare Your CSV File

#### Required Columns:
- `email` - Student email address (must be unique)
- `usn` - University Serial Number (must be unique, format: 1BY22CS001)
- `department` - Department code (lowercase: cs, is, ec, et, ai, cv, ee, ad)
- `semester` - Current semester (1-8)

#### Optional Columns:
- `fname` - First name
- `lname` - Last name
- `phone` - Phone number (10 digits)
- `imageurl` - Profile picture URL

#### Sample CSV Format:
```csv
email,usn,department,semester,fname,lname,phone,imageurl
student1@example.com,1BY22CS001,cs,1,John,Doe,9876543210,
student2@example.com,1BY22CS002,cs,1,Jane,Smith,9876543211,https://example.com/profile.jpg
```

### Step 4: Upload and Create Accounts
1. Select your CSV file
2. Enter a default password (minimum 6 characters)
   - This password will be used by ALL students to login
3. Click **"Upload and Create Accounts"**
4. Wait for processing to complete

### Step 5: Review Results
After processing, you'll see:
- **Total rows** in CSV
- **Successfully created** accounts
- **Skipped rows** (with error details)
- **Error messages** for each failed row

## CSV Validation Rules

### Email
- Must be valid email format
- Must be unique (not already in database)
- Example: `student@college.edu`

### USN (University Serial Number)
- Format: `LocationYearDeptRollNo`
- Example: `1BY22CS001`
  - `1BY` = Location
  - `22` = Year (2022)
  - `CS` = Department
  - `001` = Roll Number
- Must be unique
- System automatically extracts year from USN

### Department
- Must be lowercase
- Valid codes:
  - `cs` - Computer Science
  - `is` - Information Science
  - `ec` - Electronics & Communication
  - `et` - Electronics & Telecommunication
  - `ai` - Artificial Intelligence
  - `cv` - Civil Engineering
  - `ee` - Electrical Engineering
  - `ad` - Automation & Robotics

### Semester
- Must be a number between 1 and 8
- Example: `1`, `2`, `3`, etc.

### Phone (Optional)
- Must be 10 digits
- Stored as number
- Example: `9876543210`

## Important Notes

### Auto-Approval
- Students created via bulk upload have `userallowed: true`
- They can login immediately without admin approval
- Email verification is skipped (`active: true`)

### Password Security
- All students get the same password initially
- **Recommend students change password after first login**
- Password must be at least 6 characters

### Error Handling
- Process continues even if some rows fail
- Each error is reported with line number
- Failed rows are skipped, successful ones are created

### Duplicate Prevention
- System checks for existing email and USN
- Duplicates are skipped with error message
- No existing data is modified

### Year Extraction
- Year is automatically extracted from USN
- Format: Characters 4-5 of USN
- Example: `1BY22CS001` → Year = `2022`

## Example Workflow

### Example 1: Creating CS Department Students

**CSV File:**
```csv
email,usn,department,semester,fname,lname
cs101@college.edu,1BY22CS001,cs,1,Rajesh,Kumar
cs102@college.edu,1BY22CS002,cs,1,Priya,Sharma
cs103@college.edu,1BY22CS003,cs,1,Amit,Patel
```

**Steps:**
1. Upload this CSV
2. Set password: `welcome123`
3. System creates 3 students
4. All can login with their email and `welcome123`

### Example 2: Mixed Departments

**CSV File:**
```csv
email,usn,department,semester,fname,lname,phone
cs101@college.edu,1BY22CS001,cs,1,John,Doe,9876543210
is101@college.edu,1BY22IS001,is,1,Jane,Smith,9876543211
ec101@college.edu,1BY22EC001,ec,2,Bob,Johnson,9876543212
ai101@college.edu,1BY22AI001,ai,1,Alice,Williams,9876543213
```

**Result:**
- Creates students from different departments
- Each with their respective department and semester
- All share the same password

## Common Errors and Solutions

### Error: "Missing required fields"
**Solution**: Ensure every row has email, usn, department, and semester

### Error: "Invalid email format"
**Solution**: Use proper email format: `name@domain.com`

### Error: "Semester must be between 1 and 8"
**Solution**: Use only numbers 1-8 for semester

### Error: "User already exists"
**Solution**: Check database for duplicate email or USN, remove from CSV

### Error: "CSV file is empty"
**Solution**: Ensure CSV has header row and at least one data row

### Error: "Only CSV files are allowed"
**Solution**: Save file as `.csv` format, not `.xlsx` or `.xls`

## Security Considerations

1. **File Upload**: Limited to 5MB, CSV files only
2. **Password**: Minimum 6 characters required
3. **Validation**: All fields validated before database insertion
4. **Error Logging**: Errors logged but not exposed to frontend
5. **File Cleanup**: Uploaded files deleted after processing

## Technical Details

### Dependencies Used
- `csv-parser`: Parse CSV files
- `fs`: File system operations
- `passport-local-mongoose`: User registration with password hashing

### Database Fields Set
```javascript
{
  email: "...",           // From CSV
  USN: "...",            // From CSV
  Department: "...",     // From CSV
  Semester: 1-8,         // From CSV
  Year: "2022",          // Extracted from USN
  fname: "...",          // Optional from CSV
  lname: "...",          // Optional from CSV
  phone: 9876543210,     // Optional from CSV
  imageurl: "...",       // Optional from CSV
  usertype: "student",   // Fixed
  userallowed: true,     // Fixed (auto-approve)
  active: true,          // Fixed (skip email verification)
  currentSessionId: null // Default
}
```

### Password Handling
- Uses `User.register()` from passport-local-mongoose
- Password is hashed using bcrypt
- Same hashed password stored for all uploaded students

## Testing Checklist

- [ ] Access `/admin/addbulckstudent` as admin
- [ ] Download sample template
- [ ] Upload valid CSV with 3 students
- [ ] Verify all 3 students created
- [ ] Try uploading CSV with duplicate email
- [ ] Verify error message shown
- [ ] Try uploading CSV with invalid semester
- [ ] Verify validation error shown
- [ ] Login as one of the created students
- [ ] Verify student can access dashboard

## Future Enhancements

Possible improvements:
1. **Password Reset Link**: Send password reset links to students
2. **Email Notifications**: Email students their credentials
3. **Bulk Edit**: Update existing students via CSV
4. **Excel Support**: Support `.xlsx` in addition to `.csv`
5. **Progress Bar**: Show upload progress for large files
6. **Validation Preview**: Preview data before creating accounts
7. **Department Validation**: Validate against Department schema
8. **Rollback**: Undo bulk upload if needed

## Support

For issues or questions about this feature:
1. Check error messages carefully
2. Verify CSV format matches template
3. Ensure all required fields are present
4. Check for duplicate emails/USNs in database
