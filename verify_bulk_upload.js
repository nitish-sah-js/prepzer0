/**
 * Verify Bulk Student Upload
 * Run this script to check if bulk uploaded students exist in database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/usermodel');

const dburl = process.env.MONGODB_URI;

async function verifyBulkUpload() {
    try {
        // Connect to database
        await mongoose.connect(dburl, { useNewUrlParser: true });
        console.log('✅ Connected to database\n');

        // Find all bulk test students
        const testStudents = await User.find({
            email: { $regex: /^bulktest.*@test\.com$/ }
        }).select('email USN Department Semester fname lname phone usertype userallowed active');

        console.log('📊 Bulk Upload Verification Results:');
        console.log('=====================================\n');

        if (testStudents.length === 0) {
            console.log('❌ No bulk test students found in database!');
            console.log('   Expected emails: bulktest1@test.com to bulktest5@test.com\n');
        } else {
            console.log(`✅ Found ${testStudents.length} bulk test student(s):\n`);

            testStudents.forEach((student, index) => {
                console.log(`Student ${index + 1}:`);
                console.log(`  Email:      ${student.email}`);
                console.log(`  USN:        ${student.USN}`);
                console.log(`  Department: ${student.Department}`);
                console.log(`  Semester:   ${student.Semester}`);
                console.log(`  Name:       ${student.fname} ${student.lname}`);
                console.log(`  Phone:      ${student.phone || 'N/A'}`);
                console.log(`  Type:       ${student.usertype}`);
                console.log(`  Allowed:    ${student.userallowed ? 'Yes' : 'No'}`);
                console.log(`  Active:     ${student.active ? 'Yes' : 'No'}`);
                console.log('');
            });

            // Verify specific data
            console.log('🔍 Data Verification:');
            console.log('=====================\n');

            const expectedEmails = [
                'bulktest1@test.com',
                'bulktest2@test.com',
                'bulktest3@test.com',
                'bulktest4@test.com',
                'bulktest5@test.com'
            ];

            expectedEmails.forEach(email => {
                const found = testStudents.find(s => s.email === email);
                if (found) {
                    console.log(`✅ ${email} - FOUND`);
                } else {
                    console.log(`❌ ${email} - MISSING`);
                }
            });

            console.log('\n🎯 Summary:');
            console.log('===========');
            console.log(`Total expected: 5`);
            console.log(`Total found:    ${testStudents.length}`);
            console.log(`Status:         ${testStudents.length === 5 ? '✅ SUCCESS' : '⚠️  INCOMPLETE'}\n`);
        }

        // Close connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyBulkUpload();
