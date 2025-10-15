require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/usermodel');

async function createAdmin() {
    try {
        // Connect to MongoDB
        const dburl = process.env.MONGODB_URI;
        await mongoose.connect(dburl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to database');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'earthlingaidtech@gmail.com' });

        if (existingAdmin) {
            console.log('Admin with this email already exists!');
            console.log('Deleting existing admin...');
            await User.deleteOne({ email: 'earthlingaidtech@gmail.com' });
        }

        // Create admin user
        const adminData = {
            email: 'earthlingaidtech@gmail.com',
            USN: 'ADMIN001', // Unique USN for admin
            usertype: 'admin',
            userallowed: true, // Allow login
            admin_access: true, // Admin access flag
            active: true, // Active account
            fname: 'Admin',
            lname: 'User'
        };

        // Register admin with password
        await User.register(adminData, '1');

        console.log('✅ Admin user created successfully!');
        console.log('Email: earthlingaidtech@gmail.com');
        console.log('Password: 1');
        console.log('User type: admin');

        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

createAdmin();
