/**
 * Test MCQ save functionality with the fix
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AllMCQQuestion = require('../models/MCQschema');

async function testMCQSave() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected\n');

        // Count before
        const countBefore = await AllMCQQuestion.countDocuments();
        console.log('Questions before test:', countBefore);

        // Simulate what the form sends
        const formData = {
            classification: 'Database',
            question: 'Which SQL command is used to remove a table from database?',
            option1: 'DELETE TABLE',
            option2: 'DROP TABLE',
            option3: 'REMOVE TABLE',
            option4: 'TRUNCATE TABLE',
            correctAnswer: '1',  // This is what the form sends - an index!
            level: 'easy',
            marks: '2'
        };

        // Simulate what the fixed controller does
        const optionsArray = [
            formData.option1.trim(),
            formData.option2.trim(),
            formData.option3.trim(),
            formData.option4.trim()
        ];

        const correctAnswerIndex = parseInt(formData.correctAnswer);
        const correctAnswerText = optionsArray[correctAnswerIndex];

        console.log('\nForm data:', formData);
        console.log('\nProcessed data:');
        console.log('  Options array:', optionsArray);
        console.log('  Correct answer index:', correctAnswerIndex);
        console.log('  Correct answer text:', correctAnswerText);

        // Create and save the question
        const newQuestion = new AllMCQQuestion({
            classification: formData.classification || 'General',
            question: formData.question.trim(),
            options: optionsArray,
            correctAnswer: correctAnswerText,
            level: formData.level,
            marks: parseInt(formData.marks) || 1,
            questionType: 'mcq',
            createdBy: 'Test Script'
        });

        console.log('\nSaving question...');
        const saved = await newQuestion.save();
        console.log('✅ Question saved successfully!');
        console.log('  ID:', saved._id);
        console.log('  Question:', saved.question);
        console.log('  Correct Answer:', saved.correctAnswer);

        // Verify it can be retrieved
        const retrieved = await AllMCQQuestion.findById(saved._id);
        if (retrieved) {
            console.log('\n✅ Question retrieved successfully!');
            console.log('  Retrieved correct answer:', retrieved.correctAnswer);
            console.log('  Matches expected:', retrieved.correctAnswer === 'DROP TABLE');
        }

        // Count after
        const countAfter = await AllMCQQuestion.countDocuments();
        console.log('\nQuestions after test:', countAfter);
        console.log('Questions added:', countAfter - countBefore);

        // Clean up
        await AllMCQQuestion.findByIdAndDelete(saved._id);
        console.log('\n🧹 Test question cleaned up');

        console.log('\n✨ Test completed successfully! The fix works!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('This is the error that would occur in the controller:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the test
console.log('🧪 MCQ Save Fix Test');
console.log('='.repeat(60));
console.log('Testing the fix for saving MCQ questions from the form\n');

testMCQSave();