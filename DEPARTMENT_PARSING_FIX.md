# Department Code Parsing Fix

## Issue Description
Students with department codes longer than 2 characters (e.g., "CSEDS", "ISANDS") were being incorrectly matched with shorter department codes (e.g., "CS", "IS") during exam eligibility checks. This was caused by a regex pattern that truncated department codes to exactly 2 characters during USN parsing.

## Root Cause
The USN parsing regex in `controllers/authenticatecontroller.js` was using a fixed pattern that only captured 2 characters for the department code:

```javascript
// OLD REGEX (BUGGY)
const regex = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2})(\d{3})$/;
//                                              ^^^^^^^^ Only 2 chars!
```

This caused USNs like "1BY22CSEDS001" to be parsed as:
- Department: "CS" (truncated from "CSEDS")
- Roll number: "EDS" (overflow from department)

## Impact
1. **Student Signup**: When students signed up with USNs containing >2 char department codes, their department was stored incorrectly
2. **Exam Visibility**: Students from "CSEDS" could see exams meant for "CS" department
3. **Data Integrity**: User records had incorrect department values stored in database

## Solution Implemented

### 1. Updated USN Parsing Regex
Modified the regex pattern to support variable-length department codes (2-10 characters):

```javascript
// NEW REGEX (FIXED)
const regex = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2,10})(\d{3})$/;
//                                              ^^^^^^^^^^^ 2-10 chars supported
```

### 2. Files Modified
- `controllers/authenticatecontroller.js` (line 181) - Main signup USN parsing
- `test/usable_scripts/test.js` (line 384) - Test script USN parsing

### 3. Test Coverage
Created `test/test-department-fix.js` to validate the fix:
- ✅ Standard 2-char departments (CS, EC, AI)
- ✅ Extended departments (CSEDS - 5 chars)
- ✅ Long departments (ISANDS - 6 chars, CSEDSMLDS - 9 chars)
- ✅ Invalid USN formats properly rejected

### 4. Migration Script
Created `scripts/fix-department-parsing.js` to fix existing affected users:
- Identifies users with incorrectly parsed departments
- Re-parses USNs with the corrected regex
- Updates department field in database
- Provides detailed report of fixes applied

## How to Apply the Fix

### For New Installations
The code is already fixed. No action needed.

### For Existing Installations

1. **Update the code** with the fixed regex pattern
2. **Run the migration script** to fix existing users:
   ```bash
   node scripts/fix-department-parsing.js
   ```
3. **Verify the fix** worked:
   ```bash
   node test/test-department-fix.js
   ```

## Testing the Fix

### Manual Test
1. Create a student account with USN "1BY22CSEDS001"
2. Check that the Department field shows "cseds" (not "cs")
3. Create an exam for "cs" department only
4. Verify the CSEDS student CANNOT see the CS exam

### Automated Test
```bash
node test/test-department-fix.js
```

Expected output:
```
TESTING USN PARSING WITH UPDATED REGEX
=======================================================================
✅ PASSED: CSEDS department (5 chars)
   USN: 1by22cseds001 → Department: cseds
```

## Prevention

### Best Practices Going Forward
1. **Avoid fixed-length assumptions** in parsing patterns
2. **Test with edge cases** (long department codes, special formats)
3. **Validate against Department collection** when possible
4. **Use CSV upload for bulk operations** (it correctly handles department from CSV, not USN)

### Monitoring
- Monitor for users with department length = 2 when USN suggests longer code
- Check exam enrollment patterns for unexpected cross-department visibility
- Validate new department codes against Department collection

## Related Components

### Unaffected Components (Already Correct)
- **Bulk Student Upload** (`bulkStudentController.js`) - Uses department from CSV, not USN
- **Semester Calculator** (`semesterCalculator.js`) - Only extracts year from USN
- **Exam Filtering** - Uses exact match on department field (once corrected)

### Affected Data
- User.Department field for students who signed up with >2 char department codes
- Exam visibility for affected students
- Department-based reports and analytics

## Rollback Plan
If issues arise after applying the fix:
1. Revert regex pattern to original (NOT recommended)
2. OR manually correct affected user departments
3. OR use bulk CSV update to set correct departments

## Date Fixed
October 29, 2025

## Fixed By
Claude Code Assistant

## Verification Checklist
- [x] Root cause identified
- [x] Fix implemented in signup controller
- [x] Test script created and passing
- [x] Migration script for existing data
- [x] Documentation complete
- [x] No breaking changes to existing 2-char departments