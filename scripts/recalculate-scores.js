/**
 * Script to recalculate scores for existing submissions
 * Run this to fix submissions that have incorrect scores due to the bug
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Submission = require('../models/SubmissionSchema');
const MCQQuestion = require('../models/MCQQuestion');

// Use the MongoDB connection string from environment
const dburl = process.env.MONGODB_URI;

if (!dburl) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
}

async function recalculateScores() {
    try {
        // Connect to MongoDB
        await mongoose.connect(dburl);
        console.log('✅ Connected to MongoDB');

        // Find all submissions
        const submissions = await Submission.find({}).lean();
        console.log(`📊 Found ${submissions.length} submissions`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const submission of submissions) {
            // Only process MCQ submissions
            if (!submission.mcqAnswers || submission.mcqAnswers.length === 0) {
                skippedCount++;
                continue;
            }

            // Recalculate score
            let totalScore = 0;
            for (const answer of submission.mcqAnswers) {
                const question = await MCQQuestion.findById(answer.questionId);
                if (question && question.correctAnswer === answer.selectedOption) {
                    totalScore += question.marks || 1;
                }
            }

            // Update submission if score changed
            if (totalScore !== submission.score) {
                await Submission.updateOne(
                    { _id: submission._id },
                    { $set: { score: totalScore } }
                );
                console.log(`✅ Updated submission ${submission._id}: ${submission.score} → ${totalScore}`);
                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('\n📈 Summary:');
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total: ${submissions.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
recalculateScores();
