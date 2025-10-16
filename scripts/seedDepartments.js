const mongoose = require('mongoose');
require('dotenv').config();

// Import the Department model
const Department = require('../models/Department');

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

// Department data to seed
const departments = [
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
        code: 'ee',
        name: 'Electrical Engineering',
        fullName: 'Department of Electrical & Electronics Engineering',
        description: 'The EE department focuses on power systems, electrical machines, control systems, and energy management.',
        active: true
    },
    {
        code: 'ad',
        name: 'Automation & Robotics',
        fullName: 'Department of Automation & Robotics',
        description: 'The Automation department specializes in robotics, industrial automation, and mechatronics systems.',
        active: true
    }
];

// Seed function
const seedDepartments = async () => {
    try {
        // Clear existing departments (optional - comment out if you want to keep existing data)
        const existingCount = await Department.countDocuments();
        console.log(`\n📊 Found ${existingCount} existing departments`);

        if (existingCount > 0) {
            console.log('⚠️  Warning: Departments already exist in the database');
            console.log('💡 Skipping seed to avoid duplicates. Delete manually if you want to re-seed.\n');
            return;
        }

        // Insert departments
        console.log('\n🌱 Seeding departments...\n');

        for (const dept of departments) {
            const newDept = await Department.create(dept);
            console.log(`✅ Created: ${newDept.code.toUpperCase()} - ${newDept.name}`);
        }

        console.log(`\n🎉 Successfully seeded ${departments.length} departments!\n`);

        // Display all departments
        const allDepts = await Department.find().sort({ code: 1 });
        console.log('📋 All Departments in Database:');
        console.log('================================');
        allDepts.forEach(dept => {
            console.log(`${dept.code.toUpperCase().padEnd(4)} | ${dept.name.padEnd(30)} | ${dept.active ? '✓ Active' : '✗ Inactive'}`);
        });
        console.log('================================\n');

    } catch (error) {
        console.error('❌ Error seeding departments:', error.message);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    console.log('\n🚀 Starting Department Seed Script\n');

    await connectDB();
    await seedDepartments();

    console.log('✨ Seed script completed successfully!\n');
    process.exit(0);
};

// Run the script
main();
