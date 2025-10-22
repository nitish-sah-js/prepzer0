# Auto-Save and Timer Persistence Testing Guide

## Features Implemented

### 1. Auto-Save Functionality
- **Automatic saving every 30 seconds**: Student answers are automatically saved to the database
- **Visual indicator**: Shows "Saved" message in the header when auto-save completes
- **Save on page unload**: Answers are saved when student navigates away or refreshes the page
- **Time remaining is saved**: The remaining exam time is stored with the answers

### 2. Answer Restoration
- **Automatic restoration**: When a student returns to an exam, their previous answers are loaded
- **Notification**: A message appears confirming answers have been restored
- **Works for MCQ answers**: All selected options are restored to their previous state

### 3. Timer Persistence
- **Timer continues from where it left off**: If a student leaves and returns, the timer resumes from the saved time
- **Prevents timer reset**: Timer won't restart if student refreshes the page
- **Auto-submit on expiry**: Exam automatically submits when time runs out

### 4. Partial Submission Cleanup
- **Automatic cleanup**: When exam is successfully submitted, partial submissions are deleted
- **Prevents data accumulation**: Keeps the database clean

## Testing Steps

### Test 1: Basic Auto-Save
1. Start an exam as a student
2. Answer a few questions
3. Wait 30 seconds (or check console for "Auto-save successful" message)
4. Check the database for PartialSubmission collection
5. Verify answers are saved

### Test 2: Page Refresh Recovery
1. Start an exam and answer some questions
2. Note the timer value
3. Refresh the page (F5)
4. Verify:
   - Timer continues from where it left off (not reset)
   - Previously selected answers are still selected
   - "Your previous answers have been restored" notification appears

### Test 3: Leave and Return
1. Start an exam and answer questions
2. Navigate away from the exam (go to dashboard)
3. Return to the same exam
4. Verify answers and timer are restored

### Test 4: Timer Expiry
1. Start an exam with a short duration (e.g., 1 minute for testing)
2. Wait for timer to expire
3. Verify exam auto-submits when time runs out

### Test 5: Successful Submission Cleanup
1. Complete an exam normally
2. Submit the exam
3. Check the PartialSubmission collection in MongoDB
4. Verify the partial submission record is deleted

## Database Verification

### Check Partial Submissions in MongoDB:
```javascript
// In MongoDB shell or Compass
db.partialsubmissions.find({})

// Structure of a saved partial submission:
{
  "_id": ObjectId("..."),
  "exam": ObjectId("..."),
  "student": ObjectId("..."),
  "mcqAnswers": [
    {
      "questionId": ObjectId("..."),
      "selectedOption": "option text or index"
    }
  ],
  "timeRemaining": 1800, // in seconds
  "isPartial": true,
  "lastSavedAt": ISODate("..."),
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## Console Messages to Look For

### Success Messages:
- "Auto-save successful: Answers auto-saved"
- "Loaded saved answers: {object with answers}"
- "Resuming exam with time remaining: X seconds"
- "Found partial submission for student..."

### Error Messages (if any):
- "Auto-save failed: {error}"
- "No exam data or answers to save"

## Troubleshooting

### If auto-save is not working:
1. Check if the route `/dashboard/save-partial` is accessible
2. Verify authentication is working (req.user._id exists)
3. Check browser console for errors
4. Verify MongoDB connection is active

### If timer resets on refresh:
1. Check localStorage for `examEndTime` key
2. Verify the saved answers include `timeRemaining`
3. Check if the timer initialization code is running properly

### If answers are not restored:
1. Check if PartialSubmission exists in database
2. Verify the conversion logic in `getStartExam` controller
3. Check browser console for saved answers object
4. Ensure localStorage is not being cleared

## Code Locations

- **Model**: `/models/PartialSubmission.js`
- **Controller**: `/controllers/dashboardcontroller.js`
  - `savePartialSubmission()` - Saves answers
  - `getStartExam()` - Loads saved answers
  - `postStartExam()` - Deletes partial on submission
- **View**: `/views/test3.ejs`
  - `autoSaveAnswers()` - Client-side auto-save function
  - `startExamTimer()` - Timer with persistence
  - Line 2780-2818: Answer restoration logic
- **Route**: `/routes/dashboard.js`
  - POST `/dashboard/save-partial`

## Performance Considerations

- Auto-save runs every 30 seconds to balance between data safety and server load
- Partial submissions are indexed on `{exam: 1, student: 1}` for fast lookups
- Old partial submissions can be cleaned up using:
  ```javascript
  PartialSubmission.cleanupOldPartials(7); // Delete partials older than 7 days
  ```

## Security Notes

- Only authenticated students can save their own answers
- Students cannot access other students' partial submissions
- Partial submissions are automatically linked to the logged-in user