/**
 * Script to seed initial classifications for MCQ questions
 * This ensures there are classifications available in the dropdown
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Classification = require('../models/Classification');

const initialClassifications = [
    { name: 'General', description: 'General knowledge questions' },
    { name: 'Mathematics', description: 'Mathematical concepts and problems' },
    { name: 'Data Structures', description: 'Data structures and their operations' },
    { name: 'Algorithms', description: 'Algorithm design and analysis' },
    { name: 'Database', description: 'Database management and SQL' },
    { name: 'Operating Systems', description: 'OS concepts and principles' },
    { name: 'Computer Networks', description: 'Networking and communication' },
    { name: 'Software Engineering', description: 'Software development practices' },
    { name: 'Programming', description: 'Programming concepts and languages' },
    { name: 'Web Development', description: 'Web technologies and frameworks' },
    { name: 'Machine Learning', description: 'ML and AI concepts' },
    { name: 'Cybersecurity', description: 'Security and cryptography' },
    { name: 'Cloud Computing', description: 'Cloud services and architecture' },
    { name: 'Mobile Development', description: 'Mobile app development' },
    { name: 'Computer Architecture', description: 'Hardware and system architecture' },
    { name: 'DBMS', description: 'Database Management Systems' },
    { name: 'Networking', description: 'Computer Networking concepts' },
    { name: 'Object-Oriented Programming', description: 'OOP concepts and principles' }
];

async function seedClassifications() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected Successfully\n');

        // Check existing classifications
        const existingCount = await Classification.countDocuments();
        console.log(`Found ${existingCount} existing classifications\n`);

        if (existingCount > 0) {
            console.log('⚠️  Classifications already exist. Checking for missing ones...\n');
        }

        let addedCount = 0;
        let skippedCount = 0;

        for (const classificationData of initialClassifications) {
            try {
                // Check if classification already exists (case-insensitive)
                const exists = await Classification.findOne({
                    name: { $regex: new RegExp(`^${classificationData.name}$`, 'i') }
                });

                if (exists) {
                    console.log(`⏭️  Skipped: ${classificationData.name} (already exists)`);
                    skippedCount++;
                } else {
                    // Create new classification
                    const newClassification = new Classification({
                        name: classificationData.name,
                        description: classificationData.description,
                        active: true,
                        usageCount: 0,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    await newClassification.save();
                    console.log(`✅ Added: ${classificationData.name}`);
                    addedCount++;
                }
            } catch (error) {
                console.error(`❌ Error adding ${classificationData.name}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SEEDING SUMMARY');
        console.log('='.repeat(60));
        console.log(`Classifications added: ${addedCount}`);
        console.log(`Classifications skipped: ${skippedCount}`);
        console.log(`Total classifications in database: ${await Classification.countDocuments()}`);

        // Display all active classifications
        console.log('\n' + '='.repeat(60));
        console.log('ALL ACTIVE CLASSIFICATIONS');
        console.log('='.repeat(60));

        const allClassifications = await Classification.find({ active: true }).sort({ name: 1 });
        allClassifications.forEach((classification, index) => {
            console.log(`${index + 1}. ${classification.name}`);
            if (classification.description) {
                console.log(`   └─ ${classification.description}`);
            }
        });

        console.log('\n✨ Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the seeding
console.log('🌱 Classification Seeding Script');
console.log('='.repeat(60));
console.log('This script will add initial classifications for MCQ questions.\n');

seedClassifications();