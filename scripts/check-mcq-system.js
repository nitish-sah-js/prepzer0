/**
 * Debug script to check MCQ system status
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AllMCQQuestion = require('../models/MCQschema');
const Classification = require('../models/Classification');

async function checkMCQSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected Successfully\n');

        // Check Classifications
        console.log('='.repeat(60));
        console.log('CLASSIFICATIONS STATUS');
        console.log('='.repeat(60));

        const totalClassifications = await Classification.countDocuments();
        const activeClassifications = await Classification.countDocuments({ active: true });

        console.log(`Total classifications: ${totalClassifications}`);
        console.log(`Active classifications: ${activeClassifications}`);

        if (activeClassifications > 0) {
            console.log('\nActive Classifications List:');
            const classifications = await Classification.find({ active: true }).sort({ name: 1 });
            classifications.forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.name} (Usage: ${c.usageCount || 0})`);
            });
        } else {
            console.log('⚠️  No active classifications found!');
        }

        // Check MCQ Questions
        console.log('\n' + '='.repeat(60));
        console.log('MCQ QUESTIONS STATUS');
        console.log('='.repeat(60));

        const totalQuestions = await AllMCQQuestion.countDocuments();
        console.log(`Total MCQ questions: ${totalQuestions}`);

        if (totalQuestions > 0) {
            // Get unique classifications used in questions
            const usedClassifications = await AllMCQQuestion.distinct('classification');
            console.log(`\nClassifications used in questions: ${usedClassifications.length}`);
            console.log('List:', usedClassifications.join(', '));

            // Count by level
            const easyCount = await AllMCQQuestion.countDocuments({ level: 'Easy' });
            const mediumCount = await AllMCQQuestion.countDocuments({ level: 'Medium' });
            const hardCount = await AllMCQQuestion.countDocuments({ level: 'Hard' });

            console.log('\nQuestions by difficulty:');
            console.log(`  Easy: ${easyCount}`);
            console.log(`  Medium: ${mediumCount}`);
            console.log(`  Hard: ${hardCount}`);

            // Show sample questions
            console.log('\nSample questions (first 3):');
            const samples = await AllMCQQuestion.find().limit(3);
            samples.forEach((q, i) => {
                console.log(`\n  ${i + 1}. [${q.classification}] ${q.question.substring(0, 50)}...`);
                console.log(`     Level: ${q.level}, Marks: ${q.marks}`);
            });
        } else {
            console.log('⚠️  No MCQ questions found in database!');
        }

        // Test the controller logic
        console.log('\n' + '='.repeat(60));
        console.log('TESTING CONTROLLER LOGIC');
        console.log('='.repeat(60));

        // Simulate controller query
        const filterQuery = {};
        const page = 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const questions = await AllMCQQuestion.find(filterQuery)
            .sort({ createdAt: -1, level: 1 })
            .skip(skip)
            .limit(limit);

        console.log(`Controller query returned: ${questions.length} questions`);

        // Get distinct classifications (as controller does)
        const allClassifications = await AllMCQQuestion.distinct('classification');
        console.log(`Distinct classifications from questions: ${allClassifications.length}`);

        // Check for issues
        console.log('\n' + '='.repeat(60));
        console.log('DIAGNOSTICS');
        console.log('='.repeat(60));

        const issues = [];

        if (totalClassifications === 0) {
            issues.push('❌ No classifications in database - Run: node scripts/seed-classifications.js');
        }

        if (totalQuestions === 0) {
            issues.push('❌ No MCQ questions in database - Add questions via admin panel');
        }

        // Check for orphaned classifications in questions
        if (usedClassifications) {
            const classificationNames = classifications.map(c => c.name);
            const orphaned = usedClassifications.filter(c => !classificationNames.includes(c));
            if (orphaned.length > 0) {
                issues.push(`⚠️  Questions using non-existent classifications: ${orphaned.join(', ')}`);
            }
        }

        if (issues.length > 0) {
            console.log('Issues found:');
            issues.forEach(issue => console.log(`  ${issue}`));
        } else {
            console.log('✅ No issues detected!');
        }

        console.log('\n✨ Check completed!');

    } catch (error) {
        console.error('❌ Error during check:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the check
console.log('🔍 MCQ System Check Script');
console.log('='.repeat(60));

checkMCQSystem();