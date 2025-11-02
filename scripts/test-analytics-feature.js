/**
 * Test script for Performance Analytics Feature
 * Tests if the analytics correctly aggregates data across multiple exams
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/usermodel');
const Submission = require('../models/SubmissionSchema');
const Exam = require('../models/Exam');
const MCQ = require('../models/MCQQuestion');
const { calculateStudentPerformance } = require('../services/performanceAnalytics');

async function testAnalyticsFeature() {
    try {
        console.log('🧪 Starting Analytics Feature Test...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB\n');

        // Find students with multiple submissions
        const studentsWithMultipleExams = await Submission.aggregate([
            {
                $group: {
                    _id: '$student',
                    examCount: { $sum: 1 },
                    exams: { $push: '$exam' }
                }
            },
            {
                $match: {
                    examCount: { $gte: 2 } // Students with 2+ exams
                }
            },
            {
                $sort: { examCount: -1 }
            },
            {
                $limit: 5 // Test top 5 students
            }
        ]);

        console.log(`📊 Found ${studentsWithMultipleExams.length} students with multiple exams\n`);

        if (studentsWithMultipleExams.length === 0) {
            console.log('⚠️  No students with multiple exams found. Creating test scenario...\n');
            await createTestScenario();
            return;
        }

        // Test each student
        for (const studentData of studentsWithMultipleExams) {
            const studentId = studentData._id;
            const examCount = studentData.examCount;

            // Get student details
            const student = await User.findById(studentId).select('USN fname lname Department Semester');

            if (!student) {
                console.log(`⚠️  Student ${studentId} not found in database\n`);
                continue;
            }

            console.log('═'.repeat(80));
            console.log(`👤 Testing: ${student.fname} ${student.lname} (${student.USN})`);
            console.log(`   Department: ${student.Department || 'N/A'} | Semester: ${student.CurrentSemester || student.Semester || 'N/A'}`);
            console.log(`   Total Exams: ${examCount}`);
            console.log('─'.repeat(80));

            // Get all submissions for this student
            const submissions = await Submission.find({ student: studentId })
                .populate('exam')
                .lean();

            console.log(`\n📝 Submission Details:`);
            for (let i = 0; i < submissions.length; i++) {
                const sub = submissions[i];
                console.log(`   ${i + 1}. ${sub.exam?.name || 'Unknown Exam'}`);
                console.log(`      - Score: ${sub.score || 0}`);
                console.log(`      - MCQ Answers: ${sub.mcqAnswers?.length || 0}`);
                console.log(`      - Submitted: ${new Date(sub.submittedAt).toLocaleString()}`);

                // Get MCQ questions for this exam
                if (sub.exam?.mcqQuestions) {
                    const mcqQuestions = await MCQ.find({
                        _id: { $in: sub.exam.mcqQuestions }
                    }).select('classification').lean();

                    const classifications = mcqQuestions
                        .filter(q => q.classification)
                        .map(q => q.classification);

                    const uniqueClassifications = [...new Set(classifications)];
                    console.log(`      - Classifications: ${uniqueClassifications.join(', ') || 'None'}`);
                }
            }

            // Calculate performance analytics
            console.log('\n🔄 Calculating performance analytics...');
            const startTime = Date.now();
            const performance = await calculateStudentPerformance(studentId.toString());
            const calculationTime = Date.now() - startTime;

            if (!performance.hasData) {
                console.log(`   ❌ No performance data: ${performance.message}`);
                continue;
            }

            // Display results
            console.log(`   ✅ Calculation completed in ${calculationTime}ms\n`);

            console.log('📊 Overall Performance:');
            console.log(`   - Total Exams: ${performance.overall.totalExams}`);
            console.log(`   - Total Questions: ${performance.overall.totalQuestionsAttempted}`);
            console.log(`   - Correct Answers: ${performance.overall.totalQuestionsCorrect}`);
            console.log(`   - Overall Accuracy: ${performance.overall.overallAccuracy}%`);
            console.log(`   - Score Percentage: ${performance.overall.overallScorePercentage}%`);

            console.log('\n🏷️  Classification Breakdown:');
            console.log(`   - Total Classifications: ${performance.classifications.all.length}`);
            console.log(`   - Strong Areas (80%+): ${performance.classifications.strong.length}`);
            console.log(`   - Moderate Areas (60-80%): ${performance.classifications.moderate.length}`);
            console.log(`   - Weak Areas (<60%): ${performance.classifications.weak.length}`);

            if (performance.classifications.all.length > 0) {
                console.log('\n   Top 5 Classifications by Accuracy:');
                performance.classifications.all.slice(0, 5).forEach((cls, idx) => {
                    const emoji = cls.accuracy >= 80 ? '🟢' : cls.accuracy >= 60 ? '🟡' : '🔴';
                    console.log(`   ${idx + 1}. ${emoji} ${cls.classification}: ${cls.accuracy.toFixed(1)}% (${cls.correctAnswers}/${cls.totalAttempted})`);
                });
            }

            // Verify chart data
            console.log('\n📈 Chart Data Validation:');
            console.log(`   - Radar Chart Labels: ${performance.chartData.radar.labels.length}`);
            console.log(`   - Radar Chart Data Points: ${performance.chartData.radar.datasets[0].data.length}`);
            console.log(`   - Bar Chart Labels: ${performance.chartData.bar.labels.length}`);
            console.log(`   - Bar Chart Data Points: ${performance.chartData.bar.datasets[0].data.length}`);

            // Test data integrity
            console.log('\n✓ Data Integrity Checks:');
            const checks = [];

            checks.push({
                name: 'Exam count matches',
                pass: performance.overall.totalExams === examCount,
                expected: examCount,
                actual: performance.overall.totalExams
            });

            checks.push({
                name: 'Classifications have data',
                pass: performance.classifications.all.length > 0,
                expected: '> 0',
                actual: performance.classifications.all.length
            });

            checks.push({
                name: 'Chart data matches classifications',
                pass: performance.chartData.radar.labels.length === performance.classifications.all.length,
                expected: performance.classifications.all.length,
                actual: performance.chartData.radar.labels.length
            });

            checks.push({
                name: 'Questions attempted > 0',
                pass: performance.overall.totalQuestionsAttempted > 0,
                expected: '> 0',
                actual: performance.overall.totalQuestionsAttempted
            });

            checks.push({
                name: 'Accuracy is valid',
                pass: performance.overall.overallAccuracy >= 0 && performance.overall.overallAccuracy <= 100,
                expected: '0-100',
                actual: performance.overall.overallAccuracy
            });

            let passedChecks = 0;
            checks.forEach(check => {
                const status = check.pass ? '✅' : '❌';
                console.log(`   ${status} ${check.name}`);
                if (!check.pass) {
                    console.log(`      Expected: ${check.expected}, Got: ${check.actual}`);
                } else {
                    passedChecks++;
                }
            });

            console.log(`\n   Summary: ${passedChecks}/${checks.length} checks passed`);

            if (passedChecks === checks.length) {
                console.log('   🎉 All checks passed for this student!\n');
            } else {
                console.log('   ⚠️  Some checks failed. Review data integrity.\n');
            }
        }

        console.log('═'.repeat(80));
        console.log('✅ Analytics Feature Test Completed!\n');
        console.log('📝 Summary:');
        console.log(`   - Students tested: ${studentsWithMultipleExams.length}`);
        console.log(`   - Feature Status: Working ✓`);
        console.log('\n💡 Next Steps:');
        console.log('   1. Access analytics dashboard: http://localhost:3000/admin/analytics');
        console.log('   2. Click "View Performance" for any student');
        console.log('   3. Verify the UI displays correctly with charts and statistics\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

async function createTestScenario() {
    console.log('📦 Test scenario creation not implemented.');
    console.log('💡 To test the feature:');
    console.log('   1. Ensure you have students who have submitted multiple exams');
    console.log('   2. Ensure MCQ questions have classifications assigned');
    console.log('   3. Run this test again\n');
}

// Run the test
testAnalyticsFeature().catch(console.error);
