/**
 * Script to seed sample MCQ questions for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AllMCQQuestion = require('../models/MCQschema');
const Classification = require('../models/Classification');

const sampleQuestions = [
    // Data Structures
    {
        classification: 'Data Structures',
        question: 'What is the time complexity of searching in a balanced binary search tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correctAnswer: 'O(log n)',
        level: 'medium',
        marks: 2
    },
    {
        classification: 'Data Structures',
        question: 'Which data structure uses LIFO principle?',
        options: ['Queue', 'Stack', 'Array', 'Linked List'],
        correctAnswer: 'Stack',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'Data Structures',
        question: 'What is the maximum number of children a binary tree node can have?',
        options: ['1', '2', '3', '4'],
        correctAnswer: '2',
        level: 'easy',
        marks: 1
    },

    // Algorithms
    {
        classification: 'Algorithms',
        question: 'Which sorting algorithm has the best average case time complexity?',
        options: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],
        correctAnswer: 'Merge Sort',
        level: 'medium',
        marks: 2
    },
    {
        classification: 'Algorithms',
        question: 'What is the time complexity of QuickSort in the worst case?',
        options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
        correctAnswer: 'O(n²)',
        level: 'hard',
        marks: 3
    },

    // Database
    {
        classification: 'Database',
        question: 'Which SQL keyword is used to retrieve unique values?',
        options: ['UNIQUE', 'DISTINCT', 'DIFFERENT', 'SINGLE'],
        correctAnswer: 'DISTINCT',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'Database',
        question: 'What does ACID stand for in database transactions?',
        options: [
            'Atomicity, Consistency, Isolation, Durability',
            'Association, Consistency, Integration, Durability',
            'Atomicity, Concurrency, Isolation, Database',
            'Automatic, Consistent, Isolated, Durable'
        ],
        correctAnswer: 'Atomicity, Consistency, Isolation, Durability',
        level: 'medium',
        marks: 2
    },

    // Operating Systems
    {
        classification: 'Operating Systems',
        question: 'Which of the following is NOT a process scheduling algorithm?',
        options: ['Round Robin', 'FIFO', 'LIFO', 'Shortest Job First'],
        correctAnswer: 'LIFO',
        level: 'medium',
        marks: 2
    },
    {
        classification: 'Operating Systems',
        question: 'What is a deadlock in operating systems?',
        options: [
            'A process waiting for CPU',
            'A situation where processes are blocked forever',
            'A crashed program',
            'A memory leak'
        ],
        correctAnswer: 'A situation where processes are blocked forever',
        level: 'medium',
        marks: 2
    },

    // Programming
    {
        classification: 'Programming',
        question: 'Which of the following is a compiled language?',
        options: ['Python', 'JavaScript', 'C++', 'Ruby'],
        correctAnswer: 'C++',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'Programming',
        question: 'What is polymorphism in OOP?',
        options: [
            'Ability to create multiple objects',
            'Ability to inherit from multiple classes',
            'Ability of objects to take multiple forms',
            'Ability to hide data'
        ],
        correctAnswer: 'Ability of objects to take multiple forms',
        level: 'medium',
        marks: 2
    },

    // Computer Networks
    {
        classification: 'Computer Networks',
        question: 'Which layer of the OSI model handles routing?',
        options: ['Physical', 'Data Link', 'Network', 'Transport'],
        correctAnswer: 'Network',
        level: 'medium',
        marks: 2
    },
    {
        classification: 'Computer Networks',
        question: 'What is the default port for HTTP?',
        options: ['21', '22', '80', '443'],
        correctAnswer: '80',
        level: 'easy',
        marks: 1
    },

    // Web Development
    {
        classification: 'Web Development',
        question: 'Which HTML tag is used for the largest heading?',
        options: ['<h6>', '<h1>', '<head>', '<heading>'],
        correctAnswer: '<h1>',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'Web Development',
        question: 'What does CSS stand for?',
        options: [
            'Computer Style Sheets',
            'Cascading Style Sheets',
            'Creative Style Sheets',
            'Colorful Style Sheets'
        ],
        correctAnswer: 'Cascading Style Sheets',
        level: 'easy',
        marks: 1
    },

    // Machine Learning
    {
        classification: 'Machine Learning',
        question: 'Which of the following is a supervised learning algorithm?',
        options: ['K-means', 'Decision Tree', 'DBSCAN', 'PCA'],
        correctAnswer: 'Decision Tree',
        level: 'medium',
        marks: 2
    },

    // Cybersecurity
    {
        classification: 'Cybersecurity',
        question: 'What does SSL/TLS provide?',
        options: [
            'Faster internet speed',
            'Encrypted communication',
            'Better UI',
            'Database management'
        ],
        correctAnswer: 'Encrypted communication',
        level: 'easy',
        marks: 1
    },

    // General
    {
        classification: 'General',
        question: 'What does CPU stand for?',
        options: [
            'Central Processing Unit',
            'Computer Personal Unit',
            'Central Program Unit',
            'Computer Processing Unit'
        ],
        correctAnswer: 'Central Processing Unit',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'General',
        question: 'Which company developed the Java programming language?',
        options: ['Microsoft', 'Sun Microsystems', 'Apple', 'Google'],
        correctAnswer: 'Sun Microsystems',
        level: 'easy',
        marks: 1
    },
    {
        classification: 'General',
        question: 'What is the binary representation of decimal 10?',
        options: ['1010', '1001', '1100', '1111'],
        correctAnswer: '1010',
        level: 'medium',
        marks: 2
    }
];

async function seedMCQQuestions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: process.env.DB_NAME || 'codingplatform'
        });
        console.log('✅ MongoDB Connected Successfully\n');

        // Check existing questions
        const existingCount = await AllMCQQuestion.countDocuments();
        console.log(`Found ${existingCount} existing MCQ questions\n`);

        if (existingCount > 0) {
            console.log('⚠️  MCQ questions already exist in the database.');
            const response = await new Promise(resolve => {
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question('Do you want to add more sample questions? (y/n): ', answer => {
                    rl.close();
                    resolve(answer.toLowerCase());
                });
            });

            if (response !== 'y') {
                console.log('Exiting without adding questions.');
                return;
            }
        }

        console.log('Adding sample MCQ questions...\n');

        let addedCount = 0;
        let errorCount = 0;

        for (const questionData of sampleQuestions) {
            try {
                // Check if similar question exists
                const exists = await AllMCQQuestion.findOne({
                    question: questionData.question
                });

                if (exists) {
                    console.log(`⏭️  Skipped (duplicate): ${questionData.question.substring(0, 50)}...`);
                } else {
                    const newQuestion = new AllMCQQuestion({
                        ...questionData,
                        questionType: 'mcq',
                        createdBy: 'System',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    await newQuestion.save();
                    console.log(`✅ Added: [${questionData.classification}] ${questionData.question.substring(0, 50)}...`);
                    addedCount++;
                }
            } catch (error) {
                console.error(`❌ Error adding question: ${error.message}`);
                errorCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('SEEDING SUMMARY');
        console.log('='.repeat(60));
        console.log(`Questions added: ${addedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total questions in database: ${await AllMCQQuestion.countDocuments()}`);

        // Show classification distribution
        console.log('\n' + '='.repeat(60));
        console.log('QUESTIONS BY CLASSIFICATION');
        console.log('='.repeat(60));

        const classifications = await AllMCQQuestion.distinct('classification');
        for (const classification of classifications.sort()) {
            const count = await AllMCQQuestion.countDocuments({ classification });
            console.log(`${classification}: ${count} questions`);
        }

        // Show difficulty distribution
        console.log('\n' + '='.repeat(60));
        console.log('QUESTIONS BY DIFFICULTY');
        console.log('='.repeat(60));

        const easyCount = await AllMCQQuestion.countDocuments({ level: 'easy' });
        const mediumCount = await AllMCQQuestion.countDocuments({ level: 'medium' });
        const hardCount = await AllMCQQuestion.countDocuments({ level: 'hard' });

        console.log(`Easy: ${easyCount} questions`);
        console.log(`Medium: ${mediumCount} questions`);
        console.log(`Hard: ${hardCount} questions`);

        console.log('\n✨ Seeding completed successfully!');
        console.log('\n📌 Now you can:');
        console.log('1. Navigate to http://localhost:3000/admin/mcq-questions to see the questions');
        console.log('2. Click "Add MCQ Question" to add more questions');
        console.log('3. Use the classification filter to filter questions');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the seeding
console.log('🎯 MCQ Questions Seeding Script');
console.log('='.repeat(60));
console.log('This script will add 20 sample MCQ questions for testing.\n');

seedMCQQuestions();