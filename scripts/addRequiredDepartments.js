const mongoose = require('mongoose');
require('dotenv').config();

const Department = require('../models/Department');
const User = require('../models/usermodel');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepzero', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// Map of department codes found in the database with their proper names
const requiredDepartments = [
    {
        code: 'cs',
        name: 'Computer Science',
        fullName: 'Department of Computer Science & Engineering',
        description: 'The Computer Science department focuses on software development, algorithms, data structures, and computing theory.',
        active: true
    },
    {
        code: 'is',
        name: 'Information Science',
        fullName: 'Department of Information Science & Engineering',
        description: 'The Information Science department specializes in data management, information systems, and business analytics.',
        active: true
    },
    {
        code: 'ec',
        name: 'Electronics & Communication',
        fullName: 'Department of Electronics & Communication Engineering',
        description: 'The EC department covers electronics, communication systems, signal processing, and embedded systems.',
        active: true
    },
    {
        code: 'et',
        name: 'Electronics & Telecommunication',
        fullName: 'Department of Electronics & Telecommunication Engineering',
        description: 'The ET department focuses on telecommunication networks, wireless systems, and digital communication.',
        active: true
    },
    {
        code: 'ai',
        name: 'Artificial Intelligence',
        fullName: 'Department of Artificial Intelligence & Machine Learning',
        description: 'The AI/ML department specializes in machine learning, deep learning, neural networks, and intelligent systems.',
        active: true
    },
    {
        code: 'cv',
        name: 'Civil Engineering',
        fullName: 'Department of Civil Engineering',
        description: 'The Civil Engineering department covers structural engineering, construction management, and infrastructure development.',
        active: true
    },
    {
        code: 'ad',
        name: 'Automation & Robotics',
        fullName: 'Department of Automation & Robotics',
        description: 'The Automation department specializes in robotics, industrial automation, and mechatronics systems.',
        active: true
    },
    {
        code: 'cg',
        name: 'Computer Graphics',
        fullName: 'Department of Computer Graphics & Visualization',
        description: 'The CG department focuses on computer graphics, visualization, game development, and multimedia.',
        active: true
    },
    {
        code: 'cseaiml',
        name: 'CSE (AI & ML)',
        fullName: 'Department of Computer Science & Engineering (Artificial Intelligence & Machine Learning)',
        description: 'Specialized CSE program focusing on AI and ML technologies.',
        active: true
    },
    {
        code: 'cseds',
        name: 'CSE (Data Science)',
        fullName: 'Department of Computer Science & Engineering (Data Science)',
        description: 'Specialized CSE program focusing on Data Science and Analytics.',
        active: true
    }
];

const addRequiredDepartments = async () => {
    try {
        console.log('\n🔍 Analyzing missing departments from actual student data...\n');

        // First, get all unique departments from existing students
        const userDepartments = await User.find({Department: {$exists: true}}).distinct('Department');
        const existingDepts = await Department.find().distinct('code');

        // Find missing departments
        const missingDepts = userDepartments.filter(d => !existingDepts.includes(d));

        console.log('📊 Current Status:');
        console.log(`   - Unique departments in student records: ${userDepartments.length}`);
        console.log(`   - Departments already in system: ${existingDepts.length}`);
        console.log(`   - Missing departments: ${missingDepts.length}`);

        if (missingDepts.length > 0) {
            console.log('\n📋 Missing departments found:', missingDepts);
            console.log('\n🚀 Starting to add missing departments...\n');

            let addedCount = 0;
            let skippedCount = 0;
            let notInListCount = 0;

            for (const deptCode of missingDepts) {
                // Find the department details from our list
                const deptDetails = requiredDepartments.find(d => d.code === deptCode);

                if (deptDetails) {
                    // Check if it already exists (just in case)
                    const exists = await Department.findOne({ code: deptCode });
                    if (!exists) {
                        const newDept = await Department.create(deptDetails);
                        const studentCount = await User.countDocuments({ Department: deptCode });
                        console.log(`✅ Added: ${deptCode.toUpperCase()} - ${deptDetails.name} (${studentCount} students)`);
                        addedCount++;
                    } else {
                        console.log(`⏭️  Skipped: ${deptCode.toUpperCase()} - Already exists`);
                        skippedCount++;
                    }
                } else {
                    const studentCount = await User.countDocuments({ Department: deptCode });
                    console.log(`⚠️  Not in list: ${deptCode.toUpperCase()} - Needs manual configuration (${studentCount} students)`);
                    notInListCount++;
                }
            }

            console.log(`\n📊 Summary:`);
            console.log(`   - ✅ Added: ${addedCount} departments`);
            console.log(`   - ⏭️  Skipped: ${skippedCount} departments`);
            console.log(`   - ⚠️  Need manual addition: ${notInListCount} departments`);
        } else {
            console.log('\n✅ All departments are already configured!');
        }

        // Display final status
        const allDepts = await Department.find().sort({ code: 1 });
        console.log('\n📋 All Departments in System:');
        console.log('=====================================');
        console.log('Code | Name                          | Students | Status');
        console.log('-----+-------------------------------+----------+---------');

        for (const dept of allDepts) {
            const code = dept.code.toUpperCase().padEnd(4);
            const name = dept.name.padEnd(30);
            const studentCount = await User.countDocuments({ Department: dept.code });
            const count = studentCount.toString().padEnd(8);
            const status = dept.active ? '✓ Active' : '✗ Inactive';
            console.log(`${code} | ${name} | ${count} | ${status}`);
        }
        console.log('=====================================');

        const totalStudents = await User.countDocuments({ Department: { $exists: true, $ne: null } });
        console.log(`Total: ${allDepts.length} departments, ${totalStudents} students with departments\n`);

        // Check if any students still don't have matching departments
        const finalUserDepts = await User.find({Department: {$exists: true}}).distinct('Department');
        const finalExistingDepts = await Department.find().distinct('code');
        const stillMissing = finalUserDepts.filter(d => !finalExistingDepts.includes(d));

        if (stillMissing.length > 0) {
            console.log('⚠️  WARNING: The following departments still need to be added manually:');
            for (const dept of stillMissing) {
                const count = await User.countDocuments({ Department: dept });
                console.log(`   - ${dept}: ${count} students`);
            }
            console.log('\n💡 These departments were not in the standard list and need custom configuration.');
            console.log('   Please add them through the admin interface or create a custom script.\n');
        } else {
            console.log('🎉 SUCCESS: All student departments are now properly configured!\n');
        }

    } catch (error) {
        console.error('❌ Error adding departments:', error.message);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    console.log('\n🚀 Starting Required Departments Addition Script\n');
    console.log('This script adds departments based on actual student records in the database.');
    console.log('It ensures all students can access the system properly.\n');

    await connectDB();
    await addRequiredDepartments();

    await mongoose.connection.close();
    console.log('✨ Script completed!\n');
    process.exit(0);
};

// Run the script
main();