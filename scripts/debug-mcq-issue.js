/**
 * Debug script to find MCQ questions mismatch issue
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugMCQIssue() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected\n');

        const db = mongoose.connection.db;

        // Check allmcqquestions collection
        console.log('='.repeat(60));
        console.log('ALLMCQQUESTIONS COLLECTION');
        console.log('='.repeat(60));

        const allmcqCount = await db.collection('allmcqquestions').countDocuments();
        console.log('Total documents:', allmcqCount);

        const allmcqClassifications = await db.collection('allmcqquestions').distinct('classification');
        console.log('Classifications:', allmcqClassifications);

        // Check if MCQ questions are stored inside exam documents
        console.log('\n' + '='.repeat(60));
        console.log('MCQ QUESTIONS IN EXAMS COLLECTION');
        console.log('='.repeat(60));

        const examsWithMCQ = await db.collection('exams').find({
            'mcqQuestions.0': { $exists: true }
        }).toArray();

        console.log(`Found ${examsWithMCQ.length} exams with MCQ questions`);

        let totalExamQuestions = 0;
        const examClassifications = new Set();

        examsWithMCQ.forEach(exam => {
            const questionCount = exam.mcqQuestions?.length || 0;
            totalExamQuestions += questionCount;

            exam.mcqQuestions?.forEach(q => {
                if (q.classification) {
                    examClassifications.add(q.classification);
                }
            });

            console.log(`  - Exam ${exam._id}: ${questionCount} questions`);
        });

        console.log(`\nTotal MCQ questions embedded in exams: ${totalExamQuestions}`);
        console.log('Classifications in exam questions:', Array.from(examClassifications));

        // Check for any other MCQ-related collections
        console.log('\n' + '='.repeat(60));
        console.log('ALL COLLECTIONS IN DATABASE');
        console.log('='.repeat(60));

        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name).sort());

        // Check MCQQuestion model (if it exists)
        const mcqquestionCount = await db.collection('mcqquestions').countDocuments();
        if (mcqquestionCount > 0) {
            console.log(`\nFound ${mcqquestionCount} documents in 'mcqquestions' collection`);
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`allmcqquestions collection: ${allmcqCount} questions`);
        console.log(`Questions embedded in exams: ${totalExamQuestions} questions`);
        console.log(`Total: ${allmcqCount + totalExamQuestions} questions`);

        // Check what the controller might be showing
        console.log('\n' + '='.repeat(60));
        console.log('WHAT THE UI SHOWS vs DATABASE');
        console.log('='.repeat(60));
        console.log('UI shows: 42 questions');
        console.log('Database has:');
        console.log(`  - allmcqquestions: ${allmcqCount} questions`);
        console.log(`  - embedded in exams: ${totalExamQuestions} questions`);

        if (allmcqCount + totalExamQuestions === 42) {
            console.log('\n⚠️  ISSUE FOUND: Controller might be showing BOTH:');
            console.log('  1. Questions from allmcqquestions collection');
            console.log('  2. Questions embedded in exam documents');
            console.log('  This causes duplication and confusion!');
        } else if (totalExamQuestions === 42) {
            console.log('\n⚠️  ISSUE FOUND: Controller is showing questions from exams, not allmcqquestions!');
        }

        console.log('\n✨ Debug completed!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the debug
console.log('🔍 MCQ Issue Debug Script');
console.log('='.repeat(60));

debugMCQIssue();