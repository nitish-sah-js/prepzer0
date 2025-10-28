# Debug Instructions for Answer Restoration Issue
Date: 2025-10-29

## Problem
Only one answer is being shown when students return to the exam, instead of all their previously selected answers.

## Debug Logging Added

I've added comprehensive logging throughout the code. When testing, open the browser's Developer Console (F12) and look for these messages:

### 1. When Student Returns with Saved Answers

You should see:
```
Returning student with saved answers, skipping start overlay
Saved answers structure: {mcq: {...}, coding: {...}}
MCQ answers count: [number]
Question [id]: {value: 0, index: 0}
Question [id]: {value: 2, index: 2}
...
About to restore answers to localStorage: [object]
Verified answers in localStorage after setting: [object]
NOT setting up new exam - student has saved answers
Confirmed answers still in localStorage: [object]
```

### 2. During Exam Initialization

You should see:
```
=== INITIALIZING EXAM ===
Current answers in localStorage at exam init: [object]
Answer count: [number]
```

### 3. When Displaying Each Question

You should see:
```
Displaying MCQ question [id] at index [number]
Answers in localStorage when displaying question: [object]
Number of saved MCQ answers: [number]
Checking saved answer for question [id]:
saved index = [value] checking against = [value] types: [type] [type]
```

## What to Check

### Scenario 1: Answers Being Overwritten
If you see:
```
Initializing empty answers for new attempt
```
When a student is returning with saved answers, then the condition check is failing.

### Scenario 2: Answers Not Being Saved Properly
Check the backend logs for:
```
Saving answer for question [id]: selectedOption=[value], type=[type]
Restored answer for question [id]: index=[value], type=[type]
```

### Scenario 3: Frontend Not Recognizing Answers
If the localStorage shows multiple answers but only one displays, check:
- The "saved index" vs "checking against" values
- Type mismatches (string vs number)

## Testing Steps

1. **Start Fresh Test**
   - Clear browser data (Ctrl+Shift+Delete)
   - Start a new exam
   - Answer 3-4 questions
   - Open console and run: `localStorage.getItem('examAnswers')`
   - Note the structure

2. **Leave and Return**
   - Close the tab
   - Return to the exam
   - Check console logs immediately
   - Run: `localStorage.getItem('examAnswers')` again
   - Compare before and after

3. **Navigate Between Questions**
   - Use next/previous buttons
   - Check if answers persist when navigating
   - Note any console errors

## Possible Causes

1. **Condition Logic Issue**: The `hasSavedAnswers` check might be incorrect
2. **Type Mismatch**: Answers saved as strings but compared as numbers
3. **Overwrite Issue**: Code path for new attempts executing for returning students
4. **Navigation Issue**: Answers cleared when loading questions

## Quick Fix Verification

Run this in console when exam loads:
```javascript
const answers = JSON.parse(localStorage.getItem('examAnswers'));
console.log('Total MCQ answers:', Object.keys(answers.mcq).length);
for(let qId in answers.mcq) {
    console.log(`Q ${qId}:`, answers.mcq[qId]);
}
```

This will show you exactly what's in localStorage.

## Report Back

Please provide:
1. All console logs from when the student returns
2. The output of the verification code above
3. Any error messages in red
4. Whether all answers are in localStorage but not displaying, or if localStorage only has one answer

This will help identify exactly where the issue is occurring.