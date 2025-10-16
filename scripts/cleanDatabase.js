const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/usermodel');
const Submission = require('../models/SubmissionSchema');
const ActivityTracker = require('../models/ActiveSession');
const Exam = require('../models/Exam');
const ExamCandidate = require('../models/ExamCandidate');
const Integrity = require('../models/Integrity');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepzero', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// Cleanup function
const cleanDatabase = async () => {
    try {
        console.log('\n🧹 Starting Database Cleanup...\n');
        console.log('⚠️  WARNING: This will delete most data from the database!');
        console.log('✅ KEEPING: Admin/Teacher users, MCQ questions');
        console.log('❌ DELETING: Students, Submissions, Exams, Activity Trackers, Exam Candidates, Integrity records\n');

        // Wait 3 seconds before proceeding
        console.log('⏳ Starting in 3 seconds... Press Ctrl+C to cancel\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const results = {
            submissions: 0,
            activityTrackers: 0,
            examCandidates: 0,
            integrityRecords: 0,
            evaluationResults: 0,
            exams: 0,
            students: 0
        };

        // 1. Delete all Submissions
        console.log('🗑️  Deleting Submissions...');
        const submissionResult = await Submission.deleteMany({});
        results.submissions = submissionResult.deletedCount;
        console.log(`   ✅ Deleted ${results.submissions} submissions`);

        // 2. Delete all Activity Trackers
        console.log('🗑️  Deleting Activity Trackers...');
        const activityResult = await ActivityTracker.deleteMany({});
        results.activityTrackers = activityResult.deletedCount;
        console.log(`   ✅ Deleted ${results.activityTrackers} activity trackers`);

        // 3. Delete all Exam Candidates
        console.log('🗑️  Deleting Exam Candidates...');
        const examCandidateResult = await ExamCandidate.deleteMany({});
        results.examCandidates = examCandidateResult.deletedCount;
        console.log(`   ✅ Deleted ${results.examCandidates} exam candidates`);

        // 4. Delete all Integrity records
        console.log('🗑️  Deleting Integrity Records...');
        const integrityResult = await Integrity.deleteMany({});
        results.integrityRecords = integrityResult.deletedCount;
        console.log(`   ✅ Deleted ${results.integrityRecords} integrity records`);

        // 5. Delete Evaluation Results if the model exists
        console.log('🗑️  Deleting Evaluation Results...');
        try {
            const EvaluationResult = mongoose.models.EvaluationResult ||
                require('../models/EvaluationResultSchema');
            const evaluationResult = await EvaluationResult.deleteMany({});
            results.evaluationResults = evaluationResult.deletedCount;
            console.log(`   ✅ Deleted ${results.evaluationResults} evaluation results`);
        } catch (error) {
            console.log(`   ⚠️  Evaluation Results model not found or already deleted`);
        }

        // 6. Delete all Exams
        console.log('🗑️  Deleting Exams...');
        const examResult = await Exam.deleteMany({});
        results.exams = examResult.deletedCount;
        console.log(`   ✅ Deleted ${results.exams} exams`);

        // 7. Delete Student users (keep admin and teacher)
        console.log('🗑️  Deleting Student Users...');
        const studentResult = await User.deleteMany({
            usertype: 'student'
        });
        results.students = studentResult.deletedCount;
        console.log(`   ✅ Deleted ${results.students} student users`);

        // 8. Count what's remaining
        console.log('\n📊 Remaining Data:');
        console.log('================================');
        const remainingAdmins = await User.countDocuments({
            $or: [{ usertype: 'admin' }, { usertype: 'teacher' }]
        });
        console.log(`👥 Admin/Teacher Users: ${remainingAdmins}`);

        try {
            const MCQ = mongoose.models.MCQ || require('../models/MCQSchema');
            const remainingMCQs = await MCQ.countDocuments({});
            console.log(`❓ MCQ Questions: ${remainingMCQs}`);
        } catch (error) {
            console.log(`❓ MCQ Questions: Unable to count (model not found)`);
        }

        try {
            const CodingQuestion = mongoose.models.CodingQuestion || require('../models/CodingQuestionSchema');
            const remainingCoding = await CodingQuestion.countDocuments({});
            console.log(`💻 Coding Questions: ${remainingCoding}`);
        } catch (error) {
            console.log(`💻 Coding Questions: Unable to count (model not found)`);
        }
        console.log('================================\n');

        // Summary
        console.log('📊 Cleanup Summary:');
        console.log('================================');
        console.log(`Submissions deleted: ${results.submissions}`);
        console.log(`Activity Trackers deleted: ${results.activityTrackers}`);
        console.log(`Exam Candidates deleted: ${results.examCandidates}`);
        console.log(`Integrity Records deleted: ${results.integrityRecords}`);
        console.log(`Evaluation Results deleted: ${results.evaluationResults}`);
        console.log(`Exams deleted: ${results.exams}`);
        console.log(`Student Users deleted: ${results.students}`);
        console.log('================================\n');

        console.log('✨ Database cleanup completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        console.error(error);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    console.log('\n🧹 Database Cleanup Script\n');

    await connectDB();
    await cleanDatabase();

    process.exit(0);
};

// Run the script
main();
