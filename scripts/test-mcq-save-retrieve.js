/**
 * Test MCQ save and retrieve functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AllMCQQuestion = require('../models/MCQschema');
const Classification = require('../models/Classification');

async function testMCQOperations() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected\n');

        // Test 1: Check current state
        console.log('='.repeat(60));
        console.log('TEST 1: CURRENT STATE');
        console.log('='.repeat(60));

        const currentCount = await AllMCQQuestion.countDocuments();
        console.log('Current MCQ questions in database:', currentCount);

        const currentClassifications = await AllMCQQuestion.distinct('classification');
        console.log('Current classifications in questions:', currentClassifications);

        // Test 2: Check Classification model
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: CLASSIFICATION MODEL');
        console.log('='.repeat(60));

        const allClassifications = await Classification.find({ active: true }).sort({ name: 1 });
        console.log('Total classifications available:', allClassifications.length);
        console.log('Classifications:');
        allClassifications.forEach(c => console.log('  -', c.name));

        // Test 3: Try to save a new question
        console.log('\n' + '='.repeat(60));
        console.log('TEST 3: SAVING A NEW QUESTION');
        console.log('='.repeat(60));

        const testQuestion = {
            classification: 'Database',
            question: 'Test Question: What is a primary key?',
            options: ['A unique identifier', 'A foreign key', 'An index', 'A constraint'],
            correctAnswer: 'A unique identifier',
            level: 'easy',
            marks: 1,
            questionType: 'mcq',
            createdBy: 'Test Script'
        };

        console.log('Attempting to save:', testQuestion);

        try {
            const newQuestion = new AllMCQQuestion(testQuestion);
            const saved = await newQuestion.save();
            console.log('✅ Question saved successfully!');
            console.log('Saved ID:', saved._id);

            // Test 4: Retrieve the saved question
            console.log('\n' + '='.repeat(60));
            console.log('TEST 4: RETRIEVING THE SAVED QUESTION');
            console.log('='.repeat(60));

            const retrieved = await AllMCQQuestion.findById(saved._id);
            if (retrieved) {
                console.log('✅ Question retrieved successfully!');
                console.log('Question:', retrieved.question);
                console.log('Classification:', retrieved.classification);
            } else {
                console.log('❌ Failed to retrieve the saved question');
            }

            // Test 5: Count after save
            console.log('\n' + '='.repeat(60));
            console.log('TEST 5: COUNT AFTER SAVE');
            console.log('='.repeat(60));

            const newCount = await AllMCQQuestion.countDocuments();
            console.log('New total count:', newCount);
            console.log('Questions added:', newCount - currentCount);

            // Clean up - delete the test question
            await AllMCQQuestion.findByIdAndDelete(saved._id);
            console.log('\n🧹 Test question deleted for cleanup');

        } catch (saveError) {
            console.error('❌ Error saving question:', saveError.message);
            console.error('Full error:', saveError);
        }

        // Test 6: Check collection name
        console.log('\n' + '='.repeat(60));
        console.log('TEST 6: COLLECTION VERIFICATION');
        console.log('='.repeat(60));

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const mcqCollections = collections.filter(c =>
            c.name.toLowerCase().includes('mcq') ||
            c.name.toLowerCase().includes('question')
        );

        console.log('MCQ-related collections:');
        for (const col of mcqCollections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`  - ${col.name}: ${count} documents`);
        }

        console.log('\n✨ All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the tests
console.log('🧪 MCQ Save & Retrieve Test');
console.log('='.repeat(60));

testMCQOperations();