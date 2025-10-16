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

// Clear function
const clearDepartments = async () => {
    try {
        const count = await Department.countDocuments();
        console.log(`\n📊 Found ${count} existing departments`);

        if (count === 0) {
            console.log('✨ No departments to delete\n');
            return;
        }

        // Show existing departments before deletion
        const existingDepts = await Department.find().sort({ code: 1 });
        console.log('\n🗑️  Departments to be deleted:');
        console.log('================================');
        existingDepts.forEach(dept => {
            console.log(`${dept.code.toUpperCase().padEnd(4)} | ${dept.name}`);
        });
        console.log('================================\n');

        // Delete all departments
        const result = await Department.deleteMany({});
        console.log(`✅ Successfully deleted ${result.deletedCount} departments!\n`);

    } catch (error) {
        console.error('❌ Error clearing departments:', error.message);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    console.log('\n🗑️  Starting Department Clear Script\n');

    await connectDB();
    await clearDepartments();

    console.log('✨ Clear script completed successfully!\n');
    console.log('💡 You can now run "npm run seed:departments" to populate fresh data\n');
    process.exit(0);
};

// Run the script
main();
