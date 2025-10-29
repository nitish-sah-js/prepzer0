/**
 * Check cloud database MCQ status
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkCloudDB() {
    try {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'codingplatform';

        console.log('Connecting to cloud database...');
        console.log('URI:', uri.replace(/:[^:]*@/, ':***@'));
        console.log('Database:', dbName);

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: dbName
        });
        console.log('✅ Connected to cloud MongoDB\n');

        const db = mongoose.connection.db;

        // Check allmcqquestions collection
        console.log('='.repeat(60));
        console.log('ALLMCQQUESTIONS COLLECTION STATUS');
        console.log('='.repeat(60));

        const count = await db.collection('allmcqquestions').countDocuments();
        console.log('Total documents:', count);

        const classifications = await db.collection('allmcqquestions').distinct('classification');
        console.log('\nClassifications found:');
        classifications.sort().forEach(c => console.log('  -', c));

        // Show sample questions
        const samples = await db.collection('allmcqquestions').find().limit(5).toArray();
        console.log('\nFirst 5 questions:');
        samples.forEach((q, i) => {
            console.log(`\n${i + 1}. [${q.classification}] Level: ${q.level}`);
            console.log(`   ${q.question?.substring(0, 60)}...`);
            console.log(`   Created by: ${q.createdBy || 'Unknown'}`);
        });

        // Check for questions with specific classifications from screenshot
        console.log('\n' + '='.repeat(60));
        console.log('CHECKING FOR SPECIFIC CLASSIFICATIONS');
        console.log('='.repeat(60));

        const screenshotClassifications = [
            'DBMS',
            'Data Structures',
            'Networking',
            'Object-Oriented Programming',
            'Operating Systems'
        ];

        for (const classification of screenshotClassifications) {
            const count = await db.collection('allmcqquestions').countDocuments({ classification });
            console.log(`${classification}: ${count} questions`);
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total questions in database: ${count}`);
        console.log('The UI shows 42 questions');

        if (count !== 42) {
            console.log('\n⚠️  MISMATCH DETECTED!');
            console.log(`Database has ${count} but UI shows 42`);
            console.log('\nPossible causes:');
            console.log('1. Browser cache showing old data');
            console.log('2. Server-side cache');
            console.log('3. Multiple database connections');
            console.log('4. Questions stored elsewhere');
        }

        console.log('\n✨ Check completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the check
console.log('🔍 Cloud Database MCQ Check');
console.log('='.repeat(60));

checkCloudDB();