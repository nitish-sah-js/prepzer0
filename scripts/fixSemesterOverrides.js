/**
 * Script to fix semester override issues
 * This script cleans up the currentSemesterOverride field for students
 * where it's no longer needed (where Semester field is already set)
 *
 * Usage: node scripts/fixSemesterOverrides.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/usermodel');

async function fixSemesterOverrides() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codingplatform', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('🔗 MongoDB Connected Successfully');
        console.log('');
        console.log('🔍 Finding students with semester override issues...');

        // Find all students who have both Semester and currentSemesterOverride set
        const studentsWithOverride = await User.find({
            usertype: 'student',
            currentSemesterOverride: { $exists: true, $ne: null },
            Semester: { $exists: true, $ne: null }
        }).select('USN fname lname Semester currentSemesterOverride Department');

        if (studentsWithOverride.length === 0) {
            console.log('✅ No students found with semester override issues!');
            console.log('   All students are using the correct semester field.');
            process.exit(0);
        }

        console.log(`📊 Found ${studentsWithOverride.length} students with semester override values`);
        console.log('');

        // Show sample of affected students
        console.log('Sample of affected students:');
        console.log('============================');

        const samplesToShow = Math.min(5, studentsWithOverride.length);
        for (let i = 0; i < samplesToShow; i++) {
            const student = studentsWithOverride[i];
            console.log(`  USN: ${student.USN}`);
            console.log(`  Name: ${student.fname} ${student.lname}`);
            console.log(`  Department: ${student.Department}`);
            console.log(`  Current Semester: ${student.Semester}`);
            console.log(`  Override Value: ${student.currentSemesterOverride}`);
            console.log('  ---');
        }

        if (studentsWithOverride.length > 5) {
            console.log(`  ... and ${studentsWithOverride.length - 5} more students`);
        }
        console.log('');

        // Ask for confirmation
        const answer = await new Promise((resolve) => {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Do you want to fix these issues? This will:\n' +
                        '  1. Keep the Semester field value\n' +
                        '  2. Remove the currentSemesterOverride field\n' +
                        'Continue? (y/n): ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });

        if (answer.toLowerCase() !== 'y') {
            console.log('❌ Operation cancelled');
            process.exit(0);
        }

        console.log('');
        console.log('🔧 Fixing semester overrides...');

        // Update all affected students
        const updateResult = await User.updateMany(
            {
                usertype: 'student',
                currentSemesterOverride: { $exists: true, $ne: null },
                Semester: { $exists: true, $ne: null }
            },
            {
                $unset: { currentSemesterOverride: "" }
            }
        );

        console.log('');
        console.log('✅ Fix completed successfully!');
        console.log('=================================');
        console.log(`📊 Students updated: ${updateResult.modifiedCount}`);
        console.log(`📊 Students matched: ${updateResult.matchedCount}`);
        console.log('');
        console.log('✨ All students are now using their correct Semester field!');

    } catch (error) {
        console.error('❌ Error fixing semester overrides:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the fix function
fixSemesterOverrides();