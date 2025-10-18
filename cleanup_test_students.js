/**
 * Cleanup Test Students
 * Removes bulk test students from database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/usermodel');

const dburl = process.env.MONGODB_URI;

async function cleanupTestStudents() {
    try {
        // Connect to database
        await mongoose.connect(dburl, { useNewUrlParser: true });
        console.log('✅ Connected to database\n');

        // Find test students first
        const testStudents = await User.find({
            email: { $regex: /^bulktest.*@test\.com$/ }
        });

        console.log(`Found ${testStudents.length} test student(s) to delete\n`);

        if (testStudents.length === 0) {
            console.log('✅ No test students found. Database is clean.');
        } else {
            // Delete test students
            const result = await User.deleteMany({
                email: { $regex: /^bulktest.*@test\.com$/ }
            });

            console.log(`✅ Deleted ${result.deletedCount} test student(s):`);
            testStudents.forEach(student => {
                console.log(`   - ${student.email} (${student.USN})`);
            });
        }

        // Close connection
        await mongoose.connection.close();
        console.log('\n✅ Cleanup complete. Database connection closed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanupTestStudents();
