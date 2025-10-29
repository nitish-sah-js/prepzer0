/**
 * Migration script to fix department codes for users affected by the truncation bug
 * This script re-parses USNs with the updated regex to extract full department codes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/usermodel');

// Updated regex with support for variable-length department codes (2-10 characters)
const NEW_REGEX = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2,10})(\d{3})$/;

// Old regex that was truncating departments to 2 characters
const OLD_REGEX = /^(\d{0,2})([a-z]{2})(\d{2})([a-z]{2})(\d{3})$/;

async function fixDepartmentParsing() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected Successfully\n');

        // Find all users with USN (students)
        const users = await User.find({
            USN: { $exists: true, $ne: null },
            usertype: 'student'
        });

        console.log(`Found ${users.length} student users with USN\n`);

        let fixedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const fixes = [];

        for (const user of users) {
            const usn = user.USN.toLowerCase().trim();

            // Try parsing with old regex
            const oldMatch = usn.match(OLD_REGEX);

            // Try parsing with new regex
            const newMatch = usn.match(NEW_REGEX);

            if (!newMatch) {
                console.log(`⚠️  Invalid USN format: ${user.USN} (User: ${user.email})`);
                errorCount++;
                continue;
            }

            const newDepartment = newMatch[4];
            const currentDepartment = user.Department;

            // Check if department needs fixing
            if (currentDepartment !== newDepartment) {
                console.log(`🔧 Fixing user: ${user.email}`);
                console.log(`   USN: ${user.USN}`);
                console.log(`   Current Department: "${currentDepartment}"`);
                console.log(`   Correct Department: "${newDepartment}"`);

                // Update the user's department
                user.Department = newDepartment;
                await user.save();

                fixes.push({
                    email: user.email,
                    usn: user.USN,
                    oldDept: currentDepartment,
                    newDept: newDepartment
                });

                fixedCount++;
                console.log(`   ✅ Fixed!\n`);
            } else {
                skippedCount++;
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total users processed: ${users.length}`);
        console.log(`Users fixed: ${fixedCount}`);
        console.log(`Users skipped (already correct): ${skippedCount}`);
        console.log(`Invalid USNs: ${errorCount}`);

        if (fixes.length > 0) {
            console.log('\n' + '='.repeat(70));
            console.log('FIXED USERS DETAIL');
            console.log('='.repeat(70));

            // Group by department change
            const grouped = {};
            fixes.forEach(fix => {
                const key = `${fix.oldDept} → ${fix.newDept}`;
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(fix);
            });

            for (const [change, items] of Object.entries(grouped)) {
                console.log(`\n${change} (${items.length} users):`);
                items.forEach(item => {
                    console.log(`  - ${item.email} (USN: ${item.usn})`);
                });
            }
        }

        // Check for potential issues
        console.log('\n' + '='.repeat(70));
        console.log('POTENTIAL ISSUES TO REVIEW');
        console.log('='.repeat(70));

        // Find users where Department length > 2 (likely already fixed or from CSV)
        const longDeptUsers = await User.find({
            Department: { $exists: true },
            $expr: { $gt: [{ $strLenCP: "$Department" }, 2] }
        });

        if (longDeptUsers.length > 0) {
            console.log(`\n✅ Found ${longDeptUsers.length} users with department codes > 2 chars`);
            console.log('   These users likely had their departments set correctly via CSV upload');

            // Show unique department codes
            const uniqueDepts = [...new Set(longDeptUsers.map(u => u.Department))];
            console.log('   Unique department codes found:');
            uniqueDepts.sort().forEach(dept => {
                const count = longDeptUsers.filter(u => u.Department === dept).length;
                console.log(`     - ${dept} (${count} users)`);
            });
        }

        console.log('\n✨ Migration script completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

// Run the migration
console.log('🔧 Department Parsing Fix Migration Script');
console.log('='.repeat(70));
console.log('This script will fix department codes that were truncated due to');
console.log('the USN regex bug that limited department codes to 2 characters.\n');

fixDepartmentParsing();