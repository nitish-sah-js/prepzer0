/**
 * Verify Analytics Data - Check what data exists for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/usermodel');
const Submission = require('../models/SubmissionSchema');
const Exam = require('../models/Exam');
const MCQ = require('../models/MCQQuestion');
const { calculateStudentPerformance } = require('../services/performanceAnalytics');

async function verifyAnalyticsData() {
    try {
        console.log('🔍 Verifying Analytics Data...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB\n');

        // Check total counts
        const totalStudents = await User.countDocuments({ usertype: 'student' });
        const totalSubmissions = await Submission.countDocuments();
        const totalExams = await Exam.countDocuments();
        const totalMCQs = await MCQ.countDocuments();

        console.log('📊 Database Statistics:');
        console.log(`   - Total Students: ${totalStudents}`);
        console.log(`   - Total Submissions: ${totalSubmissions}`);
        console.log(`   - Total Exams: ${totalExams}`);
        console.log(`   - Total MCQ Questions: ${totalMCQs}\n`);

        if (totalSubmissions === 0) {
            console.log('❌ No submissions found. Cannot test analytics feature.');
            console.log('💡 Students need to take exams first.\n');
            await mongoose.connection.close();
            return;
        }

        // Find all students with submissions
        const studentsWithSubmissions = await Submission.aggregate([
            {
                $group: {
                    _id: '$student',
                    examCount: { $sum: 1 },
                    submissions: { $push: '$_id' }
                }
            },
            {
                $sort: { examCount: -1 }
            }
        ]);

        console.log(`📝 Students with Submissions: ${studentsWithSubmissions.length}`);
        console.log(`   - With 1 exam: ${studentsWithSubmissions.filter(s => s.examCount === 1).length}`);
        console.log(`   - With 2+ exams: ${studentsWithSubmissions.filter(s => s.examCount >= 2).length}`);
        console.log(`   - With 5+ exams: ${studentsWithSubmissions.filter(s => s.examCount >= 5).length}\n`);

        // Check MCQ classification coverage
        const mcqsWithClassification = await MCQ.countDocuments({
            classification: { $exists: true, $ne: null, $ne: '' }
        });
        const classificationPercentage = totalMCQs > 0 ? ((mcqsWithClassification / totalMCQs) * 100).toFixed(1) : 0;

        console.log('🏷️  MCQ Classification Coverage:');
        console.log(`   - Questions with classification: ${mcqsWithClassification}/${totalMCQs} (${classificationPercentage}%)`);

        const classifications = await MCQ.distinct('classification', {
            classification: { $exists: true, $ne: null, $ne: '' }
        });
        console.log(`   - Unique classifications: ${classifications.length}`);
        if (classifications.length > 0) {
            console.log(`   - Classifications: ${classifications.slice(0, 10).join(', ')}${classifications.length > 10 ? '...' : ''}\n`);
        } else {
            console.log('   ⚠️  No classifications found in MCQ questions!\n');
        }

        // Test with top students
        console.log('═'.repeat(80));
        console.log('🧪 Testing Analytics Calculation...\n');

        const testCases = studentsWithSubmissions.slice(0, 3); // Test top 3 students

        for (let i = 0; i < testCases.length; i++) {
            const studentData = testCases[i];
            const studentId = studentData._id;

            // Get student details
            const student = await User.findById(studentId)
                .select('USN fname lname email Department Semester Year currentSemesterOverride usertype');

            if (!student) {
                console.log(`⚠️  Student ${studentId} not found\n`);
                continue;
            }

            console.log(`\n${i + 1}. Testing: ${student.fname} ${student.lname} (${student.USN})`);
            console.log(`   Exams taken: ${studentData.examCount}`);

            // Calculate performance
            console.log('   Calculating performance...');
            const startTime = Date.now();
            const performance = await calculateStudentPerformance(studentId.toString());
            const calculationTime = Date.now() - startTime;

            if (!performance.hasData) {
                console.log(`   ❌ Failed: ${performance.message}\n`);
                continue;
            }

            console.log(`   ✅ Success! (${calculationTime}ms)`);
            console.log(`   📊 Results:`);
            console.log(`      - Exams: ${performance.overall.totalExams}`);
            console.log(`      - Questions: ${performance.overall.totalQuestionsAttempted}`);
            console.log(`      - Correct: ${performance.overall.totalQuestionsCorrect}`);
            console.log(`      - Accuracy: ${performance.overall.overallAccuracy.toFixed(2)}%`);
            console.log(`      - Classifications found: ${performance.classifications.all.length}`);

            if (performance.classifications.all.length > 0) {
                console.log(`      - Strong areas: ${performance.classifications.strong.length}`);
                console.log(`      - Moderate areas: ${performance.classifications.moderate.length}`);
                console.log(`      - Weak areas: ${performance.classifications.weak.length}`);

                // Show top 3 classifications
                const top3 = performance.classifications.all.slice(0, 3);
                console.log(`      - Top classifications:`);
                top3.forEach(cls => {
                    console.log(`        • ${cls.classification}: ${cls.accuracy.toFixed(1)}% (${cls.correctAnswers}/${cls.totalAttempted})`);
                });
            } else {
                console.log(`      ⚠️  No classifications found in answers`);
            }
        }

        console.log('\n═'.repeat(80));
        console.log('\n✅ Data Verification Complete!\n');

        if (studentsWithSubmissions.length === 0) {
            console.log('❌ Status: No data to test');
            console.log('💡 Action: Have students take exams first\n');
        } else if (mcqsWithClassification === 0) {
            console.log('⚠️  Status: Data exists but no classifications');
            console.log('💡 Action: Ensure MCQ questions have classifications assigned\n');
        } else if (studentsWithSubmissions.filter(s => s.examCount >= 2).length === 0) {
            console.log('⚠️  Status: Only single-exam submissions');
            console.log('💡 Action: To fully test multi-exam aggregation, have students take multiple exams\n');
        } else {
            console.log('✅ Status: Ready for full testing');
            console.log('💡 Action: Access http://localhost:3000/admin/analytics to view reports\n');
        }

        console.log('📋 Test URLs:');
        if (testCases.length > 0) {
            testCases.forEach((tc, idx) => {
                console.log(`   ${idx + 1}. http://localhost:3000/admin/analytics/student/${tc._id}`);
            });
        }
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

verifyAnalyticsData().catch(console.error);
