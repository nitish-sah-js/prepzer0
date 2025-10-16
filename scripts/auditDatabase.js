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

// Audit function
const auditDatabase = async () => {
    try {
        console.log('\n📊 Database Audit Report');
        console.log('================================\n');

        // Users
        const totalUsers = await User.countDocuments({});
        const adminUsers = await User.countDocuments({ usertype: 'admin' });
        const teacherUsers = await User.countDocuments({ usertype: 'teacher' });
        const studentUsers = await User.countDocuments({ usertype: 'student' });

        console.log('👥 USERS:');
        console.log(`   Total: ${totalUsers}`);
        console.log(`   - Admins: ${adminUsers}`);
        console.log(`   - Teachers: ${teacherUsers}`);
        console.log(`   - Students: ${studentUsers}`);

        if (adminUsers + teacherUsers > 0) {
            const adminTeachers = await User.find({
                $or: [{ usertype: 'admin' }, { usertype: 'teacher' }]
            }).select('email usertype fname lname');
            console.log('\n   Admin/Teacher Details:');
            adminTeachers.forEach(user => {
                console.log(`   - ${user.email} (${user.usertype}) - ${user.fname || 'N/A'} ${user.lname || ''}`);
            });
        }
        console.log('');

        // Exams
        const totalExams = await Exam.countDocuments({});
        console.log(`📝 EXAMS: ${totalExams}`);
        if (totalExams > 0) {
            const exams = await Exam.find({}).select('name questionType createdBy scheduledAt');
            exams.forEach(exam => {
                console.log(`   - ${exam.name} (${exam.questionType})`);
            });
        }
        console.log('');

        // MCQ Questions
        try {
            const MCQ = mongoose.models.MCQ || require('../models/MCQSchema');
            const totalMCQs = await MCQ.countDocuments({});
            console.log(`❓ MCQ QUESTIONS: ${totalMCQs}`);
            if (totalMCQs > 0 && totalMCQs <= 10) {
                const mcqs = await MCQ.find({}).select('question marks').limit(10);
                mcqs.forEach((mcq, idx) => {
                    const questionPreview = mcq.question ? mcq.question.substring(0, 60) + '...' : 'N/A';
                    console.log(`   ${idx + 1}. ${questionPreview} (${mcq.marks} marks)`);
                });
            } else if (totalMCQs > 10) {
                console.log(`   (Too many to display, showing count only)`);
            }
        } catch (error) {
            console.log(`❓ MCQ QUESTIONS: Unable to count (model not found)`);
        }
        console.log('');

        // Coding Questions
        try {
            const CodingQuestion = mongoose.models.CodingQuestion || require('../models/CodingQuestionSchema');
            const totalCoding = await CodingQuestion.countDocuments({});
            console.log(`💻 CODING QUESTIONS: ${totalCoding}`);
            if (totalCoding > 0 && totalCoding <= 10) {
                const codingQs = await CodingQuestion.find({}).select('title maxMarks').limit(10);
                codingQs.forEach((q, idx) => {
                    console.log(`   ${idx + 1}. ${q.title} (${q.maxMarks} marks)`);
                });
            } else if (totalCoding > 10) {
                console.log(`   (Too many to display, showing count only)`);
            }
        } catch (error) {
            console.log(`💻 CODING QUESTIONS: Unable to count (model not found)`);
        }
        console.log('');

        // Submissions
        const totalSubmissions = await Submission.countDocuments({});
        console.log(`📄 SUBMISSIONS: ${totalSubmissions}`);
        if (totalSubmissions > 0) {
            const submissions = await Submission.find({})
                .populate('student', 'email')
                .populate('exam', 'name')
                .select('student exam score submittedAt')
                .limit(5);
            submissions.forEach(sub => {
                const studentEmail = sub.student?.email || '[DELETED USER]';
                const examName = sub.exam?.name || '[DELETED EXAM]';
                console.log(`   - ${studentEmail} | ${examName} | Score: ${sub.score}`);
            });
        }
        console.log('');

        // Activity Trackers
        const totalActivity = await ActivityTracker.countDocuments({});
        console.log(`🔄 ACTIVITY TRACKERS: ${totalActivity}`);
        if (totalActivity > 0) {
            const activeCount = await ActivityTracker.countDocuments({ status: 'active' });
            const inactiveCount = await ActivityTracker.countDocuments({ status: 'inactive' });
            const offlineCount = await ActivityTracker.countDocuments({ status: 'offline' });
            console.log(`   - Active: ${activeCount}`);
            console.log(`   - Inactive: ${inactiveCount}`);
            console.log(`   - Offline: ${offlineCount}`);
        }
        console.log('');

        // Exam Candidates
        const totalCandidates = await ExamCandidate.countDocuments({});
        console.log(`👨‍🎓 EXAM CANDIDATES: ${totalCandidates}`);
        console.log('');

        // Integrity Records
        const totalIntegrity = await Integrity.countDocuments({});
        console.log(`🔒 INTEGRITY RECORDS: ${totalIntegrity}`);
        console.log('');

        // Evaluation Results
        try {
            const EvaluationResult = mongoose.models.EvaluationResult ||
                require('../models/EvaluationResultSchema');
            const totalEvaluations = await EvaluationResult.countDocuments({});
            console.log(`✅ EVALUATION RESULTS: ${totalEvaluations}`);
        } catch (error) {
            console.log(`✅ EVALUATION RESULTS: 0`);
        }
        console.log('');

        // Departments (if exists)
        try {
            const Department = mongoose.models.Department || require('../models/Department');
            const totalDepartments = await Department.countDocuments({});
            console.log(`🏢 DEPARTMENTS: ${totalDepartments}`);
            if (totalDepartments > 0) {
                const departments = await Department.find({}).select('code name');
                departments.forEach(dept => {
                    console.log(`   - ${dept.code.toUpperCase()}: ${dept.name}`);
                });
            }
        } catch (error) {
            console.log(`🏢 DEPARTMENTS: Unable to count (model not found)`);
        }

        console.log('\n================================');
        console.log('✨ Audit completed!\n');

    } catch (error) {
        console.error('❌ Error during audit:', error.message);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    await connectDB();
    await auditDatabase();
    process.exit(0);
};

// Run the script
main();
