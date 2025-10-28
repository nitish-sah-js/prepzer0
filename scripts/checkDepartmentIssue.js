const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/usermodel');
const Department = require('../models/Department');

async function checkDepartments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all unique departments from users
        const userDepartments = await User.find({Department: {$exists: true}}).distinct('Department');

        // Get all departments from Department collection
        const registeredDepts = await Department.find().distinct('code');

        console.log('\n=== DEPARTMENT ANALYSIS ===\n');
        console.log('Unique departments in User collection:', userDepartments.sort());
        console.log('\nDepartments in Department collection:', registeredDepts.sort());

        // Find departments that exist in users but not in Department collection
        const missingDepts = userDepartments.filter(d => !registeredDepts.includes(d));

        if (missingDepts.length > 0) {
            console.log('\n⚠️  PROBLEM FOUND!');
            console.log('Departments in users but NOT in Department collection:', missingDepts);

            // Count how many students are affected
            for (const dept of missingDepts) {
                const count = await User.countDocuments({Department: dept});
                console.log(`   - ${dept}: ${count} students affected`);
            }

            console.log('\n💡 SOLUTION:');
            console.log('These departments need to be added by an admin through the department management system.');
            console.log('Once added, students from these departments will be able to access all features properly.');
        } else {
            console.log('\n✅ No missing departments found. All user departments are registered.');
        }

        // Check if there are any users without departments
        const noDeptUsers = await User.countDocuments({
            $or: [
                {Department: null},
                {Department: ''},
                {Department: {$exists: false}}
            ]
        });

        if (noDeptUsers > 0) {
            console.log(`\n⚠️  Found ${noDeptUsers} users without department assignment`);
        }

        await mongoose.connection.close();
        console.log('\n=========================\n');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDepartments();