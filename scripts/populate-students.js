require("dotenv").config()
const mongoose = require("mongoose")
const User = require("../models/usermodel")

// Configuration
const COLLEGE_CODE = "1by"
const BASE_YEAR = 22 // 2021
const PASSWORD = "student123" // Same password for all students
const STUDENTS_PER_DEPT_PER_SEM = 15 // 15 students per semester = 120 total per dept

// All departments (must match User model enum: cg, ad, is, cs, et, ec, ai, cv)
const DEPARTMENTS = ["cg", "ad", "is", "cs", "et", "ec", "ai", "cv"]

// Year to semester mapping (current semester based on year)
const YEAR_TO_SEMESTER = {
  21: 8, // 2021 batch - 8th semester
  22: 6, // 2022 batch - 6th semester
  23: 4, // 2023 batch - 4th semester
  24: 2, // 2024 batch - 2nd semester
}

async function populateStudents() {
  try {
    // Connect to MongoDB
    const dburl = process.env.MONGODB_URI
    await mongoose.connect(dburl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ Connected to database\n")

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    // Process each year (21, 22, 23, 24)
    for (const [yearStr, semester] of Object.entries(YEAR_TO_SEMESTER)) {
      const year = parseInt(yearStr)
      console.log(`\n${"=".repeat(60)}`)
      console.log(`📅 Processing ${year} batch (Semester ${semester})`)
      console.log(`${"=".repeat(60)}`)

      // Process each department
      for (const dept of DEPARTMENTS) {
        console.log(`\n📚 Department: ${dept.toUpperCase()}`)

        // Create students for this department
        for (let rollNo = 1; rollNo <= STUDENTS_PER_DEPT_PER_SEM; rollNo++) {
          const rollNoStr = rollNo.toString().padStart(3, "0")
          const usn = `${COLLEGE_CODE}${year}${dept}${rollNoStr}`.toUpperCase()

          try {
            // Check if student already exists
            const existingStudent = await User.findOne({ USN: usn })

            if (existingStudent) {
              process.stdout.write(".")
              totalSkipped++
              continue
            }

            // Create student data
            const studentData = {
              email: `${usn.toLowerCase()}@student.edu`,
              USN: usn,
              usertype: "student",
              userallowed: true,
              active: true,
              fname: `Student`,
              lname: `${dept.toUpperCase()}${rollNoStr}`,
              Year: `20${year}`,
              Department: dept,
              Rollno: rollNoStr,
              Semester: semester,
            }

            // Register student
            await User.register(studentData, PASSWORD)
            process.stdout.write("✓")
            totalCreated++
          } catch (error) {
            process.stdout.write("✗")
            totalErrors++
            if (error.message && !error.message.includes("duplicate")) {
              console.error(`\n   Error creating ${usn}:`, error.message)
            }
          }
        }

        console.log(` (${STUDENTS_PER_DEPT_PER_SEM} students processed)`)
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`)
    console.log("📊 SUMMARY")
    console.log(`${"=".repeat(60)}`)
    console.log(`✅ Students Created: ${totalCreated}`)
    console.log(`⏭️  Students Skipped (already exist): ${totalSkipped}`)
    console.log(`❌ Errors: ${totalErrors}`)
    console.log(
      `📈 Total Processed: ${totalCreated + totalSkipped + totalErrors}`
    )
    console.log(
      `\n💾 Expected Total Students: ${
        DEPARTMENTS.length *
        Object.keys(YEAR_TO_SEMESTER).length *
        STUDENTS_PER_DEPT_PER_SEM
      }`
    )
    console.log(
      `   (${DEPARTMENTS.length} departments × ${
        Object.keys(YEAR_TO_SEMESTER).length
      } years × ${STUDENTS_PER_DEPT_PER_SEM} students)`
    )
    console.log(`\n🔐 All students password: ${PASSWORD}`)
    console.log(`📧 Email format: {usn}@student.edu`)
    console.log(`\nExample logins:`)
    console.log(`   Email: 1by21cs001@student.edu`)
    console.log(`   Password: ${PASSWORD}`)

    // Close connection
    await mongoose.connection.close()
    console.log("\n✅ Database connection closed")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Fatal Error:", error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the population script
console.log("🚀 Starting Student Population Script")
console.log("====================================\n")
populateStudents()
