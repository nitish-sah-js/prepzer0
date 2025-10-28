const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/usermodel');
const Exam = require('../models/Exam');
const Submission = require('../models/SubmissionSchema');
const PartialSubmission = require('../models/PartialSubmission');
const MCQQuestion = require('../models/MCQQuestion');
const ActiveSession = require('../models/ActiveSession');
const Integrity = require('../models/Integrity');
const ExamCandidate = require('../models/ExamCandidate');
const Department = require('../models/Department');

async function findById(targetId) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        console.log(`\nSearching for ID: ${targetId}\n`);

        let found = false;

        // Check if it's a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            console.log('❌ Invalid ObjectId format');
            return;
        }

        const objectId = new mongoose.Types.ObjectId(targetId);

        // Check User collection
        const user = await User.findById(objectId);
        if (user) {
            console.log('✅ Found in User collection:');
            console.log('===========================');
            console.log('Name:', user.fname, user.lname);
            console.log('Email:', user.email);
            console.log('USN:', user.USN);
            console.log('Department:', user.Department);
            console.log('User Type:', user.usertype);
            console.log('Semester:', user.Semester);
            console.log('Current Semester:', user.CurrentSemester);
            console.log('Active:', user.active);
            console.log('User Allowed:', user.userallowed);
            console.log('Created:', user.created);
            console.log('Current Session ID:', user.currentSessionId);
            console.log('\nFull User Object:');
            console.log(JSON.stringify(user.toObject(), null, 2));
            found = true;
        }

        // Check Exam collection
        const exam = await Exam.findById(objectId).populate('createdBy');
        if (exam) {
            console.log('✅ Found in Exam collection:');
            console.log('===========================');
            console.log('Exam Name:', exam.name);
            console.log('Departments:', exam.departments);
            console.log('Semester:', exam.semester);
            console.log('Duration:', exam.duration, 'minutes');
            console.log('Questions:', exam.mcqQuestions?.length || 0);
            console.log('Created By:', exam.createdBy?.fname, exam.createdBy?.lname);
            console.log('Scheduled At:', exam.scheduledAt);
            console.log('Schedule Till:', exam.scheduleTill);
            console.log('\nFull Exam Object:');
            console.log(JSON.stringify(exam.toObject(), null, 2));
            found = true;
        }

        // Check Submission collection
        const submission = await Submission.findById(objectId).populate('student exam');
        if (submission) {
            console.log('✅ Found in Submission collection:');
            console.log('===================================');
            console.log('Student:', submission.student?.fname, submission.student?.lname);
            console.log('Exam:', submission.exam?.name);
            console.log('Score:', submission.score);
            console.log('Submitted At:', submission.submittedAt);
            console.log('MCQ Answers:', submission.mcqAnswers?.length || 0);
            console.log('\nFull Submission Object:');
            console.log(JSON.stringify(submission.toObject(), null, 2));
            found = true;
        }

        // Check PartialSubmission collection
        const partialSubmission = await PartialSubmission.findById(objectId).populate('student exam');
        if (partialSubmission) {
            console.log('✅ Found in PartialSubmission collection:');
            console.log('=========================================');
            console.log('Student:', partialSubmission.student?.fname, partialSubmission.student?.lname);
            console.log('Exam:', partialSubmission.exam?.name);
            console.log('MCQ Answers:', partialSubmission.mcqAnswers?.length || 0);
            console.log('Time Remaining:', partialSubmission.timeRemaining, 'seconds');
            console.log('Last Saved At:', partialSubmission.lastSavedAt);
            console.log('Exam Started At:', partialSubmission.examStartedAt);
            console.log('\nFull PartialSubmission Object:');
            console.log(JSON.stringify(partialSubmission.toObject(), null, 2));
            found = true;
        }

        // Check MCQQuestion collection
        const mcqQuestion = await MCQQuestion.findById(objectId);
        if (mcqQuestion) {
            console.log('✅ Found in MCQQuestion collection:');
            console.log('===================================');
            console.log('Question:', mcqQuestion.question || mcqQuestion.questionTitle);
            console.log('Options:', mcqQuestion.options);
            console.log('Correct Answer:', mcqQuestion.correctAnswer);
            console.log('Marks:', mcqQuestion.marks);
            console.log('Difficulty:', mcqQuestion.difficulty);
            console.log('\nFull MCQQuestion Object:');
            console.log(JSON.stringify(mcqQuestion.toObject(), null, 2));
            found = true;
        }

        // Check ActiveSession collection
        const activeSession = await ActiveSession.findById(objectId);
        if (activeSession) {
            console.log('✅ Found in ActiveSession collection:');
            console.log('=====================================');
            console.log('User ID:', activeSession.userId);
            console.log('Exam ID:', activeSession.examId);
            console.log('Status:', activeSession.status);
            console.log('Last Ping:', activeSession.lastPingTimestamp);
            console.log('\nFull ActiveSession Object:');
            console.log(JSON.stringify(activeSession.toObject(), null, 2));
            found = true;
        }

        // Check Department collection
        const department = await Department.findById(objectId);
        if (department) {
            console.log('✅ Found in Department collection:');
            console.log('==================================');
            console.log('Code:', department.code);
            console.log('Name:', department.name);
            console.log('Full Name:', department.fullName);
            console.log('Active:', department.active);
            console.log('\nFull Department Object:');
            console.log(JSON.stringify(department.toObject(), null, 2));
            found = true;
        }

        // Also check if this ID appears in any relationships
        console.log('\n=== Checking Related Documents ===\n');

        // Check if it's a user ID in submissions
        const userSubmissions = await Submission.find({ student: objectId }).populate('exam');
        if (userSubmissions.length > 0) {
            console.log(`Found ${userSubmissions.length} submissions for this user:`);
            userSubmissions.forEach((sub, index) => {
                console.log(`  ${index + 1}. Exam: ${sub.exam?.name}, Score: ${sub.score}, Date: ${sub.submittedAt}`);
            });
        }

        // Check if it's a user ID in partial submissions
        const userPartials = await PartialSubmission.find({ student: objectId }).populate('exam');
        if (userPartials.length > 0) {
            console.log(`Found ${userPartials.length} partial submissions for this user:`);
            userPartials.forEach((partial, index) => {
                console.log(`  ${index + 1}. Exam: ${partial.exam?.name}, Answers: ${partial.mcqAnswers?.length || 0}, Last Saved: ${partial.lastSavedAt}`);
            });
        }

        // Check if it's an exam ID in submissions
        const examSubmissions = await Submission.find({ exam: objectId }).populate('student');
        if (examSubmissions.length > 0) {
            console.log(`Found ${examSubmissions.length} submissions for this exam:`);
            examSubmissions.forEach((sub, index) => {
                console.log(`  ${index + 1}. Student: ${sub.student?.fname} ${sub.student?.lname}, Score: ${sub.score}`);
            });
        }

        if (!found) {
            console.log('❌ ID not found in any primary collection');
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Get ID from command line argument or use the one you provided
const searchId = process.argv[2] || '690115daf0c8872469aa53b9';

console.log('🔍 MongoDB Document Finder\n');
findById(searchId);