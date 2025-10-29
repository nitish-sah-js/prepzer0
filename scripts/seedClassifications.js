/**
 * Script to seed initial question classifications
 * Usage: node scripts/seedClassifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Classification = require('../models/Classification');

// Default classifications to seed
const defaultClassifications = [
    {
        name: 'Data Structures',
        description: 'Questions related to arrays, linked lists, trees, graphs, etc.',
        active: true
    },
    {
        name: 'Algorithms',
        description: 'Questions about sorting, searching, dynamic programming, etc.',
        active: true
    },
    {
        name: 'Database Management',
        description: 'SQL, NoSQL, database design, normalization, etc.',
        active: true
    },
    {
        name: 'Operating Systems',
        description: 'Process management, memory management, file systems, etc.',
        active: true
    },
    {
        name: 'Computer Networks',
        description: 'TCP/IP, OSI model, routing, protocols, etc.',
        active: true
    },
    {
        name: 'Web Development',
        description: 'HTML, CSS, JavaScript, frameworks, APIs, etc.',
        active: true
    },
    {
        name: 'Software Engineering',
        description: 'SDLC, design patterns, testing, agile methodologies, etc.',
        active: true
    },
    {
        name: 'Object Oriented Programming',
        description: 'Classes, objects, inheritance, polymorphism, abstraction, etc.',
        active: true
    },
    {
        name: 'Machine Learning',
        description: 'Supervised/unsupervised learning, neural networks, AI concepts, etc.',
        active: true
    },
    {
        name: 'Cloud Computing',
        description: 'AWS, Azure, GCP, microservices, containers, etc.',
        active: true
    },
    {
        name: 'Cybersecurity',
        description: 'Network security, cryptography, ethical hacking, etc.',
        active: true
    },
    {
        name: 'General Knowledge',
        description: 'General computer science and technology questions',
        active: true
    }
];

async function seedClassifications() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codingplatform', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('🔗 MongoDB Connected Successfully');
        console.log('');
        console.log('🔍 Checking existing classifications...');

        // Check if classifications already exist
        const existingCount = await Classification.countDocuments();

        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing classifications`);
            console.log('');

            const answer = await new Promise((resolve) => {
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rl.question('Do you want to continue and add new classifications? (y/n): ', (answer) => {
                    rl.close();
                    resolve(answer);
                });
            });

            if (answer.toLowerCase() !== 'y') {
                console.log('❌ Seeding cancelled');
                process.exit(0);
            }
        }

        console.log('');
        console.log('🌱 Seeding classifications...');
        console.log('');

        let addedCount = 0;
        let skippedCount = 0;

        for (const classificationData of defaultClassifications) {
            // Check if classification already exists
            const existing = await Classification.findOne({
                name: { $regex: new RegExp(`^${classificationData.name}$`, 'i') }
            });

            if (existing) {
                console.log(`⏭️  Skipped: ${classificationData.name} (already exists)`);
                skippedCount++;
            } else {
                const newClassification = new Classification(classificationData);
                await newClassification.save();
                console.log(`✅ Created: ${classificationData.name}`);
                addedCount++;
            }
        }

        console.log('');
        console.log('📊 Seeding Summary:');
        console.log('===================');
        console.log(`✅ Added: ${addedCount} classifications`);
        console.log(`⏭️  Skipped: ${skippedCount} classifications`);
        console.log(`📚 Total: ${await Classification.countDocuments()} classifications in database`);
        console.log('');
        console.log('✨ Classification seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding classifications:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedClassifications();