const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const ActivityTracker = require('../models/ActiveSession');
const User = require('../models/usermodel');
const Submission = require('../models/SubmissionSchema');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepzero', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('\u2705 MongoDB Connected Successfully');
    } catch (error) {
        console.error('\u274C MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// Cleanup function
const cleanupOrphanedSessions = async () => {
    try {
        console.log('\n\ud83d\udd0d Starting orphaned session cleanup...\n');

        // Get all ActivityTracker records
        const allSessions = await ActivityTracker.find({}).select('_id userId examId status');
        console.log(`\ud83d\udcc4 Found ${allSessions.length} total activity sessions`);

        let orphanedCount = 0;
        let updatedCount = 0;
        const orphanedSessionIds = [];

        // Check each session
        for (const session of allSessions) {
            if (!session.userId) {
                orphanedCount++;
                orphanedSessionIds.push(session._id);

                // Update to offline if not already
                if (session.status !== 'offline') {
                    await ActivityTracker.findByIdAndUpdate(
                        session._id,
                        {
                            status: 'offline',
                            $push: {
                                pingHistory: {
                                    timestamp: new Date(),
                                    status: 'offline'
                                }
                            }
                        }
                    );
                    updatedCount++;
                }
            } else {
                // Check if the user actually exists
                const userExists = await User.exists({ _id: session.userId });
                if (!userExists) {
                    console.warn(`\u26a0\ufe0f  Session ${session._id} references non-existent user ${session.userId}`);
                    orphanedCount++;
                    orphanedSessionIds.push(session._id);

                    // Update to offline if not already
                    if (session.status !== 'offline') {
                        await ActivityTracker.findByIdAndUpdate(
                            session._id,
                            {
                                status: 'offline',
                                $push: {
                                    pingHistory: {
                                        timestamp: new Date(),
                                        status: 'offline'
                                    }
                                }
                            }
                        );
                        updatedCount++;
                    }
                }
            }
        }

        console.log(`\n\ud83d\udcca Cleanup Summary:`);
        console.log('================================');
        console.log(`Total sessions checked: ${allSessions.length}`);
        console.log(`Orphaned sessions found: ${orphanedCount}`);
        console.log(`Sessions updated to offline: ${updatedCount}`);
        console.log('================================\n');

        if (orphanedCount > 0) {
            console.log('\u26a0\ufe0f  WARNING: Orphaned sessions detected!');
            console.log('This indicates that some User records were deleted while students had active sessions.');
            console.log('These sessions have been marked as offline.\n');

            console.log('Orphaned session IDs:');
            orphanedSessionIds.forEach(id => console.log(`  - ${id}`));
            console.log('');
        } else {
            console.log('\u2705 No orphaned sessions found. Database is clean!\n');
        }

        // PART 2: Check for orphaned submissions
        console.log('\\n\ud83d\udd0d Checking for orphaned submissions...\n');

        const allSubmissions = await Submission.find({}).select('_id student exam submittedAt');
        console.log(`\ud83d\udcc4 Found ${allSubmissions.length} total submissions`);

        let orphanedSubmissionsCount = 0;
        const orphanedSubmissionIds = [];

        for (const submission of allSubmissions) {
            if (!submission.student) {
                orphanedSubmissionsCount++;
                orphanedSubmissionIds.push(submission._id);
                console.warn(`\u26a0\ufe0f  Submission ${submission._id} has null student reference`);
            } else {
                // Check if the student actually exists
                const studentExists = await User.exists({ _id: submission.student });
                if (!studentExists) {
                    orphanedSubmissionsCount++;
                    orphanedSubmissionIds.push(submission._id);
                    console.warn(`\u26a0\ufe0f  Submission ${submission._id} references non-existent student ${submission.student}`);
                }
            }
        }

        console.log(`\n\ud83d\udcca Submission Cleanup Summary:`);
        console.log('================================');
        console.log(`Total submissions checked: ${allSubmissions.length}`);
        console.log(`Orphaned submissions found: ${orphanedSubmissionsCount}`);
        console.log('================================\n');

        if (orphanedSubmissionsCount > 0) {
            console.log('\u26a0\ufe0f  WARNING: Orphaned submissions detected!');
            console.log('These submissions reference students that no longer exist in the database.');
            console.log('The exam data exists but cannot be displayed properly.\n');

            console.log('Orphaned submission IDs:');
            orphanedSubmissionIds.forEach(id => console.log(`  - ${id}`));
            console.log('');
            console.log('\u{1F4A1} Recommendation: Review why students were deleted while having active submissions.');
            console.log('\u{1F4A1} Consider implementing soft deletes for User records instead of hard deletes.\n');
        } else {
            console.log('\u2705 No orphaned submissions found!\n');
        }

    } catch (error) {
        console.error('\u274C Error during cleanup:', error.message);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    console.log('\n\ud83e\uddfc Orphaned Session Cleanup Script\n');

    await connectDB();
    await cleanupOrphanedSessions();

    console.log('\u2728 Cleanup script completed successfully!\n');
    process.exit(0);
};

// Run the script
main();
