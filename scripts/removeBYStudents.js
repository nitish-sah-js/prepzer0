/**
 * Script to remove students whose USN contains "BY"
 * This script will delete all students with "BY" in their USN
 *
 * Usage: node scripts/removeBYStudents.js
 *
 * WARNING: This will permanently delete students and their associated data!
 */

require("dotenv").config()
const mongoose = require("mongoose")
const User = require("../models/usermodel")
const Submission = require("../models/SubmissionSchema")
const PartialSubmission = require("../models/PartialSubmission")
const ActiveSession = require("../models/ActiveSession")
const Integrity = require("../models/Integrity")
const ExamCandidate = require("../models/ExamCandidate")

async function removeBYStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb+srv://ngscompany25_db_user:X4cokszVYpd9blDW@cluster0.kxpfx1a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    )

    console.log("🔗 MongoDB Connected Successfully")
    console.log("")
    console.log('🔍 Finding students with "TE" in their USN...')

    // Find all students with "BY" in their USN
    const studentsWithBY = await User.find({
      usertype: "student",
      USN: { $regex: "TE", $options: "i" }, // Case insensitive search for "BY"
    }).select("USN fname lname email Department Semester _id")

    if (studentsWithBY.length === 0) {
      console.log('✅ No students found with "TE" in their USN!')
      process.exit(0)
    }

    console.log(
      `📊 Found ${studentsWithBY.length} students with "BY" in their USN`
    )
    console.log("")

    // Show sample of students to be deleted
    console.log("Students to be deleted:")
    console.log("========================")

    const samplesToShow = Math.min(10, studentsWithBY.length)
    for (let i = 0; i < samplesToShow; i++) {
      const student = studentsWithBY[i]
      console.log(`  USN: ${student.USN}`)
      console.log(`  Name: ${student.fname} ${student.lname}`)
      console.log(`  Email: ${student.email}`)
      console.log(`  Department: ${student.Department || "N/A"}`)
      console.log(`  Semester: ${student.Semester || "N/A"}`)
      console.log("  ---")
    }

    if (studentsWithBY.length > 10) {
      console.log(`  ... and ${studentsWithBY.length - 10} more students`)
    }
    console.log("")

    // Get student IDs for deletion
    const studentIds = studentsWithBY.map((s) => s._id)
    const studentUSNs = studentsWithBY.map((s) => s.USN)

    // Check for related data
    console.log("📋 Checking for related data...")

    const submissions = await Submission.countDocuments({
      student: { $in: studentIds },
    })
    const partialSubmissions = await PartialSubmission.countDocuments({
      student: { $in: studentIds },
    })
    const activeSessions = await ActiveSession.countDocuments({
      userId: { $in: studentIds },
    })
    const integrityRecords = await Integrity.countDocuments({
      userId: { $in: studentIds },
    })
    const examCandidates = await ExamCandidate.countDocuments({
      usn: { $in: studentUSNs },
    })

    console.log(`  Submissions: ${submissions}`)
    console.log(`  Partial Submissions: ${partialSubmissions}`)
    console.log(`  Active Sessions: ${activeSessions}`)
    console.log(`  Integrity Records: ${integrityRecords}`)
    console.log(`  Exam Candidates: ${examCandidates}`)
    console.log("")

    // Ask for confirmation
    const answer = await new Promise((resolve) => {
      const readline = require("readline")
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      console.log("⚠️  WARNING: This action cannot be undone!")
      console.log("This will delete:")
      console.log(`  - ${studentsWithBY.length} student accounts`)
      console.log("  - All their associated submissions and data")
      console.log("")

      rl.question('Type "DELETE" to confirm deletion: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })

    if (answer !== "DELETE") {
      console.log("❌ Operation cancelled")
      process.exit(0)
    }

    console.log("")
    console.log("🗑️  Deleting students and related data...")

    // Delete related data first
    const deletionResults = {}

    // Delete submissions
    if (submissions > 0) {
      const submissionResult = await Submission.deleteMany({
        student: { $in: studentIds },
      })
      deletionResults.submissions = submissionResult.deletedCount
      console.log(`  ✓ Deleted ${submissionResult.deletedCount} submissions`)
    }

    // Delete partial submissions
    if (partialSubmissions > 0) {
      const partialResult = await PartialSubmission.deleteMany({
        student: { $in: studentIds },
      })
      deletionResults.partialSubmissions = partialResult.deletedCount
      console.log(
        `  ✓ Deleted ${partialResult.deletedCount} partial submissions`
      )
    }

    // Delete active sessions
    if (activeSessions > 0) {
      const sessionResult = await ActiveSession.deleteMany({
        userId: { $in: studentIds },
      })
      deletionResults.activeSessions = sessionResult.deletedCount
      console.log(`  ✓ Deleted ${sessionResult.deletedCount} active sessions`)
    }

    // Delete integrity records
    if (integrityRecords > 0) {
      const integrityResult = await Integrity.deleteMany({
        userId: { $in: studentIds },
      })
      deletionResults.integrityRecords = integrityResult.deletedCount
      console.log(
        `  ✓ Deleted ${integrityResult.deletedCount} integrity records`
      )
    }

    // Delete exam candidates
    if (examCandidates > 0) {
      const candidateResult = await ExamCandidate.deleteMany({
        usn: { $in: studentUSNs },
      })
      deletionResults.examCandidates = candidateResult.deletedCount
      console.log(
        `  ✓ Deleted ${candidateResult.deletedCount} exam candidate records`
      )
    }

    // Finally, delete the students
    const deleteResult = await User.deleteMany({
      usertype: "student",
      USN: { $regex: "TE", $options: "i" },
    })

    console.log(`  ✓ Deleted ${deleteResult.deletedCount} student accounts`)

    console.log("")
    console.log("✅ Deletion completed successfully!")
    console.log("=================================")
    console.log(`📊 Total students deleted: ${deleteResult.deletedCount}`)

    if (Object.keys(deletionResults).length > 0) {
      console.log("")
      console.log("Related data deleted:")
      Object.entries(deletionResults).forEach(([key, count]) => {
        console.log(`  - ${key}: ${count}`)
      })
    }

    // Verify deletion
    const remainingBYStudents = await User.countDocuments({
      usertype: "student",
      USN: { $regex: "TE", $options: "i" },
    })

    if (remainingBYStudents === 0) {
      console.log("")
      console.log('✨ All students with "BY" in their USN have been removed!')
    } else {
      console.log("")
      console.log(
        `⚠️  Warning: ${remainingBYStudents} students with "BY" still remain in the database.`
      )
    }
  } catch (error) {
    console.error("❌ Error removing students:", error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log("")
    console.log("🔌 Database connection closed")
    process.exit(0)
  }
}

// Run the removal function
removeBYStudents()
