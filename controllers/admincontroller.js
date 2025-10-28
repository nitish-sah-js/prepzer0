const Exam = require("../models/Exam")
const sendEmails = require("./../utils/email")
const { accountVerificationTemplate } = require("./../utils/emailTemplates")
const User = require("./../models/usermodel")
const { v4: uuidv4 } = require("uuid")
const passport = require("passport")
const Submission = require("../models/SubmissionSchema")
const ActivityTracker = require("../models/ActiveSession")
const ReportModel = require("./../models/reportModel")
const mongoose = require("mongoose")
const ExamCandidate = require("../models/ExamCandidate")
const PartialSubmission = require("../models/PartialSubmission")
const Department = require("../models/Department")

const EvaluationResult = require("../models/EvaluationResultSchema")

exports.getcontrol = async (req, res) => {
  if (req.isAuthenticated()) {
    console.log("authenticated")
    const Userprofile = await User.findById({ _id: req.user.id })

    if (Userprofile.usertype == "teacher" || Userprofile.usertype == "admin") {
      const exams = await Exam.find().populate("createdBy", "name")

      // Fetch active departments from database
      const departments = await Department.find({ active: true }).sort({
        code: 1,
      })

      res.render("admin", {
        pic: Userprofile.imageurl,
        logged_in: "true",
        exams: exams,
        departments: departments, // Pass departments to view
      })
    } else {
      res.redirect("/admin/login")
    }
  } else {
    res.redirect("/admin/login")
  }
}

exports.postcontrol = async (req, res) => {}

exports.logingetcontrol = async (req, res) => {
  res.render("adminlogin")
}

exports.loginpostcontrol = async (req, res, next) => {
  try {
    // Validate input
    if (!req.body.email || !req.body.password || !req.body.role) {
      return res.render("adminlogin", {
        errormsg: "All fields are required",
      })
    }

    // Validate role
    if (req.body.role !== "teacher" && req.body.role !== "admin") {
      return res.render("adminlogin", {
        errormsg: "Invalid role selected",
      })
    }

    // Use passport.authenticate properly (same pattern as student login)
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err)
        return res.status(500).render("adminlogin", {
          errormsg: "An error occurred during login. Please try again.",
        })
      }

      if (!user) {
        console.log(
          "Authentication failed for:",
          req.body.email,
          "Reason:",
          info?.message
        )
        return res.render("adminlogin", {
          errormsg: info?.message || "Invalid email or password",
        })
      }

      // Verify user type matches requested role
      if (user.usertype !== req.body.role) {
        return res.render("adminlogin", {
          errormsg: "Invalid role for this account",
        })
      }

      // Successful authentication, now log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error after authentication:", loginErr)
          return res.status(500).render("adminlogin", {
            errormsg: "Error during login. Please try again.",
          })
        }

        console.log("Admin/Teacher login successful:", user.email)
        return res.redirect("/admin")
      })
    })(req, res, next)
  } catch (error) {
    console.error("Error in loginpostcontrol:", error)
    return res.status(500).render("adminlogin", {
      errormsg: "An unexpected error occurred. Please try again.",
    })
  }
}

exports.signupgetcontrol = async (req, res) => {
  res.render("adminsignup")
}
exports.signuppostcontrol = async (req, res) => {
  try {
    if (req.body.password == req.body.passcode) {
      randurl = uuidv4()

      badhttp =
        "https://placement.prepzer0.co.in/authenticate/verify/" + randurl
      try {
        await sendEmails({
          email: req.body.email,
          subject: "Verify Your PrepZer0 Teacher Account",
          html: accountVerificationTemplate(badhttp),
        })
        console.log("the email was sent tried to sent to be specific")
      } catch (error) {
        console.log(error)
        console.log("maybe email was not sent")
      }
      console.log("whats happening")

      await User.register(
        { email: req.body.email, randomurl: randurl, usertype: req.body.role },
        req.body.password,
        (err, user) => {
          if (err) {
            console.log(err)
            res.render("adminsignup", { errormsg: "email already taken" })
          } else {
            if (
              User.findOne({ email: req.body.email, active: false }) != null
            ) {
              req.session.lau = req.body.email
              console.log(req.lau)
              console.log("sessions")
              res.redirect("/admin/login")
            } else {
              passport.authenticate("local")(req, res, function () {
                res.redirect("/")
              })
            }
          }
          console.log(user)
        }
      )
    } else {
      res.render("adminsignup", { errormsg: "password did not mached" })
    }
  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
}

exports.allStudents = async (req, res) => {
  try {
    // Get filter parameters from query string
    const { semester, department, usn, page = 1 } = req.query
    // Pagination settings
    const limit = 20 // Students per page
    const currentPage = parseInt(page)
    const skip = (currentPage - 1) * limit

    // Build filter object
    let filter = { usertype: "student" }

    // Note: We can't filter by semester in the database query because
    // CurrentSemester is a virtual field that's calculated at runtime.
    // We'll filter by semester in-memory after fetching.

    if (department) {
      // Case insensitive search for department
      filter.Department = new RegExp(department, "i")
    }

    if (usn) {
      // Case insensitive search for USN
      filter.USN = new RegExp(usn, "i")
    }

    // Fetch active departments from database
    const departments = await Department.find({ active: true }).sort({
      code: 1,
    })

    // Query the database with filters (except semester)
    let students = await User.find(filter)
      .select("-password -passwordresettoken -passwordresetdate") // Exclude sensitive fields
      .sort({ created: -1 }) // Sort by creation date, newest first

    // Filter by CurrentSemester in-memory (virtual field)

    if (semester) {
      console.log(semester)
      students = students.filter((student) => {
        const currentSem = student.CurrentSemester
        return currentSem == semester // Use == for type coercion (string/number)
      })
    }

    // Calculate pagination
    const totalStudents = students.length
    const totalPages = Math.ceil(totalStudents / limit)

    // Apply pagination
    const paginatedStudents = students.slice(skip, skip + limit)

    console.log(
      `Page ${currentPage}/${totalPages}, showing ${paginatedStudents.length} of ${totalStudents} students`
    )

    // Render the EJS template with the students data
    res.render("allstudentsprofile", {
      students: paginatedStudents,
      departments: departments, // Pass departments to view
      title: "All Students",
      heading: "Student Profiles",
      // Pass the current filter values to pre-populate the form
      currentFilters: {
        semester: semester || "",
        department: department || "",
        usn: usn || "",
      },
      // Pagination data
      pagination: {
        currentPage: currentPage,
        totalPages: totalPages,
        totalStudents: totalStudents,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        limit: limit,
      },
    })
  } catch (error) {
    console.error("Error fetching students:", error)
    res.status(500).render("error", {
      message: "Failed to load student profiles",
      error: error,
    })
  }
}

/**
 * Get student exam history
 * GET /students/:studentId/exams
 */
exports.getStudentExams = async (req, res) => {
  try {
    const studentId = req.params.studentId

    // Find student by ID
    const student = await User.findOne({ _id: studentId })

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      })
    }

    // Find all submissions by this student
    const submissions = await Submission.find({ student: studentId })
      .populate({
        path: "exam",
        match: { _id: { $ne: null } }, // Only populate non-null exam references
      })
      .sort({ submittedAt: -1 }) // Sort by newest first

    // Filter out submissions where exam couldn't be populated (might be null)
    const validSubmissions = submissions.filter((sub) => sub.exam != null)

    // Process submission data to prepare exam history with detailed reports
    const examHistory = await Promise.all(
      validSubmissions.map(async (submission) => {
        try {
          // Skip if submission or its exam is null or undefined
          if (!submission || !submission._id || !submission.exam) {
            console.log("Skipping invalid submission:", submission)
            return null
          }

          // Get detailed report using ReportModel
          const detailedReport = await ReportModel.getAssessmentReport(
            submission._id
          )

          if (!detailedReport || !detailedReport.exam) {
            return null // Skip if report or exam not found
          }

          // Calculate performance metrics
          const scorePercentage =
            Math.round(
              (detailedReport.score.obtained / detailedReport.score.total) *
                100 *
                10
            ) / 10
          const questionsAttempted = detailedReport.questions.filter(
            (q) => q.submittedAnswer !== "Not answered"
          ).length
          const totalQuestions = detailedReport.questions.length

          // Calculate time taken in readable format
          const startTime = new Date(detailedReport.timeAnalysis.startTime)
          const endTime = new Date(detailedReport.timeAnalysis.endTime)
          const timeTakenMs = endTime - startTime

          const hours = Math.floor(timeTakenMs / (1000 * 60 * 60))
          const minutes = Math.floor(
            (timeTakenMs % (1000 * 60 * 60)) / (1000 * 60)
          )
          const timeTaken = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

          const examId = detailedReport.exam._id
          const examDoc = await Exam.findOne({ _id: examId })
          const examName = examDoc ? examDoc.name : "Untitled Exam"

          const scheduledAt = new Date(examDoc.scheduledAt)
          const scheduleTill = new Date(examDoc.scheduleTill)

          // Check if both are valid dates
          if (isNaN(scheduledAt) || isNaN(scheduleTill)) {
            console.error("Invalid date(s) in scheduledAt or scheduleTill")
            return {
              date: "Invalid Date",
            }
          }

          const datePart = scheduledAt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })

          const st = scheduledAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })

          const et = scheduleTill.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })

          const fullDate = `${datePart}, ${st} – ${et}`

          return {
            id: submission._id, // Use submission ID for detailed report access
            examId: examId,
            title: examName,
            subject: detailedReport.exam.subject || "Not specified",
            date: fullDate,
            scoreObtained: detailedReport.score.obtained,
            scoreTotal: detailedReport.score.total,
            scorePercentage: scorePercentage,
            questionsAttempted: questionsAttempted,
            totalQuestions: totalQuestions,
            timeTaken: timeTaken,
            submittedAt: new Date(submission.submittedAt).toLocaleString(),
            rank: detailedReport.ranking.rank,
            totalStudents: detailedReport.ranking.totalStudents,
            integrityStatus: detailedReport.integrity.status,
          }
        } catch (error) {
          console.error(
            `Error processing exam report for submission ${
              submission?._id || "unknown"
            }:`,
            error
          )
          console.error(
            "Submission object:",
            JSON.stringify(submission, null, 2)
          )
          // Return basic submission data as fallback
          if (!submission || !submission.exam) {
            return {
              id: submission ? submission._id : "unknown",
              title: "Exam Information Unavailable",
              subject: "Not available",
              date: "Unknown",
              scorePercentage: 0,
              submittedAt: submission
                ? new Date(submission.submittedAt).toLocaleString()
                : "Unknown",
              note: "Detailed report unavailable",
            }
          }

          return {
            id: submission._id,
            examId: submission.exam._id,
            title: submission.exam.title || "Untitled Exam",
            subject: submission.exam.subject || "Not specified",
            date: submission.exam.startTime
              ? new Date(submission.exam.startTime).toLocaleDateString()
              : "Unknown",
            scorePercentage:
              submission.score && submission.exam.totalMarks
                ? Math.round(
                    (submission.score / submission.exam.totalMarks) * 100 * 10
                  ) / 10
                : 0,
            submittedAt: new Date(submission.submittedAt).toLocaleString(),
            note: "Detailed report unavailable",
          }
        }
      })
    )

    // Filter out any nulls from the exam history
    const validExamHistory = examHistory.filter((exam) => exam !== null)

    // Render exam history view with enhanced data
    res.render("student_exam_history", {
      title: "Exam History",
      student,
      examHistory: validExamHistory,
    })
  } catch (error) {
    console.error("Error fetching student exam history:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching student exam history",
      error: error.message,
    })
  }
}

exports.getExamDetailedReport = async (req, res) => {
  try {
    const submissionId = req.params.submissionId

    // Get detailed report using ReportModel
    const detailedReport = await ReportModel.getAssessmentReport(submissionId)

    if (!detailedReport) {
      return res.status(404).json({
        success: false,
        message: "Exam report not found",
      })
    }

    // Render detailed report view
    res.render("exam_detailed_report", {
      title: "Exam Report",
      report: detailedReport,
    })
  } catch (error) {
    console.error("Error fetching exam report:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching exam report",
      error: error.message,
    })
  }
}

/**
 * Get student performance summary
 * GET /students/:usn/performance
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.params.studentId

    // Find student
    const student = await Student.findOne({ _id: studentId })

    if (!student) {
      return res.status(404).render("error", {
        message: "Student not found",
        error: { status: 404 },
      })
    }

    // Find all submissions for this student
    const submissions = await Submission.find({ student: studentUSN }).populate(
      "exam"
    )

    if (submissions.length === 0) {
      return res.render("student-performance", {
        title: "Student Performance",
        student,
        hasData: false,
        performanceData: null,
      })
    }

    // Calculate average score and other metrics
    let totalScore = 0
    let totalExams = submissions.length
    let subjectPerformance = {}

    // Process each submission
    for (const submission of submissions) {
      const exam = await Exam.findById(submission.exam)
      if (!exam) continue

      // Calculate score percentage for this exam
      const scorePercentage = (submission.score / exam.totalMarks) * 100
      totalScore += scorePercentage

      // Track subject performance
      if (!subjectPerformance[exam.subject]) {
        subjectPerformance[exam.subject] = {
          totalScore: 0,
          examCount: 0,
        }
      }

      subjectPerformance[exam.subject].totalScore += scorePercentage
      subjectPerformance[exam.subject].examCount += 1
    }

    // Calculate average score
    const averageScore = Math.round((totalScore / totalExams) * 10) / 10

    // Calculate average score per subject
    const subjectAverages = {}
    for (const subject in subjectPerformance) {
      const { totalScore, examCount } = subjectPerformance[subject]
      subjectAverages[subject] = Math.round((totalScore / examCount) * 10) / 10
    }

    // Render performance view
    res.render("student-performance", {
      title: "Student Performance",
      student,
      hasData: true,
      performanceData: {
        totalExams,
        averageScore,
        subjectAverages,
      },
    })
  } catch (error) {
    console.error("Error fetching student performance:", error)
    res.status(500).render("error", {
      message: "Error fetching student performance",
      error: { status: 500 },
    })
  }
}

// routes/evaluation.js

// Endpoint to evaluate a single student's submission
const evalsssinglecod = async (req, res) => {
  try {
    const { examId, userId } = req.params
    // const storeResults = req.query.store !== 'false'; // Default to true

    const results = await evaluateSubmission(userId, examId)
    console.log()
    res.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("Evaluation error:", error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Add this route handler to your admin controller or create a separate evaluation controller

/**
 * Evaluate all coding submissions for an exam
 * GET /admin/exam/:examId/evaluate-all
 */
exports.evaluateAllSubmissions = async (req, res) => {
  try {
    const examId = req.params.examId

    // Validate exam ID
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID",
      })
    }

    // Fetch the exam to ensure it exists
    const exam = await Exam.findById(examId)

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      })
    }

    // Check if exam has coding questions
    const hasCoding =
      exam.questionType === "coding" || exam.questionType === "mcq&coding"

    if (!hasCoding) {
      return res.status(400).json({
        success: false,
        message: "This exam does not have coding questions to evaluate",
      })
    }

    // Get all submissions for this exam
    const submissions = await Submission.find({ exam: examId })
      .populate("student", "USN fname lname _id")
      .select("student _id")

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for this exam",
      })
    }

    // Extract student IDs
    const submissionUserIds = submissions
      .map((submission) =>
        submission.student && submission.student._id
          ? submission.student._id.toString()
          : null
      )
      .filter((id) => id !== null)

    console.log(
      `Found ${submissionUserIds.length} submissions to potentially evaluate`
    )

    // Check which students already have evaluation results
    const EvaluationResult =
      mongoose.models.EvaluationResult ||
      mongoose.model(
        "EvaluationResult",
        require("../models/EvaluationResultSchema")
      )

    const existingEvaluations = await EvaluationResult.find({
      examId: examId,
      userId: { $in: submissionUserIds },
    }).select("userId")

    // Create a set of user IDs that already have evaluations
    const evaluatedUserIds = new Set(
      existingEvaluations.map((evaluation) => evaluation.userId.toString())
    )

    console.log(`Found ${evaluatedUserIds.size} students already evaluated`)

    // Filter out students who already have evaluations
    const unevaluatedUserIds = submissionUserIds.filter(
      (userId) => !evaluatedUserIds.has(userId)
    )

    console.log(`${unevaluatedUserIds.length} students need evaluation`)

    if (unevaluatedUserIds.length === 0) {
      return res.json({
        success: true,
        message: "All submissions have already been evaluated",
        data: {
          totalSubmissions: submissionUserIds.length,
          alreadyEvaluated: evaluatedUserIds.size,
          newlyEvaluated: 0,
          skipped: 0,
          errors: [],
        },
      })
    }

    console.log(
      `Starting batch evaluation for ${unevaluatedUserIds.length} students...`
    )

    // Start the batch evaluation process
    const startTime = Date.now()

    try {
      // Run batch evaluation for unevaluated students only
      const batchResults = await batchEvaluateSubmissions(
        examId,
        unevaluatedUserIds
      )

      const endTime = Date.now()
      const duration = Math.round((endTime - startTime) / 1000) // seconds

      console.log(`Batch evaluation completed in ${duration} seconds`)

      // Process the results
      const evaluationResults = batchResults.results || []
      const errors = batchResults.errors || []

      // Count successful evaluations
      const successfulEvaluations = evaluationResults.length
      const failedEvaluations = errors.length

      // Log summary
      console.log(`Evaluation Summary:
                - Total to evaluate: ${unevaluatedUserIds.length}
                - Successfully evaluated: ${successfulEvaluations}
                - Failed evaluations: ${failedEvaluations}
                - Duration: ${duration} seconds`)

      // Return detailed response
      return res.json({
        success: true,
        message: `Evaluation completed! ${successfulEvaluations} students evaluated successfully${
          failedEvaluations > 0 ? `, ${failedEvaluations} failed` : ""
        }`,
        data: {
          totalSubmissions: submissionUserIds.length,
          alreadyEvaluated: evaluatedUserIds.size,
          newlyEvaluated: successfulEvaluations,
          failed: failedEvaluations,
          duration: duration,
          errors: errors.length > 0 ? errors : null,
          statistics: batchResults.statistics || null,
        },
      })
    } catch (batchError) {
      console.error("Batch evaluation failed:", batchError)

      return res.status(500).json({
        success: false,
        message: `Batch evaluation failed: ${batchError.message}`,
        data: {
          totalSubmissions: submissionUserIds.length,
          alreadyEvaluated: evaluatedUserIds.size,
          newlyEvaluated: 0,
          failed: unevaluatedUserIds.length,
          error: batchError.message,
        },
      })
    }
  } catch (error) {
    console.error("Error in evaluateAllSubmissions:", error)

    return res.status(500).json({
      success: false,
      message: "Internal server error during evaluation",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Server error",
    })
  }
}

/**
 * Get evaluation status for an exam (without triggering evaluation)
 * GET /admin/exam/:examId/evaluation-status
 */
exports.getEvaluationStatus = async (req, res) => {
  try {
    const examId = req.params.examId

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID",
      })
    }

    // Get all submissions for this exam
    const submissions = await Submission.find({ exam: examId })
      .populate("student", "_id")
      .select("student")

    const submissionUserIds = submissions
      .map((s) =>
        s.student && s.student._id ? s.student._id.toString() : null
      )
      .filter((id) => id !== null)

    // Check existing evaluations
    const EvaluationResult =
      mongoose.models.EvaluationResult ||
      mongoose.model(
        "EvaluationResult",
        require("../models/EvaluationResultSchema")
      )

    const existingEvaluations = await EvaluationResult.find({
      examId: examId,
      userId: { $in: submissionUserIds },
    }).select("userId totalScore maxPossibleScore percentage")

    const evaluatedCount = existingEvaluations.length
    const pendingCount = submissionUserIds.length - evaluatedCount

    return res.json({
      success: true,
      data: {
        total: submissionUserIds.length,
        evaluated: evaluatedCount,
        pending: pendingCount,
        evaluations: existingEvaluations,
      },
    })
  } catch (error) {
    console.error("Error getting evaluation status:", error)
    return res.status(500).json({
      success: false,
      message: "Error getting evaluation status",
      error: error.message,
    })
  }
}

/**
 * Re-evaluate specific students (for failed evaluations)
 * POST /admin/exam/:examId/re-evaluate
 * Body: { userIds: ["userId1", "userId2", ...] }
 */
exports.reEvaluateSubmissions = async (req, res) => {
  try {
    const examId = req.params.examId
    const { userIds } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of user IDs to re-evaluate",
      })
    }

    console.log(`Re-evaluating ${userIds.length} students for exam ${examId}`)

    const batchResults = await batchEvaluateSubmissions(examId, userIds)

    const successfulEvaluations = batchResults.results
      ? batchResults.results.length
      : 0
    const errors = batchResults.errors || []

    return res.json({
      success: true,
      message: `Re-evaluation completed! ${successfulEvaluations} students re-evaluated${
        errors.length > 0 ? `, ${errors.length} failed` : ""
      }`,
      data: {
        evaluated: successfulEvaluations,
        failed: errors.length,
        errors: errors.length > 0 ? errors : null,
      },
    })
  } catch (error) {
    console.error("Error in re-evaluation:", error)
    return res.status(500).json({
      success: false,
      message: "Re-evaluation failed",
      error: error.message,
    })
  }
}

// exports.examCandidates = async(req, res) => {
//     try {
//         const examId = req.params.examId;

//         // Fetch the exam details with populated questions
//         const exam = await Exam.findById(examId)
//             .populate('mcqQuestions')
//             .populate('codingQuestions');

//         if (!exam) {
//             return res.status(404).render('error', {
//                 message: 'Exam not found',
//                 error: { status: 404, stack: '' }
//             });
//         }

//         // Determine if this exam has MCQ questions, coding questions, or both
//         const hasMCQ = exam.questionType === 'mcq' || exam.questionType === 'mcq&coding';
//         const hasCoding = exam.questionType === 'coding' || exam.questionType === 'mcq&coding';

//         // Calculate maximum possible scores
//         let maxMCQScore = 0;
//         if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
//             maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
//         }

//         let maxCodingScore = 0;
//         if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
//             maxCodingScore = exam.codingQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
//         }

//         // Fetch all submissions related to this exam
//         const submissions = await Submission.find({ exam: examId })
//             .populate('student', 'USN email Department Semester Rollno _id fname lname')
//             .sort({ submittedAt: -1 }); // Most recent submissions first

//         // Create a set of student IDs who have submitted
//         const submittedStudentIds = new Set();
//         submissions.forEach(submission => {
//             if (submission.student && submission.student._id) {
//                 submittedStudentIds.add(submission.student._id.toString());
//             }
//         });

//         // MODIFIED: Only check for existing evaluations, don't create new ones
//         let evaluationMap = new Map();
//         if (hasCoding) {
//             // Get the user IDs from submissions
//             const submissionUserIds = submissions.map(submission =>
//                 submission.student && submission.student._id ?
//                 submission.student._id.toString() : null
//             ).filter(id => id !== null);

//             // Check which students already have evaluation results (READ ONLY)
//             const EvaluationResult = mongoose.models.EvaluationResult ||
//                 mongoose.model('EvaluationResult', evaluationResultSchema);

//             const existingEvaluations = await EvaluationResult.find({
//                 examId: examId,
//                 userId: { $in: submissionUserIds }
//             }).select('userId totalScore maxPossibleScore percentage');

//             console.log(`Found ${existingEvaluations.length} students with existing evaluations`);

//             // Create a map of user ID to evaluation result for easy lookup
//             existingEvaluations.forEach(eval => {
//                 evaluationMap.set(eval.userId.toString(), eval);
//             });

//             // Log evaluation status without triggering new evaluations
//             const evaluatedCount = existingEvaluations.length;
//             const totalSubmissions = submissionUserIds.length;
//             const pendingCount = totalSubmissions - evaluatedCount;

//             console.log(`Evaluation Status - Total: ${totalSubmissions}, Evaluated: ${evaluatedCount}, Pending: ${pendingCount}`);
//         }

//         // Fetch active sessions for this exam
//         const activeSessions = await ActivityTracker.find({ examId: examId })
//             .populate('userId', 'USN email Department Semester Rollno _id fname lname')
//             .select('userId status lastPingTimestamp')
//             .sort({ lastPingTimestamp: -1 });

//         // Update status to offline for students who have submitted
//         const updatePromises = [];
//         activeSessions.forEach(session => {
//             if (session.userId && session.userId._id) {
//                 const studentId = session.userId._id.toString();

//                 // If student has submitted, update their status to offline
//                 if (submittedStudentIds.has(studentId) && session.status !== 'offline') {
//                     updatePromises.push(
//                         ActivityTracker.findByIdAndUpdate(
//                             session._id,
//                             {
//                                 status: 'offline',
//                                 $push: {
//                                     pingHistory: {
//                                         timestamp: new Date(),
//                                         status: 'offline'
//                                     }
//                                 }
//                             }
//                         )
//                     );

//                     // Update the session object to reflect the new status
//                     session.status = 'offline';
//                 }
//             }
//         });

//         // Execute all update promises
//         if (updatePromises.length > 0) {
//             await Promise.all(updatePromises);
//         }

//         // Convert active sessions to a map for easy lookup
//         const activeSessionsMap = new Map();
//         activeSessions.forEach(session => {
//             // Skip if userId is not properly populated
//             if (!session.userId || !session.userId._id) return;

//             const userId = session.userId._id.toString();
//             activeSessionsMap.set(userId, {
//                 status: session.status,
//                 lastPing: session.lastPingTimestamp,
//                 studentInfo: session.userId
//             });
//         });

//         // Process all submissions
//         const studentMap = new Map();
//         for (const submission of submissions) {
//             if (submission.student && submission.student._id && !studentMap.has(submission.student._id.toString())) {
//                 const studentId = submission.student._id.toString();
//                 const activeSession = activeSessionsMap.get(studentId);

//                 // Get MCQ score using ReportModel
//                 let mcqScore = 0;
//                 let report = null;

//                 if (hasMCQ && submission._id) {
//                     try {
//                         // Get assessment report for MCQ scores
//                         report = await ReportModel.getAssessmentReport(submission._id);
//                         if (report && report.score) {
//                             mcqScore = report.score.obtained;
//                         }
//                     } catch (error) {
//                         console.error(`Error getting report for submission ${submission._id}:`, error);
//                         // Fallback: If ReportModel fails, try to calculate MCQ score manually
//                         if (submission.mcqAnswers && submission.mcqAnswers.length > 0) {
//                             // Calculate MCQ score from submission data
//                             let calculatedMCQScore = 0;
//                             for (const answer of submission.mcqAnswers) {
//                                 try {
//                                     const question = await mongoose.model('MCQ').findById(answer.questionId);
//                                     if (question && answer.selectedOption === question.correctAnswer) {
//                                         calculatedMCQScore += question.marks || 0;
//                                     }
//                                 } catch (err) {
//                                     console.error('Error calculating MCQ score:', err);
//                                 }
//                             }
//                             mcqScore = calculatedMCQScore;
//                         }
//                     }
//                 }

//                 // MODIFIED: Only check existing coding evaluation scores, don't create new ones
//                 let codingScore = 0;
//                 let isEvaluated = false;

//                 if (hasCoding) {
//                     const evaluation = evaluationMap.get(studentId);
//                     if (evaluation) {
//                         // Use totalScore from the existing evaluation result
//                         codingScore = evaluation.totalScore || 0;
//                         isEvaluated = true;
//                     }
//                     // If no evaluation exists, codingScore remains 0 and isEvaluated remains false
//                 }

//                 // Calculate total score
//                 const totalScore = mcqScore + codingScore;
//                 const totalPossible = maxMCQScore + maxCodingScore;

//                 // Format display score
//                 let displayScore = '';
//                 if (hasMCQ && hasCoding) {
//                     if (isEvaluated) {
//                         displayScore = `${totalScore}/${totalPossible}`;
//                     } else {
//                         displayScore = `${mcqScore}/${maxMCQScore} + Pending`;
//                     }
//                 } else if (hasMCQ) {
//                     displayScore = `${mcqScore}/${maxMCQScore}`;
//                 } else if (hasCoding) {
//                     if (isEvaluated) {
//                         displayScore = `${codingScore}/${maxCodingScore}`;
//                     } else {
//                         displayScore = 'Pending Evaluation';
//                     }
//                 } else {
//                     displayScore = 'N/A';
//                 }

//                 studentMap.set(studentId, {
//                     student: submission.student,
//                     submission: submission,
//                     score: displayScore,
//                     mcqScore: mcqScore,
//                     codingScore: codingScore,
//                     totalScore: totalScore,
//                     maxMCQScore: maxMCQScore,
//                     maxCodingScore: maxCodingScore,
//                     maxTotalScore: totalPossible,
//                     evaluationStatus: hasCoding ?
//                         (isEvaluated ? 'Evaluated' : 'Pending Evaluation') : 'N/A',
//                     submittedAt: submission.submittedAt,
//                     activityStatus: activeSession ? activeSession.status : 'offline',
//                     lastActive: activeSession ? activeSession.lastPing : null,
//                     hasSubmitted: true
//                 });

//                 // Remove from active sessions map to avoid duplicates
//                 activeSessionsMap.delete(studentId);
//             }
//         }

//         // Process active sessions of students who haven't submitted
//         activeSessionsMap.forEach((session, studentId) => {
//             if (!submittedStudentIds.has(studentId)) {
//                 studentMap.set(studentId, {
//                     student: session.studentInfo,
//                     submission: null,
//                     score: 'In progress',
//                     mcqScore: 0,
//                     codingScore: 0,
//                     totalScore: 0,
//                     maxMCQScore: maxMCQScore,
//                     maxCodingScore: maxCodingScore,
//                     maxTotalScore: maxMCQScore + maxCodingScore,
//                     evaluationStatus: 'Not submitted',
//                     submittedAt: null,
//                     activityStatus: session.status,
//                     lastActive: session.lastPing,
//                     hasSubmitted: false
//                 });
//             }
//         });

//         const candidates = Array.from(studentMap.values());

//         // Sort candidates: active students first, then by submission status and time
//         candidates.sort((a, b) => {
//             // First prioritize active status
//             if (a.activityStatus === 'active' && b.activityStatus !== 'active') return -1;
//             if (a.activityStatus !== 'active' && b.activityStatus === 'active') return 1;

//             // Then by submission status (submitted after non-submitted)
//             if (a.hasSubmitted && !b.hasSubmitted) return -1;
//             if (!a.hasSubmitted && b.hasSubmitted) return 1;

//             // If both have submitted, sort by total score (higher first)
//             if (a.hasSubmitted && b.hasSubmitted) {
//                 if (a.totalScore !== b.totalScore) {
//                     return b.totalScore - a.totalScore;
//                 }
//             }

//             // Then by submission time (most recent first)
//             if (a.submittedAt && b.submittedAt) {
//                 return new Date(b.submittedAt) - new Date(a.submittedAt);
//             }

//             // Finally by last active time
//             if (a.lastActive && b.lastActive) {
//                 return new Date(b.lastActive) - new Date(a.lastActive);
//             }

//             return 0;
//         });

//         // MODIFIED: Calculate evaluation summary without triggering evaluations
//         const evaluationSummary = hasCoding ? {
//             total: submissions.length,
//             evaluated: submissions.filter(s =>
//                 s.student && s.student._id && evaluationMap.has(s.student._id.toString())
//             ).length,
//             pending: submissions.filter(s =>
//                 s.student && s.student._id && !evaluationMap.has(s.student._id.toString())
//             ).length
//         } : { total: 0, evaluated: 0, pending: 0 };

//         // Render the candidates view
//         res.render('exam_candidates', {
//             title: `Candidates for ${exam.name}`,
//             exam: exam,
//             candidates: candidates,
//             hasMCQ: hasMCQ,
//             hasCoding: hasCoding,
//             scoreSummary: {
//                 maxMCQScore: maxMCQScore,
//                 maxCodingScore: maxCodingScore,
//                 maxTotalScore: maxMCQScore + maxCodingScore
//             },
//             evaluationResults: evaluationSummary
//         });

//     } catch (error) {
//         console.error('Error fetching exam candidates:', error);
//         res.status(500).render('error', {
//             message: 'Error fetching exam candidates',
//             error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
//         });
//     }
// }

exports.examCandidates = async (req, res) => {
  try {
    const examId = req.params.examId

    // Check if this is an AJAX request for data
    const isAjaxDataRequest =
      req.query.ajax === "true" ||
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      (req.headers.accept && req.headers.accept.includes("application/json"))

    if (isAjaxDataRequest) {
      // Handle AJAX request - return JSON data
      return await handleCandidatesDataRequest(req, res, examId)
    }

    // Handle regular page request - return HTML
    return await handleCandidatesPageRequest(req, res, examId)
  } catch (error) {
    console.error("Error in examCandidates:", error)
    if (
      req.query.ajax === "true" ||
      (req.headers.accept && req.headers.accept.includes("application/json"))
    ) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    } else {
      return res.status(500).render("error", {
        message: "Error fetching exam candidates",
        error: {
          status: 500,
          stack: process.env.NODE_ENV === "development" ? error.stack : "",
        },
      })
    }
  }
}

// Helper function to get candidates data
async function getCandidatesData(
  examId,
  exam,
  hasMCQ,
  hasCoding,
  maxMCQScore,
  maxCodingScore
) {
  // Fetch submissions
  const submissions = await Submission.find({ exam: examId })
    .populate(
      "student",
      "USN email Department Semester Rollno _id fname lname CurrentSemester"
    )
    .sort({ submittedAt: -1 })

  // Create a set of student IDs who have submitted
  const submittedStudentIds = new Set()
  submissions.forEach((submission) => {
    if (submission.student && submission.student._id) {
      submittedStudentIds.add(submission.student._id.toString())
    }
  })

  // Get evaluation map for coding exams
  let evaluationMap = new Map()
  if (hasCoding) {
    const submissionUserIds = submissions
      .map((submission) =>
        submission.student && submission.student._id
          ? submission.student._id.toString()
          : null
      )
      .filter((id) => id !== null)

    const EvaluationResult =
      mongoose.models.EvaluationResult ||
      mongoose.model("EvaluationResult", evaluationResultSchema)

    const existingEvaluations = await EvaluationResult.find({
      examId: examId,
      userId: { $in: submissionUserIds },
    }).select("userId totalScore maxPossibleScore percentage")

    existingEvaluations.forEach((evaluation) => {
      evaluationMap.set(evaluation.userId.toString(), evaluation)
    })
  }

  // Check if exam has ended
  const now = new Date()
  const examEndTime = new Date(exam.scheduleTill)
  const examHasEnded = now > examEndTime

  // Fetch active sessions for this exam
  const activeSessions = await ActivityTracker.find({ examId: examId })
    .populate(
      "userId",
      "USN email Department Semester Rollno _id fname lname CurrentSemester"
    )
    .select("userId status lastPingTimestamp")
    .sort({ lastPingTimestamp: -1 })

  // Update status to offline for students who have submitted OR if exam has ended
  const updatePromises = []
  activeSessions.forEach((session) => {
    if (!session.userId || !session.userId._id) {
      if (session.status !== "offline") {
        updatePromises.push(
          ActivityTracker.findByIdAndUpdate(session._id, { status: "offline" })
        )
        session.status = "offline"
      }
      return
    }

    const studentId = session.userId._id.toString()
    const shouldBeOffline = submittedStudentIds.has(studentId) || examHasEnded

    if (shouldBeOffline && session.status !== "offline") {
      updatePromises.push(
        ActivityTracker.findByIdAndUpdate(session._id, { status: "offline" })
      )
      session.status = "offline"
    }
  })

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises)
  }

  // Convert active sessions to a map
  const activeSessionsMap = new Map()
  activeSessions.forEach((session) => {
    if (!session.userId || !session.userId._id) return

    const userId = session.userId._id.toString()
    activeSessionsMap.set(userId, {
      status: session.status,
      lastPing: session.lastPingTimestamp,
      studentInfo: session.userId,
    })
  })

  // Process all candidates
  const studentMap = new Map()

  // Process submitted students
  for (const submission of submissions) {
    if (
      submission.student &&
      submission.student._id &&
      !studentMap.has(submission.student._id.toString())
    ) {
      const studentId = submission.student._id.toString()
      const activeSession = activeSessionsMap.get(studentId)

      let mcqScore = submission.score || 0
      let codingScore = 0
      let isEvaluated = false

      if (hasCoding) {
        const evaluation = evaluationMap.get(studentId)
        if (evaluation) {
          codingScore = evaluation.totalScore || 0
          isEvaluated = true
        }
      }

      const totalScore = mcqScore + codingScore
      const totalPossible = maxMCQScore + maxCodingScore

      let displayScore = ""
      if (hasMCQ && hasCoding) {
        displayScore = isEvaluated
          ? `${totalScore}/${totalPossible}`
          : `${mcqScore}/${maxMCQScore} + Pending`
      } else if (hasMCQ) {
        displayScore = `${mcqScore}/${maxMCQScore}`
      } else if (hasCoding) {
        displayScore = isEvaluated
          ? `${codingScore}/${maxCodingScore}`
          : "Pending Evaluation"
      } else {
        displayScore = "N/A"
      }

      studentMap.set(studentId, {
        student: submission.student,
        submission: submission,
        score: displayScore,
        mcqScore: mcqScore,
        codingScore: codingScore,
        totalScore: totalScore,
        maxMCQScore: maxMCQScore,
        maxCodingScore: maxCodingScore,
        maxTotalScore: totalPossible,
        evaluationStatus: hasCoding
          ? isEvaluated
            ? "Evaluated"
            : "Pending Evaluation"
          : "N/A",
        submittedAt: submission.submittedAt,
        activityStatus: activeSession ? activeSession.status : "offline",
        lastActive: activeSession ? activeSession.lastPing : null,
        hasSubmitted: true,
      })

      activeSessionsMap.delete(studentId)
    }
  }

  // Process active sessions for students who haven't submitted (started but left)
  for (const [userId, sessionData] of activeSessionsMap) {
    if (!studentMap.has(userId)) {
      const student = sessionData.studentInfo
      if (!student || !student._id) continue

      const now = new Date()
      const lastPingTime = new Date(sessionData.lastPing)
      const timeSinceLastPing = (now - lastPingTime) / 1000 / 60 // in minutes

      let activityStatus = sessionData.status

      // Determine the actual status based on various conditions
      if (activityStatus === "left") {
        // Already marked as left
        activityStatus = "left"
      } else if (examHasEnded) {
        // Exam has ended and student didn't submit - they left
        activityStatus = "left"
      } else if (activityStatus === "active" && timeSinceLastPing <= 2) {
        // Recent ping within 2 minutes - still active
        activityStatus = "active"
      } else if (timeSinceLastPing > 5) {
        // No ping for more than 5 minutes - they left
        activityStatus = "left"
      } else if (activityStatus === "inactive" && timeSinceLastPing > 2) {
        // Inactive for more than 2 minutes - they left
        activityStatus = "left"
      } else if (activityStatus === "offline") {
        // Marked as offline without submission - they left
        activityStatus = "left"
      }

      // Check if there's a partial submission for this student
      let partialAnswersCount = 0
      try {
        const PartialSubmission = mongoose.models.PartialSubmission
        if (PartialSubmission) {
          const partial = await PartialSubmission.findOne({
            exam: examId,
            student: userId,
          })
          if (partial && partial.mcqAnswers) {
            partialAnswersCount =
              partial.mcqAnswers.size ||
              Object.keys(partial.mcqAnswers).length ||
              0
          }
        }
      } catch (err) {
        console.log("Could not fetch partial submission:", err)
      }

      studentMap.set(userId, {
        student: student,
        submission: null,
        score:
          partialAnswersCount > 0
            ? `Partial (${partialAnswersCount} answered)`
            : "Did not submit",
        mcqScore: 0,
        codingScore: 0,
        totalScore: 0,
        maxMCQScore: maxMCQScore,
        maxCodingScore: maxCodingScore,
        maxTotalScore: maxMCQScore + maxCodingScore,
        evaluationStatus:
          partialAnswersCount > 0 ? "Partial submission" : "Not submitted",
        submittedAt: null,
        activityStatus: activityStatus,
        lastActive: sessionData.lastPing,
        hasSubmitted: false,
        hasStarted: true,
        hasPartialSubmission: partialAnswersCount > 0,
        partialAnswersCount: partialAnswersCount,
      })
    }
  }

  let candidates = Array.from(studentMap.values())

  // Sort candidates
  candidates.sort((a, b) => {
    if (a.activityStatus === "active" && b.activityStatus !== "active")
      return -1
    if (a.activityStatus !== "active" && b.activityStatus === "active") return 1

    if (a.hasSubmitted && !b.hasSubmitted) return -1
    if (!a.hasSubmitted && b.hasSubmitted) return 1

    if (a.hasSubmitted && b.hasSubmitted) {
      if (a.totalScore !== b.totalScore) {
        return b.totalScore - a.totalScore
      }
    }

    if (a.submittedAt && b.submittedAt) {
      return new Date(b.submittedAt) - new Date(a.submittedAt)
    }

    return 0
  })

  return candidates
}

// Helper function for page requests (your existing examCandidates logic)
async function handleCandidatesPageRequest(req, res, examId) {
  // Fetch the exam details with populated questions
  const exam = await Exam.findById(examId).populate("mcqQuestions")

  if (!exam) {
    return res.status(404).render("error", {
      message: "Exam not found",
      error: { status: 404, stack: "" },
    })
  }

  // Determine if this exam has MCQ questions, coding questions, or both
  const hasMCQ =
    exam.questionType === "mcq" || exam.questionType === "mcq&coding"
  const hasCoding =
    exam.questionType === "coding" || exam.questionType === "mcq&coding"

  // Calculate maximum possible scores
  let maxMCQScore = 0
  if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
    maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0)
  }

  let maxCodingScore = 0
  if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
    maxCodingScore = exam.codingQuestions.reduce(
      (sum, q) => sum + (q.maxMarks || 0),
      0
    )
  }

  // MODIFIED: Only get evaluation summary for coding exams
  let evaluationSummary = { total: 0, evaluated: 0, pending: 0 }

  if (hasCoding) {
    // Get total submissions count
    const totalSubmissions = await Submission.countDocuments({ exam: examId })

    // Get evaluated submissions count
    const submittedStudentIds = await Submission.find({ exam: examId })
      .select("student")
      .lean()

    const studentIds = submittedStudentIds
      .map((s) => (s.student ? s.student.toString() : null))
      .filter((id) => id !== null)

    const EvaluationResult =
      mongoose.models.EvaluationResult ||
      mongoose.model("EvaluationResult", evaluationResultSchema)

    const evaluatedCount = await EvaluationResult.countDocuments({
      examId: examId,
      userId: { $in: studentIds },
    })

    evaluationSummary = {
      total: totalSubmissions,
      evaluated: evaluatedCount,
      pending: totalSubmissions - evaluatedCount,
    }
  }

  // Get the actual candidates data instead of empty array
  const candidatesData = await getCandidatesData(
    examId,
    exam,
    hasMCQ,
    hasCoding,
    maxMCQScore,
    maxCodingScore
  )

  // Get total candidates count for display
  const totalCandidatesCount = candidatesData.length

  // Render the candidates view WITH candidate data
  res.render("exam_candidates", {
    title: `Candidates for ${exam.name}`,
    exam: exam,
    candidates: candidatesData, // ACTUAL DATA instead of empty array
    hasMCQ: hasMCQ,
    hasCoding: hasCoding,
    scoreSummary: {
      maxMCQScore: maxMCQScore,
      maxCodingScore: maxCodingScore,
      maxTotalScore: maxMCQScore + maxCodingScore,
    },
    evaluationResults: evaluationSummary,
    totalCandidates: totalCandidatesCount,
  })
}

// Helper function for AJAX requests (your existing examCandidatesData logic)
async function handleCandidatesDataRequest(req, res, examId) {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const search = req.query.search || ""
  const departmentFilter = req.query.department || ""
  const statusFilter = req.query.status || ""

  const skip = (page - 1) * limit

  // Fetch the exam details
  const exam = await Exam.findById(examId).populate("mcqQuestions")

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    })
  }

  // Determine if this exam has MCQ questions, coding questions, or both
  const hasMCQ =
    exam.questionType === "mcq" || exam.questionType === "mcq&coding"
  const hasCoding =
    exam.questionType === "coding" || exam.questionType === "mcq&coding"

  let maxCodingScore = 0
  if (hasCoding) {
    const codingEvaluation = await EvaluationResult.findOne({
      examId: exam._id,
    }).lean()
    maxCodingScore = codingEvaluation
      ? codingEvaluation.maxPossibleScore || 0
      : 0
  }

  // Calculate maximum possible scores
  let maxMCQScore = 0
  if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
    maxMCQScore = exam.mcqQuestions.reduce((sum, q) => sum + (q.marks || 0), 0)
  }

  // if (hasCoding && exam.codingQuestions && exam.codingQuestions.length > 0) {
  //     maxCodingScore = exam.codingQuestions.reduce((sum, q) => sum + (q.maxMarks || 0), 0);
  // }

  // Build base query for submissions
  let submissionQuery = { exam: examId }

  // Apply search filter if provided
  if (search) {
    // First get matching students
    const studentSearchQuery = {
      $or: [
        { USN: { $regex: search, $options: "i" } },
        { Rollno: { $regex: search, $options: "i" } },
        { Department: { $regex: search, $options: "i" } },
      ],
    }

    const matchingStudents = await mongoose
      .model("Student")
      .find(studentSearchQuery)
      .select("_id")
    const studentIds = matchingStudents.map((s) => s._id)

    submissionQuery.student = { $in: studentIds }
  }

  // Fetch submissions based on query
  const submissions = await Submission.find(submissionQuery)
    .populate("student", "USN email Department Semester Rollno _id fname lname")
    .sort({ submittedAt: -1 })

  // Apply department filter
  let filteredSubmissions = submissions
  if (departmentFilter) {
    filteredSubmissions = submissions.filter(
      (s) => s.student && s.student.Department === departmentFilter
    )
  }

  // Create a set of student IDs who have submitted
  const submittedStudentIds = new Set()
  filteredSubmissions.forEach((submission) => {
    if (submission.student && submission.student._id) {
      submittedStudentIds.add(submission.student._id.toString())
    }
  })

  // Get evaluation map for coding exams
  let evaluationMap = new Map()
  if (hasCoding) {
    const submissionUserIds = filteredSubmissions
      .map((submission) =>
        submission.student && submission.student._id
          ? submission.student._id.toString()
          : null
      )
      .filter((id) => id !== null)

    const EvaluationResult =
      mongoose.models.EvaluationResult ||
      mongoose.model(
        "EvaluationResult",
        require("../models/EvaluationResultSchema")
      )

    const existingEvaluations = await EvaluationResult.find({
      examId: examId,
      userId: { $in: submissionUserIds },
    }).select("userId totalScore maxPossibleScore percentage")

    existingEvaluations.forEach((evaluation) => {
      evaluationMap.set(evaluation.userId.toString(), evaluation)
    })
  }

  // Check if exam has ended
  const now = new Date()
  const examEndTime = new Date(exam.scheduleTill)
  const examHasEnded = now > examEndTime

  // Fetch active sessions for this exam
  const activeSessions = await ActivityTracker.find({ examId: examId })
    .populate("userId", "USN email Department Semester Rollno _id fname lname")
    .select("userId status lastPingTimestamp")
    .sort({ lastPingTimestamp: -1 })

  // Update status to offline for students who have submitted OR if exam has ended
  // Also handle orphaned sessions where userId populate failed
  const updatePromises = []
  const orphanedSessionIds = []

  activeSessions.forEach((session) => {
    // Check if this is an orphaned session (userId populate failed)
    if (!session.userId || !session.userId._id) {
      console.warn(
        `Orphaned ActivityTracker session found: ${session._id} - userId reference is invalid`
      )

      // Mark orphaned session as offline and track for potential cleanup
      if (session.status !== "offline") {
        updatePromises.push(
          ActivityTracker.findByIdAndUpdate(session._id, {
            status: "offline",
            $push: {
              pingHistory: {
                timestamp: new Date(),
                status: "offline",
              },
            },
          })
        )
        session.status = "offline"
      }
      orphanedSessionIds.push(session._id)
      return // Skip this session from further processing
    }

    const studentId = session.userId._id.toString()

    // Mark session as offline if:
    // 1. Student has submitted, OR
    // 2. Exam has ended (past scheduleTill time)
    const shouldBeOffline = submittedStudentIds.has(studentId) || examHasEnded

    if (shouldBeOffline && session.status !== "offline") {
      updatePromises.push(
        ActivityTracker.findByIdAndUpdate(session._id, {
          status: "offline",
          $push: {
            pingHistory: {
              timestamp: new Date(),
              status: "offline",
            },
          },
        })
      )
      session.status = "offline"
    }
  })

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises)
    console.log(
      `Updated ${updatePromises.length} session statuses to offline (including ${orphanedSessionIds.length} orphaned sessions)`
    )
  }

  // Convert active sessions to a map
  const activeSessionsMap = new Map()
  activeSessions.forEach((session) => {
    if (!session.userId || !session.userId._id) return

    const userId = session.userId._id.toString()
    activeSessionsMap.set(userId, {
      status: session.status,
      lastPing: session.lastPingTimestamp,
      studentInfo: session.userId,
    })
  })

  // Process all submissions and active sessions
  const studentMap = new Map()

  // Process submitted students
  for (const submission of filteredSubmissions) {
    if (
      submission.student &&
      submission.student._id &&
      !studentMap.has(submission.student._id.toString())
    ) {
      const studentId = submission.student._id.toString()
      const activeSession = activeSessionsMap.get(studentId)

      // Get MCQ score - use pre-calculated score from submission (OPTIMIZED!)
      let mcqScore = submission.score || 0

      // Get coding score
      let codingScore = 0
      let isEvaluated = false

      if (hasCoding) {
        const evaluation = evaluationMap.get(studentId)
        if (evaluation) {
          codingScore = evaluation.totalScore || 0
          isEvaluated = true
        }
      }

      const totalScore = mcqScore + codingScore
      const totalPossible = maxMCQScore + maxCodingScore

      let displayScore = ""
      if (hasMCQ && hasCoding) {
        if (isEvaluated) {
          displayScore = `${totalScore}/${totalPossible}`
        } else {
          displayScore = `${mcqScore}/${maxMCQScore} + Pending`
        }
      } else if (hasMCQ) {
        displayScore = `${mcqScore}/${maxMCQScore}`
      } else if (hasCoding) {
        if (isEvaluated) {
          displayScore = `${codingScore}/${maxCodingScore}`
        } else {
          displayScore = "Pending Evaluation"
        }
      } else {
        displayScore = "N/A"
      }

      studentMap.set(studentId, {
        student: submission.student,
        submission: submission,
        score: displayScore,
        mcqScore: mcqScore,
        codingScore: codingScore,
        totalScore: totalScore,
        maxMCQScore: maxMCQScore,
        maxCodingScore: maxCodingScore,
        maxTotalScore: totalPossible,
        evaluationStatus: hasCoding
          ? isEvaluated
            ? "Evaluated"
            : "Pending Evaluation"
          : "N/A",
        submittedAt: submission.submittedAt,
        activityStatus: activeSession ? activeSession.status : "offline",
        lastActive: activeSession ? activeSession.lastPing : null,
        hasSubmitted: true,
      })

      activeSessionsMap.delete(studentId)
    } else if (!submission.student || !submission.student._id) {
      // ORPHANED SUBMISSION: Student reference is missing or invalid
      console.warn(
        `Orphaned submission found: ${submission._id} - student reference is invalid`
      )

      // Create a unique ID for orphaned submission (use submission ID)
      const orphanedId = `orphaned_${submission._id}`

      // Get MCQ score from submission
      let mcqScore = submission.score || 0

      // Create placeholder student object
      const placeholderStudent = {
        _id: submission.student || "unknown",
        USN: "[DELETED USER]",
        fname: "Student",
        lname: "Deleted",
        email: "deleted@user",
        Department: "N/A",
        Semester: "N/A",
        Rollno: "N/A",
      }

      let displayScore = ""
      if (hasMCQ && hasCoding) {
        displayScore = `${mcqScore}/${maxMCQScore} + Unavailable`
      } else if (hasMCQ) {
        displayScore = `${mcqScore}/${maxMCQScore}`
      } else if (hasCoding) {
        displayScore = "Data Unavailable"
      } else {
        displayScore = "N/A"
      }

      studentMap.set(orphanedId, {
        student: placeholderStudent,
        submission: submission,
        score: displayScore,
        mcqScore: mcqScore,
        codingScore: 0,
        totalScore: mcqScore,
        maxMCQScore: maxMCQScore,
        maxCodingScore: maxCodingScore,
        maxTotalScore: maxMCQScore + maxCodingScore,
        evaluationStatus: "User Deleted",
        submittedAt: submission.submittedAt,
        activityStatus: "offline",
        lastActive: null,
        hasSubmitted: true,
        isOrphaned: true, // Flag to identify orphaned submissions
      })
    }
  }

  // Process active sessions for students who haven't submitted (started but left)
  for (const [userId, sessionData] of activeSessionsMap) {
    if (!studentMap.has(userId)) {
      const studentId = userId
      const student = sessionData.studentInfo

      if (!student || !student._id) continue // Skip if no valid student data

      // Determine if student left the exam
      const now = new Date()
      const lastPingTime = new Date(sessionData.lastPing)
      const timeSinceLastPing = (now - lastPingTime) / 1000 / 60 // in minutes

      // Consider student as "left" if:
      // 1. Last ping was more than 5 minutes ago and status is not active
      // 2. OR exam has ended
      let activityStatus = sessionData.status
      if (examHasEnded) {
        activityStatus = "left" // Mark as left if exam ended without submission
      } else if (timeSinceLastPing > 5 && sessionData.status !== "active") {
        activityStatus = "left"
      }

      studentMap.set(studentId, {
        student: student,
        submission: null,
        score: "Did not submit",
        mcqScore: 0,
        codingScore: 0,
        totalScore: 0,
        maxMCQScore: maxMCQScore,
        maxCodingScore: maxCodingScore,
        maxTotalScore: maxMCQScore + maxCodingScore,
        evaluationStatus: "Not submitted",
        submittedAt: null,
        activityStatus: activityStatus,
        lastActive: sessionData.lastPing,
        hasSubmitted: false,
        hasStarted: true, // Flag to indicate student started the exam
      })
    }
  }

  let candidates = Array.from(studentMap.values())

  // Apply status filter
  if (statusFilter) {
    switch (statusFilter) {
      case "submitted":
        candidates = candidates.filter((c) => c.hasSubmitted)
        break
      case "active":
        candidates = candidates.filter(
          (c) => c.activityStatus === "active" && !c.hasSubmitted
        )
        break
      case "left":
        candidates = candidates.filter(
          (c) => c.activityStatus === "left" && !c.hasSubmitted
        )
        break
      case "inactive":
        candidates = candidates.filter(
          (c) =>
            c.activityStatus !== "active" &&
            c.activityStatus !== "left" &&
            !c.hasSubmitted
        )
        break
    }
  }

  // Sort candidates
  candidates.sort((a, b) => {
    if (a.activityStatus === "active" && b.activityStatus !== "active")
      return -1
    if (a.activityStatus !== "active" && b.activityStatus === "active") return 1

    if (a.hasSubmitted && !b.hasSubmitted) return -1
    if (!a.hasSubmitted && b.hasSubmitted) return 1

    if (a.hasSubmitted && b.hasSubmitted) {
      if (a.totalScore !== b.totalScore) {
        return b.totalScore - a.totalScore
      }
    }

    if (a.submittedAt && b.submittedAt) {
      return new Date(b.submittedAt) - new Date(a.submittedAt)
    }

    if (a.lastActive && b.lastActive) {
      return new Date(b.lastActive) - new Date(a.lastActive)
    }

    return 0
  })

  // Apply pagination
  const totalCandidates = candidates.length
  const totalPages = Math.ceil(totalCandidates / limit)
  const paginatedCandidates = candidates.slice(skip, skip + limit)

  res.json({
    success: true,
    candidates: paginatedCandidates,
    currentPage: page,
    totalPages: totalPages,
    totalCandidates: totalCandidates,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  })
}

// REMOVE: You can delete the separate examCandidatesData function
// since it's now integrated into the main examCandidates function

/**
 * Department Management for Admin/Teacher
 * GET /admin/manage-departments
 */
exports.getManageDepartments = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/admin/login")
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.redirect("/")
    }

    const allDepartments = [
      "cg",
      "ad",
      "is",
      "cs",
      "et",
      "ec",
      "ai",
      "cv",
      "ee",
    ]

    res.render("manage_departments", {
      pic: user.imageurl,
      logged_in: "true",
      allDepartments: allDepartments,
      managedDepartments: user.managedDepartments || [],
      user: user,
    })
  } catch (error) {
    console.error("Error loading department management page:", error)
    res.status(500).send("Server error")
  }
}

/**
 * Save Department Selection
 * POST /admin/manage-departments
 */
exports.postManageDepartments = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }

    // Get selected departments from request body
    let selectedDepartments = req.body.departments

    // Ensure it's an array
    if (typeof selectedDepartments === "string") {
      selectedDepartments = [selectedDepartments]
    } else if (!selectedDepartments) {
      selectedDepartments = []
    }

    // Validate departments
    const validDepartments = [
      "cg",
      "ad",
      "is",
      "cs",
      "et",
      "ec",
      "ai",
      "cv",
      "ee",
    ]
    const filteredDepartments = selectedDepartments.filter((dept) =>
      validDepartments.includes(dept)
    )

    // Update user's managed departments
    user.managedDepartments = filteredDepartments
    await user.save()

    res.json({
      success: true,
      message: "Departments updated successfully",
      managedDepartments: filteredDepartments,
    })
  } catch (error) {
    console.error("Error saving departments:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * Render attendance management page
 * GET /admin/exam/:examId/attendance
 */
exports.getAttendancePage = async (req, res) => {
  try {
    const { examId } = req.params

    // Fetch the exam details
    const exam = await Exam.findById(examId)

    if (!exam) {
      return res.status(404).render("error", {
        message: "Exam not found",
        error: { status: 404, stack: "" },
      })
    }

    res.render("exam_attendance", {
      exam: exam,
    })
  } catch (error) {
    console.error("Error loading attendance page:", error)
    res.status(500).render("error", {
      message: "Server error occurred while loading attendance page",
      error: {
        status: 500,
        stack: process.env.NODE_ENV === "development" ? error.stack : "",
      },
    })
  }
}

/**
 * Get absent students (eligible but didn't attempt exam)
 * GET /admin/exam/absent/:examId
 */
exports.getAbsentStudents = async (req, res) => {
  try {
    const { examId } = req.params

    // Fetch the exam details
    const exam = await Exam.findById(examId)

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      })
    }

    // Get all eligible students (same logic as getEligibleStudents)
    let allEligibleStudents = []

    // Get students by department/semester
    if (exam.departments && exam.departments.length > 0 && exam.semester) {
      const departmentStudents = await User.find({
        Department: { $in: exam.departments },
        Semester: exam.semester,
        usertype: "student",
      }).select("USN fname lname email Department Semester Rollno Year phone")

      allEligibleStudents = departmentStudents.map((student) => ({
        _id: student._id,
        USN: student.USN,
        name:
          `${student.fname || ""} ${student.lname || ""}`.trim() || "Unknown",
        Department: student.Department,
        Semester: student.Semester,
        Rollno: student.Rollno,
        email: student.email,
        phone: student.phone,
        source: "department",
      }))
    }

    // Get additional candidates from ExamCandidate
    const additionalCandidates = await ExamCandidate.find({
      exam: examId,
    })

    const additionalUSNs = additionalCandidates.map((c) => c.usn)
    const additionalStudentData = await User.find({
      USN: { $in: additionalUSNs },
      usertype: "student",
    }).select("USN fname lname email Department Semester Rollno Year phone")

    // Add additional students (Excel-uploaded)
    for (const candidate of additionalCandidates) {
      const isAlreadyIncluded = allEligibleStudents.some(
        (s) => s.USN === candidate.usn
      )

      if (!isAlreadyIncluded) {
        const userData = additionalStudentData.find(
          (u) => u.USN.toLowerCase() === candidate.usn.toLowerCase()
        )

        if (userData) {
          allEligibleStudents.push({
            _id: userData._id,
            USN: userData.USN,
            name:
              `${userData.fname || ""} ${userData.lname || ""}`.trim() ||
              "Unknown",
            Department: userData.Department,
            Semester: userData.Semester,
            Rollno: userData.Rollno,
            email: userData.email,
            phone: userData.phone,
            source: "excel",
          })
        }
      }
    }

    // Get students who SUBMITTED the exam (have Submission record)
    const submittedUSNs = new Set()
    const submissions = await Submission.find({ exam: examId })
      .populate("student", "USN")
      .select("student")

    submissions.forEach((sub) => {
      if (sub.student && sub.student.USN) {
        submittedUSNs.add(sub.student.USN)
      }
    })

    // Get students who STARTED the exam (have ActivityTracker or Submission)
    const startedUSNs = new Set()

    // Add all submitted students to started
    submissions.forEach((sub) => {
      if (sub.student && sub.student.USN) {
        startedUSNs.add(sub.student.USN)
      }
    })

    // Add students with activity sessions to started
    const activitySessions = await ActivityTracker.find({ examId: examId })
      .populate("userId", "USN")
      .select("userId")

    activitySessions.forEach((session) => {
      if (session.userId && session.userId.USN) {
        startedUSNs.add(session.userId.USN)
      }
    })

    // Filter: Absent = students who didn't start (no ActivityTracker, no Submission)
    const absentStudents = allEligibleStudents.filter(
      (student) => !startedUSNs.has(student.USN)
    )

    // Sort by USN
    absentStudents.sort((a, b) => (a.USN || "").localeCompare(b.USN || ""))

    res.json({
      success: true,
      absentStudents: absentStudents,
      totalAbsent: absentStudents.length,
      totalEligible: allEligibleStudents.length,
      totalSubmitted: submittedUSNs.size, // Changed: only students who submitted
      totalStarted: startedUSNs.size - submittedUSNs.size, // Started but didn't submit
      exam: {
        _id: exam._id,
        name: exam.name,
        departments: exam.departments,
        semester: exam.semester,
      },
    })
  } catch (error) {
    console.error("Error fetching absent students:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while fetching absent students",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Export submitted students data to CSV
 * GET /admin/exam/:examId/export-submitted
 */
exports.exportSubmittedToCSV = async (req, res) => {
  try {
    const { examId } = req.params

    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated")
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.status(403).send("Unauthorized")
    }

    // Fetch the exam
    const exam = await Exam.findById(examId).populate("mcqQuestions")
    if (!exam) {
      return res.status(404).send("Exam not found")
    }

    // Calculate max scores
    const hasMCQ =
      exam.questionType === "mcq" || exam.questionType === "mcq&coding"
    const hasCoding =
      exam.questionType === "coding" || exam.questionType === "mcq&coding"

    let maxMCQScore = 0
    if (hasMCQ && exam.mcqQuestions && exam.mcqQuestions.length > 0) {
      maxMCQScore = exam.mcqQuestions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0
      )
    }

    let maxCodingScore = 0
    if (hasCoding) {
      const codingEvaluation = await EvaluationResult.findOne({
        examId: exam._id,
      }).lean()
      maxCodingScore = codingEvaluation
        ? codingEvaluation.maxPossibleScore || 0
        : 0
    }

    // Get all submissions
    const submissions = await Submission.find({ exam: examId })
      .populate(
        "student",
        "USN email Department Semester Rollno fname lname phone"
      )
      .sort({ submittedAt: -1 })

    // Get evaluation results for coding exams
    let evaluationMap = new Map()
    if (hasCoding) {
      const studentIds = submissions
        .map((s) =>
          s.student && s.student._id ? s.student._id.toString() : null
        )
        .filter((id) => id !== null)
      const evaluations = await EvaluationResult.find({
        examId: examId,
        userId: { $in: studentIds },
      }).select("userId totalScore")

      evaluations.forEach((evaluation) => {
        evaluationMap.set(evaluation.userId.toString(), evaluation)
      })
    }

    // Prepare CSV data
    const csvRows = []

    // Header
    const headers = [
      "USN",
      "Name",
      "Email",
      "Department",
      "Semester",
      "Roll No",
      "Phone",
    ]
    if (hasMCQ && hasCoding) {
      headers.push(
        "MCQ Score",
        `MCQ Max (${maxMCQScore})`,
        "Coding Score",
        `Coding Max (${maxCodingScore})`,
        "Total Score",
        `Total Max (${maxMCQScore + maxCodingScore})`
      )
    } else if (hasMCQ) {
      headers.push("Score", `Max Score (${maxMCQScore})`)
    } else if (hasCoding) {
      headers.push("Score", `Max Score (${maxCodingScore})`)
    }
    headers.push("Submitted At")
    csvRows.push(headers.join(","))

    // Data rows
    submissions.forEach((submission) => {
      if (!submission.student) return // Skip orphaned submissions

      const student = submission.student
      const row = [
        student.USN || "",
        `"${student.fname || ""} ${student.lname || ""}"`.trim() || "N/A",
        student.email || "",
        student.Department || "",
        student.Semester || "",
        student.Rollno || "",
        student.phone || "",
      ]

      // Scores
      if (hasMCQ && hasCoding) {
        const mcqScore = submission.score || 0
        const evaluation = evaluationMap.get(student._id.toString())
        const codingScore = evaluation ? evaluation.totalScore : 0
        const totalScore = mcqScore + codingScore

        row.push(
          mcqScore,
          maxMCQScore,
          codingScore,
          maxCodingScore,
          totalScore,
          maxMCQScore + maxCodingScore
        )
      } else if (hasMCQ) {
        row.push(submission.score || 0, maxMCQScore)
      } else if (hasCoding) {
        const evaluation = evaluationMap.get(student._id.toString())
        const codingScore = evaluation ? evaluation.totalScore : 0
        row.push(codingScore, maxCodingScore)
      }

      // Submitted at
      row.push(
        submission.submittedAt
          ? new Date(submission.submittedAt).toLocaleString()
          : "N/A"
      )

      csvRows.push(row.join(","))
    })

    // Send CSV
    const csvContent = csvRows.join("\n")
    const filename = `submitted_students_${exam.name.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${Date.now()}.csv`

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (error) {
    console.error("Error exporting submitted students:", error)
    res.status(500).send("Server error occurred while exporting data")
  }
}

/**
 * Mark students as absent for an exam
 * POST /admin/exam/:examId/mark-absent
 */
exports.markStudentsAbsent = async (req, res) => {
  try {
    const { examId } = req.params
    const { usns } = req.body // Array of USNs to mark as absent

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      })
    }

    if (!Array.isArray(usns) || usns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of USNs to mark as absent",
      })
    }

    // Find the exam
    const exam = await Exam.findById(examId)
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      })
    }

    // Update ExamCandidate records to mark as absent
    const updateResult = await ExamCandidate.updateMany(
      {
        exam: examId,
        usn: { $in: usns },
        attendanceStatus: { $in: ["registered", "started"] }, // Only mark if not already submitted
      },
      {
        $set: {
          attendanceStatus: "absent",
          markedAbsentAt: new Date(),
          markedAbsentBy: user._id,
        },
      }
    )

    res.json({
      success: true,
      message: `Successfully marked ${updateResult.modifiedCount} student(s) as absent`,
      modifiedCount: updateResult.modifiedCount,
    })
  } catch (error) {
    console.error("Error marking students absent:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while marking students absent",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Edit/Update student details
 * POST /admin/students/:studentId/edit
 */
exports.editStudent = async (req, res) => {
  try {
    const { studentId } = req.params
    const { fname, lname, USN, email, Department, Semester, phone, Rollno } =
      req.body

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Only admins and teachers can edit students.",
      })
    }

    // Find the student
    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      })
    }

    // Update student fields
    student.fname = fname
    student.lname = lname
    student.USN = USN
    student.email = email
    student.Department = Department

    // Don't update the stored Semester field - keep it as original enrollment semester
    // Instead, set currentSemesterOverride to change what's displayed
    student.currentSemesterOverride = parseInt(Semester)

    if (phone) student.phone = phone
    if (Rollno) student.Rollno = Rollno

    // Save updated student
    await student.save()

    res.json({
      success: true,
      message: "Student updated successfully",
      student: {
        _id: student._id,
        fname: student.fname,
        lname: student.lname,
        USN: student.USN,
        email: student.email,
        Department: student.Department,
        Semester: student.Semester,
      },
    })
  } catch (error) {
    console.error("Error updating student:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while updating student",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Delete a single student
 * DELETE /admin/students/:studentId/delete
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Only admins can delete students.",
      })
    }

    // Find the student
    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      })
    }

    // Check if student has any submissions
    const hasSubmissions = await Submission.countDocuments({
      student: studentId,
    })

    if (hasSubmissions > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete student with existing exam submissions. This would create orphaned data.",
        submissionCount: hasSubmissions,
      })
    }

    // Delete the student
    await User.findByIdAndDelete(studentId)

    // Clean up related data
    await ActivityTracker.deleteMany({ userId: studentId })
    await PartialSubmission.deleteMany({ student: studentId })

    console.log(`Admin ${user.email} deleted student ${student.USN}`)

    res.json({
      success: true,
      message: "Student deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting student:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while deleting student",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Bulk delete students
 * POST /admin/students/bulk-delete
 */
exports.bulkDeleteStudents = async (req, res) => {
  try {
    const { studentIds } = req.body

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Only admins can delete students.",
      })
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No student IDs provided",
      })
    }

    // Check for students with submissions
    const studentsWithSubmissions = await Submission.aggregate([
      {
        $match: {
          student: { $in: studentIds.map((id) => mongoose.Types.ObjectId(id)) },
        },
      },
      { $group: { _id: "$student", count: { $sum: 1 } } },
    ])

    if (studentsWithSubmissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${studentsWithSubmissions.length} student(s) with existing exam submissions. This would create orphaned data.`,
        studentsWithSubmissions: studentsWithSubmissions.length,
      })
    }

    // Delete students
    const deleteResult = await User.deleteMany({
      _id: { $in: studentIds },
      usertype: "student",
    })

    // Clean up related data
    await ActivityTracker.deleteMany({ userId: { $in: studentIds } })
    await PartialSubmission.deleteMany({ student: { $in: studentIds } })

    console.log(
      `Admin ${user.email} bulk deleted ${deleteResult.deletedCount} students`
    )

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} student(s)`,
      deletedCount: deleteResult.deletedCount,
    })
  } catch (error) {
    console.error("Error bulk deleting students:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while deleting students",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Upgrade semester for all students in a specific semester
 * POST /admin/upgrade-semester
 */
exports.upgradeSemester = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findById(req.user._id)

    if (user.usertype !== "admin" && user.usertype !== "teacher") {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized. Only admins and teachers can upgrade semesters.",
      })
    }

    const { fromSemester, department } = req.body

    // Validate input
    if (!fromSemester || fromSemester < 1 || fromSemester > 8) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester. Please provide a semester between 1 and 8.",
      })
    }

    // Cannot upgrade from semester 8
    if (fromSemester >= 8) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot upgrade from semester 8. Students are already in final semester.",
      })
    }

    // Calculate new semester
    const newSemester = parseInt(fromSemester) + 1

    // Build base query filter (without semester, since CurrentSemester is virtual)
    let filter = {
      usertype: "student",
    }

    // Add department filter if provided (case-insensitive)
    if (department && department !== "all") {
      filter.Department = new RegExp(`^${department}$`, "i")
    }

    console.log("Searching for students with filter:", JSON.stringify(filter))

    // Fetch all students matching base filter
    let allStudents = await User.find(filter)
    console.log(
      `Total students in database matching base filter: ${allStudents.length}`
    )

    // Filter by CurrentSemester in-memory (virtual field)
    const studentsToUpdate = allStudents.filter((student) => {
      return student.CurrentSemester == fromSemester
    })

    console.log(
      `Found ${studentsToUpdate.length} students in CurrentSemester ${fromSemester}`
    )
    console.log(
      "Sample students:",
      studentsToUpdate.slice(0, 5).map((s) => ({
        USN: s.USN,
        CurrentSemester: s.CurrentSemester,
        StoredSemester: s.Semester,
        Department: s.Department,
      }))
    )

    if (studentsToUpdate.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No students found in current semester ${fromSemester}${
          department && department !== "all"
            ? ` for department ${department.toUpperCase()}`
            : ""
        }. Check console for debug info.`,
        debug: {
          totalStudents: allStudents.length,
          searchedSemester: fromSemester,
          searchedDepartment: department,
          sampleData: allStudents.slice(0, 3).map((s) => ({
            CurrentSemester: s.CurrentSemester,
            StoredSemester: s.Semester,
            Department: s.Department,
            USN: s.USN,
          })),
        },
      })
    }

    // Update students individually to set currentSemesterOverride
    const studentIds = studentsToUpdate.map((s) => s._id)
    const updateResult = await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { currentSemesterOverride: newSemester } }
    )

    console.log(
      `Upgraded ${
        updateResult.modifiedCount
      } students from semester ${fromSemester} to ${newSemester}${
        department && department !== "all"
          ? ` in department ${department.toUpperCase()}`
          : ""
      }`
    )

    res.json({
      success: true,
      message: `Successfully upgraded ${
        updateResult.modifiedCount
      } student(s) from semester ${fromSemester} to semester ${newSemester}${
        department && department !== "all"
          ? ` in department ${department.toUpperCase()}`
          : ""
      }.`,
      data: {
        fromSemester: fromSemester,
        toSemester: newSemester,
        department: department || "all",
        studentsUpdated: updateResult.modifiedCount,
        studentDetails: studentsToUpdate.map((s) => ({
          USN: s.USN,
          oldSemester: s.Semester,
          Department: s.Department,
        })),
      },
    })
  } catch (error) {
    console.error("Error upgrading semester:", error)
    res.status(500).json({
      success: false,
      message: "Server error occurred while upgrading semester",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get partial submissions for an exam
exports.getPartialSubmissions = async (req, res) => {
  try {
    if (
      !req.isAuthenticated() ||
      !["admin", "teacher"].includes(req.user.usertype)
    ) {
      return res.status(403).json({ error: "Unauthorized access" })
    }

    const examId = req.params.examId

    // Get all partial submissions for this exam
    const partialSubmissions = await PartialSubmission.find({
      exam: examId,
      isPartial: true,
    })
      .populate("student", "fname lname email USN")
      .populate("exam", "name")
      .sort({ lastSavedAt: -1 })

    // Format the data for response
    const formattedSubmissions = partialSubmissions.map((submission) => {
      const answeredCount =
        (submission.mcqAnswers?.length || 0) +
        (submission.codingAnswers?.length || 0)

      return {
        _id: submission._id,
        student: {
          _id: submission.student._id,
          name: `${submission.student.fname} ${submission.student.lname}`,
          email: submission.student.email,
          usn: submission.student.USN,
        },
        exam: submission.exam.name,
        answeredQuestions: answeredCount,
        mcqAnswers: submission.mcqAnswers,
        codingAnswers: submission.codingAnswers,
        timeRemaining: submission.timeRemaining,
        lastSavedAt: submission.lastSavedAt,
        examStartedAt: submission.examStartedAt,
      }
    })

    res.status(200).json({
      success: true,
      count: formattedSubmissions.length,
      data: formattedSubmissions,
    })
  } catch (error) {
    console.error("Error fetching partial submissions:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch partial submissions",
    })
  }
}

// View detailed partial submission
exports.viewPartialSubmission = async (req, res) => {
  try {
    if (
      !req.isAuthenticated() ||
      !["admin", "teacher"].includes(req.user.usertype)
    ) {
      return res.status(403).send("Unauthorized access")
    }

    const submissionId = req.params.submissionId

    const partialSubmission = await PartialSubmission.findById(submissionId)
      .populate("student", "fname lname email USN Department")
      .populate({
        path: "exam",
        populate: {
          path: "mcqQuestions",
        },
      })

    if (!partialSubmission) {
      return res.status(404).send("Partial submission not found")
    }

    // Calculate score for answered questions
    let score = 0
    let detailedAnswers = []

    if (partialSubmission.exam.mcqQuestions) {
      partialSubmission.exam.mcqQuestions.forEach((question) => {
        const studentAnswer = partialSubmission.mcqAnswers.find(
          (ans) => ans.questionId.toString() === question._id.toString()
        )

        const isCorrect =
          studentAnswer &&
          studentAnswer.selectedOption === question.correctAnswer

        if (isCorrect) {
          score += question.marks || 1
        }

        detailedAnswers.push({
          question: question.question || question.questionTitle,
          options: question.options,
          correctAnswer: question.correctAnswer,
          studentAnswer: studentAnswer
            ? studentAnswer.selectedOption
            : "Not Answered",
          isCorrect: isCorrect,
          marks: question.marks || 1,
        })
      })
    }

    res.render("viewPartialSubmission", {
      submission: partialSubmission,
      detailedAnswers: detailedAnswers,
      currentScore: score,
      totalQuestions: partialSubmission.exam.mcqQuestions?.length || 0,
      answeredQuestions: partialSubmission.mcqAnswers?.length || 0,
      timeRemaining: partialSubmission.timeRemaining,
      user: req.user,
    })
  } catch (error) {
    console.error("Error viewing partial submission:", error)
    res.status(500).send("Server error")
  }
}
